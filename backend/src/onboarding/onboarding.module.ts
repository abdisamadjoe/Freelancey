import { Module } from "@nestjs/common";
import { OnboardingController } from "./onboarding.controller";
import { AuthModule } from "../auth/auth.module";
import { BillingModule } from "../billing/billing.module";
import { MailModule } from "../mail/mail.module";

@Module({
  imports: [AuthModule, BillingModule, MailModule],
  controllers: [OnboardingController],
})
export class OnboardingModule {}
