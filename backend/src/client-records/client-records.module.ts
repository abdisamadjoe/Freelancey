import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { PrismaModule } from "../prisma/prisma.module";
import { ActivityModule } from "../activity/activity.module";
import { ClientRecordsController } from "./client-records.controller";
import { NotificationsModule } from "../notifications/notifications.module";
import { ClientRecordsService } from "./client-records.service";
import { PublicLeadsController } from "./public-leads.controller";
import { PublicLeadsService } from "./public-leads.service";
import { LeadFollowUpTask } from "./lead-follow-up.task";

@Module({
  imports: [ScheduleModule.forRoot(), PrismaModule, ActivityModule, NotificationsModule],
  controllers: [ClientRecordsController, PublicLeadsController],
  providers: [ClientRecordsService, PublicLeadsService, LeadFollowUpTask],
  exports: [ClientRecordsService],
})
export class ClientRecordsModule {}
