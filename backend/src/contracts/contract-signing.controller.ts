import { Body, Controller, Get, HttpCode, Param, Post, Req, Res, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import type { Request, Response } from "express";
import { AuthGuard, CurrentOrg, CurrentUser, Public, Roles, RolesGuard, sanitizeFilename } from "../common";
import { ContractSigningService } from "./contract-signing.service";
import { CreateContractFromProposalDto, SendContractLinkDto, SignContractDto } from "./contract-signing.dto";

/** Contracts written from accepted proposals. Staff only. */
@Controller()
@UseGuards(AuthGuard, RolesGuard)
@Roles("owner", "admin")
export class ContractSigningController {
  constructor(private service: ContractSigningService) {}

  @Post("contracts/from-proposal/:proposalId")
  createFromProposal(
    @Param("proposalId") proposalId: string,
    @Body() dto: CreateContractFromProposalDto,
    @CurrentOrg("id") orgId: string,
    @CurrentUser("id") userId: string,
  ) {
    return this.service.createFromProposal(proposalId, dto, orgId, userId);
  }

  @Get("client-records/:id/contracts")
  listForClientRecord(@Param("id") id: string, @CurrentOrg("id") orgId: string) {
    return this.service.listForClientRecord(id, orgId);
  }

  @Post("contracts/:id/send-link")
  sendLink(
    @Param("id") id: string,
    @Body() dto: SendContractLinkDto,
    @CurrentOrg("id") orgId: string,
    @CurrentUser("id") userId: string,
  ) {
    return this.service.sendForSigning(id, dto, orgId, userId);
  }
}

/** Unauthenticated: the secret token in the URL is the only way in and scopes everything to one contract. */
@Controller("contracts/public")
export class PublicContractsController {
  constructor(private service: ContractSigningService) {}

  @Public()
  @Get(":token")
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  view(@Param("token") token: string) {
    return this.service.getPublic(token);
  }

  @Public()
  @Get(":token/pdf")
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async pdf(@Param("token") token: string, @Res() res: Response) {
    const pdf = await this.service.getPublicPdf(token);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${sanitizeFilename(pdf.filename)}"`);
    res.setHeader("Cache-Control", "private, no-store");
    res.end(pdf.buffer);
  }

  @Public()
  @Post(":token/sign")
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  sign(@Param("token") token: string, @Body() dto: SignContractDto, @Req() req: Request) {
    return this.service.sign(token, dto, { ip: req.ip, userAgent: req.get("user-agent") });
  }
}
