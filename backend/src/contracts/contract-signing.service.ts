import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { render } from "@react-email/render";
import { ContractSentEmail } from "@/email";
import { CONTRACT_STATUSES, CONTRACT_TEMPLATES, type ContractContent, type ContractTemplateId } from "@/shared";
import { PrismaService } from "../prisma/prisma.service";
import { MailService } from "../mail/mail.service";
import { ActivityService } from "../activity/activity.service";
import { NotificationsService } from "../notifications/notifications.service";
import { generateToken, hashToken, plainText } from "../common";
import { proposalTotalCents } from "../proposals/proposals.totals";
import { ContractPdfService } from "./contract-pdf.service";
import { buildDefaultContractContent } from "./templates/contract-templates";
import { CreateContractFromProposalDto, SendContractLinkDto, SignContractDto } from "./contract-signing.dto";

/** Statuses in which the client can still read and sign. */
const SIGNABLE: string[] = [CONTRACT_STATUSES.SENT, CONTRACT_STATUSES.VIEWED];
/** Statuses the freelancer can (re)send from. Draft goes out as a new version; sent/viewed just get a new link. */
const SENDABLE: string[] = [CONTRACT_STATUSES.DRAFT, CONTRACT_STATUSES.GENERATED, CONTRACT_STATUSES.SENT, CONTRACT_STATUSES.VIEWED];

function lines(text: string | null | undefined): string[] {
  return (text ?? "")
    .split("\n")
    .map((l) => l.replace(/^[-*•]\s*/, "").trim())
    .filter(Boolean);
}

@Injectable()
export class ContractSigningService {
  private readonly logger = new Logger(ContractSigningService.name);

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private mail: MailService,
    private activity: ActivityService,
    private notifications: NotificationsService,
    private pdf: ContractPdfService,
  ) {}

  // ----- staff -----

  /** Everything agreed in the proposal flows into the contract; nothing is typed twice. */
  async createFromProposal(proposalId: string, dto: CreateContractFromProposalDto, orgId: string, userId: string) {
    const proposal = await this.prisma.proposal.findFirst({
      where: { id: proposalId, organizationId: orgId },
      include: { items: { orderBy: { order: "asc" } }, client: true },
    });
    if (!proposal) throw new NotFoundException("Proposal not found");
    if (proposal.status !== "accepted") {
      throw new BadRequestException("Only an accepted proposal can become a contract");
    }

    // One live contract per proposal: a second click returns the first.
    const existing = await this.prisma.contract.findFirst({
      where: { proposalId, organizationId: orgId, status: { not: CONTRACT_STATUSES.VOID } },
    });
    if (existing) return existing;

    const org = await this.prisma.organization.findUnique({ where: { id: orgId }, select: { name: true } });
    const templateId = (dto.template ?? CONTRACT_TEMPLATES[0].id) as ContractTemplateId;
    const total = proposalTotalCents(proposal.items);
    const picked = proposal.items.filter((i) => !i.optional || i.selected).map((i) => i.description);
    const deliverables = lines(proposal.deliverables);

    const content = buildDefaultContractContent(
      templateId,
      { name: org?.name ?? "Service Provider" },
      { name: proposal.client.name, email: proposal.client.email ?? "", company: proposal.client.company, address: proposal.client.location },
      { name: proposal.title, description: proposal.scope, tasks: (deliverables.length ? deliverables : picked).map((title) => ({ title })) },
    );

    content.scope.projectDescription = proposal.scope?.trim() || content.scope.projectDescription;
    content.scope.deliverables = deliverables.length ? deliverables : picked.length ? picked : content.scope.deliverables;
    if (proposal.revisionLimit !== null) content.scope.revisionsCount = proposal.revisionLimit;
    if (proposal.timeline) content.agreement.timelineNote = proposal.timeline;

    // Payment: keep the template's deposit-and-final shape, scaled to the agreed total.
    content.payment.currency = proposal.currency;
    content.payment.totalAmountCents = total;
    const schedule = content.payment.schedule ?? [];
    if (schedule.length === 2) {
      const deposit = Math.round(total * 0.25);
      content.payment.depositCents = deposit;
      schedule[0] = { ...schedule[0], amountCents: deposit };
      schedule[1] = { ...schedule[1], amountCents: total - deposit };
    }

    if (proposal.revisionLimit !== null) {
      const n = proposal.revisionLimit;
      content.terms.revisionsEnabled = true;
      content.terms.revisionsText =
        `The project includes up to ${n} ${n === 1 ? "round" : "rounds"} of consolidated revisions per stage. ` +
        `Additional rounds, or changes that go beyond the scope above, are quoted separately and start only after the Client approves the quote in writing.`;
    }
    if (proposal.paymentTerms?.trim()) {
      content.terms.additionalTermsEnabled = true;
      content.terms.additionalTermsText = `Payment terms agreed in the accepted proposal:\n${proposal.paymentTerms.trim()}`;
    }

    const contract = await this.prisma.contract.create({
      data: {
        organizationId: orgId,
        clientRecordId: proposal.clientId,
        proposalId,
        title: dto.title ?? content.agreement.title,
        template: templateId,
        status: CONTRACT_STATUSES.DRAFT,
        content: content as unknown as object,
        createdById: userId,
      },
    });

    await this.activity.createForClient({
      clientId: proposal.clientId,
      organizationId: orgId,
      actorId: userId,
      kind: "system",
      action: "contract_drafted",
      summary: `Contract drafted from proposal: ${proposal.title}`,
    });
    return contract;
  }

  async listForClientRecord(clientRecordId: string, orgId: string) {
    return this.prisma.contract.findMany({
      where: { clientRecordId, organizationId: orgId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        status: true,
        version: true,
        proposalId: true,
        projectId: true,
        sentAt: true,
        signedAt: true,
        signedByName: true,
        createdAt: true,
      },
    });
  }

  /** Freezes the current version, issues a fresh secure link and marks the contract as sent. */
  async sendForSigning(id: string, dto: SendContractLinkDto, orgId: string, userId: string) {
    const contract = await this.prisma.contract.findFirst({
      where: { id, organizationId: orgId },
      include: { clientRecord: { select: { id: true, name: true, email: true } } },
    });
    if (!contract) throw new NotFoundException("Contract not found");
    if (!contract.clientRecord) {
      throw new BadRequestException("This contract is not attached to a client record. Use the project contract flow");
    }
    if (!SENDABLE.includes(contract.status)) {
      throw new BadRequestException(`A ${contract.status} contract cannot be sent`);
    }
    const wantsEmail = dto.email ?? false;
    if (wantsEmail && !contract.clientRecord.email) {
      throw new BadRequestException("This client has no email address. Copy the link instead");
    }

    const token = generateToken();
    await this.prisma.$transaction([
      this.prisma.contractVersion.upsert({
        where: { contractId_version: { contractId: id, version: contract.version } },
        create: { contractId: id, version: contract.version, content: contract.content as object, createdById: userId },
        // Resending the same version must not rewrite what the client may already have seen.
        update: {},
      }),
      this.prisma.contract.update({
        where: { id },
        data: { status: CONTRACT_STATUSES.SENT, tokenHash: hashToken(token), sentAt: new Date(), viewedAt: null },
      }),
    ]);

    const link = `${this.config.get("WEB_URL", "http://localhost:3000")}/contract/${token}`;
    let emailed = false;
    if (wantsEmail && contract.clientRecord.email) {
      emailed = await this.emailContract(orgId, contract.clientRecord.name, contract.clientRecord.email, contract.title, link);
    }

    await this.activity.createForClient({
      clientId: contract.clientRecord.id,
      organizationId: orgId,
      actorId: userId,
      kind: "system",
      action: "contract_sent",
      summary: `Contract sent for signing: ${contract.title}${emailed ? " (emailed)" : ""}`,
    });
    return { link, emailed };
  }

  private async emailContract(orgId: string, clientName: string, to: string, title: string, link: string): Promise<boolean> {
    try {
      const org = await this.prisma.organization.findUnique({ where: { id: orgId }, select: { name: true } });
      const orgName = org?.name ?? "Your freelancer";
      const html = await render(
        ContractSentEmail({ clientName, organizationName: orgName, contractTitle: title, contractUrl: link }),
      );
      const result = await this.mail.send(to, `${orgName} sent you a contract to sign`, html, orgId);
      return result.sent;
    } catch (err) {
      this.logger.warn(`Contract email failed: ${err instanceof Error ? err.message : String(err)}`);
      return false;
    }
  }

  // ----- public, token scoped -----

  private async findByToken(token: string) {
    const contract = await this.prisma.contract.findUnique({
      where: { tokenHash: hashToken(token) },
      include: { clientRecord: { select: { id: true, name: true } } },
    });
    if (!contract || !contract.clientRecord || contract.status === CONTRACT_STATUSES.VOID) {
      throw new NotFoundException("Contract not found");
    }
    return { ...contract, clientRecord: contract.clientRecord };
  }

  /** The content the client sees is the frozen version that was sent, never a later draft. */
  private async sentContent(contract: { id: string; version: number; content: unknown }): Promise<ContractContent> {
    const snapshot = await this.prisma.contractVersion.findUnique({
      where: { contractId_version: { contractId: contract.id, version: contract.version } },
    });
    return (snapshot?.content ?? contract.content) as unknown as ContractContent;
  }

  async getPublic(token: string) {
    let contract = await this.findByToken(token);

    if (contract.status === CONTRACT_STATUSES.SENT) {
      const flipped = await this.prisma.contract.updateMany({
        where: { id: contract.id, status: CONTRACT_STATUSES.SENT },
        data: { status: CONTRACT_STATUSES.VIEWED, viewedAt: new Date() },
      });
      if (flipped.count > 0) {
        contract = { ...contract, status: CONTRACT_STATUSES.VIEWED };
        await this.activity.createForClient({
          clientId: contract.clientRecord.id,
          organizationId: contract.organizationId,
          actorId: "public",
          kind: "system",
          action: "contract_viewed",
          summary: `${contract.clientRecord.name} opened the contract: ${contract.title}`,
        });
        this.notifications.notifyAdmins(
          contract.organizationId,
          "contract_viewed",
          `${contract.clientRecord.name} opened your contract`,
          contract.title,
          `/dashboard/leads/${contract.clientRecord.id}`,
        );
      }
    }

    const [org, branding, content] = await Promise.all([
      this.prisma.organization.findUnique({ where: { id: contract.organizationId }, select: { name: true } }),
      this.prisma.branding.findUnique({
        where: { organizationId: contract.organizationId },
        select: { primaryColor: true, logoUrl: true },
      }),
      this.sentContent(contract),
    ]);

    return {
      organizationName: org?.name ?? "",
      primaryColor: branding?.primaryColor ?? null,
      logoUrl: branding?.logoUrl ?? null,
      clientName: contract.clientRecord.name,
      title: contract.title,
      version: contract.version,
      status: contract.status,
      signedAt: contract.signedAt,
      signedByName: contract.signedByName,
      content,
    };
  }

  async getPublicPdf(token: string) {
    const contract = await this.findByToken(token);
    const content = await this.sentContent(contract);
    return this.pdf.render(
      { title: contract.title, version: contract.version, status: contract.status, projectName: contract.title, content },
      contract.organizationId,
    );
  }

  /**
   * Records the signature (typed name, consent, time, IP, browser) and turns the lead into a client.
   * The status condition makes a double click or two tabs resolve to a single signature.
   */
  async sign(token: string, dto: SignContractDto, meta: { ip?: string; userAgent?: string }) {
    const contract = await this.findByToken(token);
    if (!SIGNABLE.includes(contract.status)) {
      throw new ConflictException(
        contract.status === CONTRACT_STATUSES.SIGNED ? "This contract has already been signed" : "This contract cannot be signed",
      );
    }
    if (dto.consent !== true) throw new BadRequestException("Tick the box to confirm you agree to be bound by this contract");
    const name = plainText(dto.name, 200);
    if (!name) throw new BadRequestException("Type your full name to sign");

    const claimed = await this.prisma.contract.updateMany({
      where: { id: contract.id, status: { in: SIGNABLE } },
      data: {
        status: CONTRACT_STATUSES.SIGNED,
        signedAt: new Date(),
        signedByName: name,
        signedIp: meta.ip?.slice(0, 64) ?? null,
        signedUserAgent: meta.userAgent?.slice(0, 300) ?? null,
      },
    });
    if (claimed.count === 0) throw new ConflictException("This contract has already been signed");

    const clientId = contract.clientRecord.id;
    // Lead → Client. History stays on the same record; only the stage changes.
    const converted = await this.prisma.client.updateMany({
      where: { id: clientId, organizationId: contract.organizationId, stage: "lead" },
      data: { stage: "active", leadStatus: null, lostReason: null },
    });

    await this.activity.createForClient({
      clientId,
      organizationId: contract.organizationId,
      actorId: "public",
      kind: "system",
      action: "contract_signed",
      summary: `${name} signed ${contract.title}`,
    });
    if (converted.count > 0) {
      await this.activity.createForClient({
        clientId,
        organizationId: contract.organizationId,
        actorId: "system",
        kind: "system",
        action: "converted_to_client",
        summary: "Lead converted to an active client",
      });
    }
    this.notifications.notifyAdmins(
      contract.organizationId,
      "contract_signed",
      `${contract.clientRecord.name} signed the contract`,
      `${contract.title}. Next step: create the project.`,
      `/dashboard/leads/${clientId}`,
    );
    return { ok: true };
  }
}
