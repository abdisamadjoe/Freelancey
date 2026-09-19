import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Response } from "express";
import { ContractsService } from "./contracts.service";
import { CreateContractDto, UpdateContractDto, DuplicateContractDto } from "./contracts.dto";
import {
  AuthGuard,
  RolesGuard,
  Roles,
  CurrentUser,
  CurrentOrg,
  PaginationQueryDto,
  sanitizeFilename,
} from "../common";

@Controller()
@UseGuards(AuthGuard, RolesGuard)
export class ContractsController {
  constructor(private contractsService: ContractsService) {}

  @Post("projects/:projectId/contracts")
  @Roles("owner", "admin")
  create(
    @Param("projectId") projectId: string,
    @Body() dto: CreateContractDto,
    @CurrentOrg("id") orgId: string,
    @CurrentUser("id") userId: string,
  ) {
    return this.contractsService.create(projectId, dto, orgId, userId);
  }

  @Get("projects/:projectId/contracts")
  @Roles("owner", "admin")
  findByProject(
    @Param("projectId") projectId: string,
    @CurrentOrg("id") orgId: string,
    @Query() pagination: PaginationQueryDto,
  ) {
    return this.contractsService.findByProject(
      projectId,
      orgId,
      pagination.page,
      pagination.limit,
    );
  }

  @Get("contracts/:id")
  @Roles("owner", "admin")
  findOne(
    @Param("id") id: string,
    @CurrentOrg("id") orgId: string,
  ) {
    return this.contractsService.findOne(id, orgId);
  }

  @Patch("contracts/:id")
  @Roles("owner", "admin")
  update(
    @Param("id") id: string,
    @Body() dto: UpdateContractDto,
    @CurrentOrg("id") orgId: string,
  ) {
    return this.contractsService.update(id, dto, orgId);
  }

  @Delete("contracts/:id")
  @Roles("owner", "admin")
  remove(
    @Param("id") id: string,
    @CurrentOrg("id") orgId: string,
  ) {
    return this.contractsService.remove(id, orgId);
  }

  @Get("contracts/:id/pdf")
  @Roles("owner", "admin")
  async getPdf(
    @Param("id") id: string,
    @CurrentOrg("id") orgId: string,
    @Res() res: Response,
    @Query("version") version?: string,
  ) {
    const parsed = version ? parseInt(version, 10) : undefined;
    const pdf = await this.contractsService.renderPdf(id, orgId, Number.isNaN(parsed) ? undefined : parsed);
    sendPdf(res, pdf);
  }

  @Post("contracts/:id/send")
  @Roles("owner", "admin")
  send(
    @Param("id") id: string,
    @CurrentOrg("id") orgId: string,
    @CurrentUser("id") userId: string,
  ) {
    return this.contractsService.send(id, orgId, userId);
  }

  @Post("contracts/:id/void")
  @Roles("owner", "admin")
  voidContract(
    @Param("id") id: string,
    @CurrentOrg("id") orgId: string,
    @CurrentUser("id") userId: string,
  ) {
    return this.contractsService.voidContract(id, orgId, userId);
  }

  @Post("contracts/:id/duplicate")
  @Roles("owner", "admin")
  duplicate(
    @Param("id") id: string,
    @Body() dto: DuplicateContractDto,
    @CurrentOrg("id") orgId: string,
    @CurrentUser("id") userId: string,
  ) {
    return this.contractsService.duplicate(id, dto, orgId, userId);
  }

  // --- Client Portal Endpoints ---

  @Get("projects/mine/:projectId/contracts")
  findByClient(
    @Param("projectId") projectId: string,
    @CurrentUser("id") userId: string,
    @CurrentOrg("id") orgId: string,
    @Query() pagination: PaginationQueryDto,
  ) {
    return this.contractsService.findByClient(
      projectId,
      userId,
      orgId,
      pagination.page,
      pagination.limit,
    );
  }

  @Get("contracts/mine/:id")
  findOneByClient(
    @Param("id") id: string,
    @CurrentUser("id") userId: string,
    @CurrentOrg("id") orgId: string,
  ) {
    return this.contractsService.findOneByClient(id, userId, orgId);
  }

  @Post("contracts/mine/:id/track-view")
  trackViewByClient(
    @Param("id") id: string,
    @CurrentUser("id") userId: string,
    @CurrentOrg("id") orgId: string,
  ) {
    return this.contractsService.trackViewByClient(id, userId, orgId);
  }

  @Get("contracts/mine/:id/pdf")
  async getClientPdf(
    @Param("id") id: string,
    @CurrentUser("id") userId: string,
    @CurrentOrg("id") orgId: string,
    @Res() res: Response,
  ) {
    sendPdf(res, await this.contractsService.renderClientPdf(id, userId, orgId));
  }
}

function sendPdf(res: Response, pdf: { buffer: Buffer; filename: string }) {
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="${sanitizeFilename(pdf.filename)}"`);
  res.setHeader("Cache-Control", "private, no-store");
  res.end(pdf.buffer);
}
