import { Module } from "@nestjs/common";
import { ContractsService } from "./contracts.service";
import { ContractSigningService } from "./contract-signing.service";
import { ContractPdfService } from "./contract-pdf.service";
import { ContractsController } from "./contracts.controller";
import { ContractSigningController, PublicContractsController } from "./contract-signing.controller";
import { PrismaModule } from "../prisma/prisma.module";
import { AuthModule } from "../auth/auth.module";
import { MailModule } from "../mail/mail.module";
import { ActivityModule } from "../activity/activity.module";
import { NotificationsModule } from "../notifications/notifications.module";

@Module({
  imports: [PrismaModule, AuthModule, MailModule, ActivityModule, NotificationsModule],
  controllers: [ContractsController, ContractSigningController, PublicContractsController],
  providers: [ContractsService, ContractSigningService, ContractPdfService],
  exports: [ContractsService, ContractSigningService],
})
export class ContractsModule {}
