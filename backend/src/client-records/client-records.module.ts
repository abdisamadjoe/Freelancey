import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { ActivityModule } from "../activity/activity.module";
import { ClientRecordsController } from "./client-records.controller";
import { NotificationsModule } from "../notifications/notifications.module";
import { ClientRecordsService } from "./client-records.service";
import { PublicLeadsController } from "./public-leads.controller";
import { PublicLeadsService } from "./public-leads.service";

@Module({
  imports: [PrismaModule, ActivityModule, NotificationsModule],
  controllers: [ClientRecordsController, PublicLeadsController],
  providers: [ClientRecordsService, PublicLeadsService],
  exports: [ClientRecordsService],
})
export class ClientRecordsModule {}
