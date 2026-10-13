import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { MailModule } from "../mail/mail.module";
import { ActivityModule } from "../activity/activity.module";
import { HandoverController, PublicHandoverController } from "./handover.controller";
import { HandoverService } from "./handover.service";

@Module({
  imports: [PrismaModule, MailModule, ActivityModule],
  controllers: [HandoverController, PublicHandoverController],
  providers: [HandoverService],
  exports: [HandoverService],
})
export class HandoverModule {}
