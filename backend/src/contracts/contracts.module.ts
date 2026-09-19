import { Module } from "@nestjs/common";
import { ContractsService } from "./contracts.service";
import { ContractPdfService } from "./contract-pdf.service";
import { ContractsController } from "./contracts.controller";
import { PrismaModule } from "../prisma/prisma.module";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [ContractsController],
  providers: [ContractsService, ContractPdfService],
  exports: [ContractsService],
})
export class ContractsModule {}
