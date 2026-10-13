import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { MailModule } from "../mail/mail.module";
import { ActivityModule } from "../activity/activity.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { DeliverablesController, PublicDeliverablesController } from "./deliverables.controller";
import { DeliverablesService } from "./deliverables.service";

@Module({
  imports: [PrismaModule, MailModule, ActivityModule, NotificationsModule],
  controllers: [DeliverablesController, PublicDeliverablesController],
  providers: [DeliverablesService],
  exports: [DeliverablesService],
})
export class DeliverablesModule {}
