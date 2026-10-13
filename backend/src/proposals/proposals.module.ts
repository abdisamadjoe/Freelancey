import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { PrismaModule } from "../prisma/prisma.module";
import { MailModule } from "../mail/mail.module";
import { ActivityModule } from "../activity/activity.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { ProposalsController, PublicProposalsController } from "./proposals.controller";
import { ProposalsService } from "./proposals.service";
import { ProposalExpiryTask } from "./proposal-expiry.task";

@Module({
  imports: [ScheduleModule.forRoot(), PrismaModule, MailModule, ActivityModule, NotificationsModule],
  controllers: [ProposalsController, PublicProposalsController],
  providers: [ProposalsService, ProposalExpiryTask],
  exports: [ProposalsService],
})
export class ProposalsModule {}
