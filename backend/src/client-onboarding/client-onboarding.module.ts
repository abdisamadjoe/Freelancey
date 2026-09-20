import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { MailModule } from "../mail/mail.module";
import { AuthModule } from "../auth/auth.module";
import { ActivityModule } from "../activity/activity.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { ClientOnboardingController, ClientOnboardingPortalController } from "./client-onboarding.controller";
import { ClientOnboardingService } from "./client-onboarding.service";

@Module({
  imports: [PrismaModule, MailModule, AuthModule, ActivityModule, NotificationsModule],
  controllers: [ClientOnboardingController, ClientOnboardingPortalController],
  providers: [ClientOnboardingService],
  exports: [ClientOnboardingService],
})
export class ClientOnboardingModule {}
