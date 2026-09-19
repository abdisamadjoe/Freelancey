import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { ContractPdfService } from "./contract-pdf.service";
import { CreateContractDto, UpdateContractDto, DuplicateContractDto } from "./contracts.dto";
import { buildDefaultContractContent } from "./templates/contract-templates";
import { ContractContent, CONTRACT_STATUSES } from "@/shared";
import { paginationArgs, paginatedResponse } from "../common";
import { NeonAuthUsersRepository } from "../auth/neon-auth-users.repository";

@Injectable()
export class ContractsService {
  constructor(
    private prisma: PrismaService,
    private contractPdfService: ContractPdfService,
    private neonAuthUsers: NeonAuthUsersRepository,
  ) {}

  async create(projectId: string, dto: CreateContractDto, organizationId: string, userId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, organizationId },
      include: {
        tasks: { select: { title: true, description: true } },
        clients: true,
      },
    });
    if (!project) throw new NotFoundException("Project not found");

    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { name: true },
    });

    let clientInfo = {
      name: "Client",
      email: "",
      company: "",
      address: "",
    };

    const targetClientId = dto.clientId || (project.clients[0] ? project.clients[0].userId : undefined);
    if (targetClientId) {
      const user = await this.neonAuthUsers.findUnique(targetClientId);
      const profile = await this.prisma.clientProfile.findUnique({
        where: { userId_organizationId: { userId: targetClientId, organizationId } },
      });

      clientInfo = {
        name: user?.name || "Client",
        email: user?.email || "",
        company: profile?.company || "",
        address: profile?.address || "",
      };
    }

    const defaultContent = buildDefaultContractContent(
      dto.template,
      { name: org?.name || "Organization" },
      clientInfo,
      project,
    );

    const mergedContent = dto.content
      ? ({ ...defaultContent, ...dto.content } as unknown as ContractContent)
      : defaultContent;

    const contract = await this.prisma.contract.create({
      data: {
        projectId,
        organizationId,
        clientId: targetClientId || null,
        title: dto.title,
        template: dto.template,
        status: CONTRACT_STATUSES.DRAFT,
        content: mergedContent as any,
        createdById: userId,
      },
    });

    await this.prisma.activityLog.create({
      data: {
        type: "contract_response",
        action: "created",
        actorId: userId,
        targetId: contract.id,
        targetTitle: contract.title,
        detail: `Created contract version ${contract.version} using ${dto.template} template`,
        projectId,
        organizationId,
      },
    });

    return contract;
  }

  async findByProject(projectId: string, organizationId: string, page = 1, limit = 20) {
    const where = { projectId, organizationId };
    const [data, total] = await Promise.all([
      this.prisma.contract.findMany({
        where,
        include: { versions: { orderBy: { version: "desc" } } },
        orderBy: { createdAt: "desc" },
        ...paginationArgs(page, limit),
      }),
      this.prisma.contract.count({ where }),
    ]);
    return paginatedResponse(data, total, page, limit);
  }

  async findOne(id: string, organizationId: string) {
    const contract = await this.prisma.contract.findFirst({
      where: { id, organizationId },
      include: {
        project: { select: { id: true, name: true } },
        versions: { orderBy: { version: "desc" } },
      },
    });
    if (!contract) throw new NotFoundException("Contract not found");
    return contract;
  }

  async update(id: string, dto: UpdateContractDto, organizationId: string) {
    const contract = await this.prisma.contract.findFirst({
      where: { id, organizationId },
    });
    if (!contract) throw new NotFoundException("Contract not found");

    if (contract.status === CONTRACT_STATUSES.VOID) {
      throw new BadRequestException("Cannot edit a void contract");
    }

    const data: Record<string, unknown> = {};
    // Editing a contract that already went out starts a new draft version; the
    // sent version stays available from its snapshot in ContractVersion.
    if (dto.content !== undefined && contract.status !== CONTRACT_STATUSES.DRAFT) {
      data.version = contract.version + 1;
      data.status = CONTRACT_STATUSES.DRAFT;
    }
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.template !== undefined) data.template = dto.template;
    if (dto.clientId !== undefined) data.clientId = dto.clientId;
    if (dto.content !== undefined) data.content = dto.content as any;
    if (dto.status !== undefined && data.status === undefined) data.status = dto.status;

    return this.prisma.contract.update({
      where: { id },
      data,
    });
  }

  /** Renders the PDF on the fly from stored contract data; nothing is persisted. */
  async renderPdf(id: string, organizationId: string, versionNumber?: number) {
    const contract = await this.prisma.contract.findFirst({
      where: { id, organizationId },
      include: { project: { select: { name: true } } },
    });
    if (!contract) throw new NotFoundException("Contract not found");

    let content = contract.content;
    let version = contract.version;
    if (versionNumber && versionNumber !== contract.version) {
      const snapshot = await this.prisma.contractVersion.findUnique({
        where: { contractId_version: { contractId: id, version: versionNumber } },
      });
      if (!snapshot) throw new NotFoundException(`Version ${versionNumber} not found`);
      content = snapshot.content;
      version = snapshot.version;
    }

    return this.contractPdfService.render(
      {
        title: contract.title,
        version,
        status: contract.status,
        projectName: contract.project.name,
        content: content as unknown as ContractContent,
      },
      organizationId,
    );
  }

  async send(id: string, organizationId: string, userId: string) {
    const contract = await this.prisma.contract.findFirst({
      where: { id, organizationId },
    });
    if (!contract) throw new NotFoundException("Contract not found");

    // "generated" is a legacy status from when PDFs were stored; treat it as a draft.
    const sendable: string[] = [CONTRACT_STATUSES.DRAFT, CONTRACT_STATUSES.GENERATED];
    if (!sendable.includes(contract.status)) {
      throw new BadRequestException(`A ${contract.status} contract cannot be sent`);
    }

    // Freeze exactly what the client will see, so this version's PDF can be re-rendered later.
    const [, updated] = await this.prisma.$transaction([
      this.prisma.contractVersion.upsert({
        where: { contractId_version: { contractId: id, version: contract.version } },
        create: {
          contractId: id,
          version: contract.version,
          content: contract.content as any,
          createdById: userId,
        },
        update: { content: contract.content as any, createdById: userId },
      }),
      this.prisma.contract.update({
        where: { id },
        data: { status: CONTRACT_STATUSES.SENT },
      }),
    ]);

    await this.prisma.activityLog.create({
      data: {
        type: "contract_response",
        action: "sent",
        actorId: userId,
        targetId: id,
        targetTitle: contract.title,
        detail: `Contract version ${contract.version} sent to client`,
        projectId: contract.projectId,
        organizationId,
      },
    });

    return updated;
  }

  async voidContract(id: string, organizationId: string, userId: string) {
    const contract = await this.prisma.contract.findFirst({
      where: { id, organizationId },
    });
    if (!contract) throw new NotFoundException("Contract not found");

    const updated = await this.prisma.contract.update({
      where: { id },
      data: { status: CONTRACT_STATUSES.VOID },
    });

    await this.prisma.activityLog.create({
      data: {
        type: "contract_response",
        action: "voided",
        actorId: userId,
        targetId: id,
        targetTitle: contract.title,
        detail: `Contract voided`,
        projectId: contract.projectId,
        organizationId,
      },
    });

    return updated;
  }

  async duplicate(id: string, dto: DuplicateContractDto, organizationId: string, userId: string) {
    const source = await this.prisma.contract.findFirst({
      where: { id, organizationId },
    });
    if (!source) throw new NotFoundException("Contract not found");

    const title = dto.title || `${source.title} (Copy)`;

    return this.prisma.contract.create({
      data: {
        projectId: source.projectId,
        organizationId,
        clientId: source.clientId,
        title,
        template: source.template,
        status: CONTRACT_STATUSES.DRAFT,
        content: source.content as any,
        version: 1,
        createdById: userId,
      },
    });
  }

  async remove(id: string, organizationId: string) {
    const contract = await this.prisma.contract.findFirst({
      where: { id, organizationId },
    });
    if (!contract) throw new NotFoundException("Contract not found");

    await this.prisma.contract.delete({ where: { id } });
  }

  // --- Client Portal Methods ---

  async findByClient(projectId: string, clientUserId: string, organizationId: string, page = 1, limit = 20) {
    // Verify client is assigned to this project
    const assignment = await this.prisma.projectClient.findFirst({
      where: { projectId, userId: clientUserId },
    });
    if (!assignment) {
      throw new ForbiddenException("You are not assigned to this project");
    }

    const where = { projectId, organizationId, status: { not: CONTRACT_STATUSES.DRAFT } };
    const [data, total] = await Promise.all([
      this.prisma.contract.findMany({
        where,
        orderBy: { createdAt: "desc" },
        ...paginationArgs(page, limit),
      }),
      this.prisma.contract.count({ where }),
    ]);
    return paginatedResponse(data, total, page, limit);
  }

  async findOneByClient(id: string, clientUserId: string, organizationId: string) {
    const contract = await this.prisma.contract.findFirst({
      where: { id, organizationId },
    });
    if (!contract) throw new NotFoundException("Contract not found");

    const assignment = await this.prisma.projectClient.findFirst({
      where: { projectId: contract.projectId, userId: clientUserId },
    });
    if (!assignment) {
      throw new ForbiddenException("You are not assigned to this project");
    }

    return contract;
  }

  async trackViewByClient(id: string, clientUserId: string, organizationId: string) {
    const contract = await this.findOneByClient(id, clientUserId, organizationId);

    if (contract.status === CONTRACT_STATUSES.SENT) {
      await this.prisma.contract.update({
        where: { id },
        data: { status: CONTRACT_STATUSES.VIEWED },
      });

      await this.prisma.activityLog.create({
        data: {
          type: "contract_response",
          action: "viewed",
          actorId: clientUserId,
          targetId: id,
          targetTitle: contract.title,
          detail: `Client viewed contract`,
          projectId: contract.projectId,
          organizationId,
        },
      });
    }
  }

  async renderClientPdf(id: string, clientUserId: string, organizationId: string) {
    const contract = await this.findOneByClient(id, clientUserId, organizationId);
    if (contract.status === CONTRACT_STATUSES.DRAFT || contract.status === CONTRACT_STATUSES.GENERATED) {
      throw new NotFoundException("Contract not found");
    }
    return this.renderPdf(id, organizationId);
  }
}
