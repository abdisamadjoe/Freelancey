import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { MailModule } from "../mail/mail.module";
import { ActivityModule } from "../activity/activity.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { PublicSupportController, SupportController } from "./support.controller";
import { SupportService } from "./support.service";

@Module({
  imports: [PrismaModule, MailModule, ActivityModule, NotificationsModule],
  controllers: [SupportController, PublicSupportController],
  providers: [SupportService],
  exports: [SupportService],
})
export class SupportModule {}
