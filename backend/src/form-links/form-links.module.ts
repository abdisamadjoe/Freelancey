import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { MailModule } from "../mail/mail.module";
import { ActivityModule } from "../activity/activity.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { ClientOnboardingModule } from "../client-onboarding/client-onboarding.module";
import { FormLinksController, PublicFormsController } from "./form-links.controller";
import { FormLinksService } from "./form-links.service";

@Module({
  imports: [PrismaModule, MailModule, ActivityModule, NotificationsModule, ClientOnboardingModule],
  controllers: [FormLinksController, PublicFormsController],
  providers: [FormLinksService],
  exports: [FormLinksService],
})
export class FormLinksModule {}
