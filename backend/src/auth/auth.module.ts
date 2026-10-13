import { Module } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { BetterAuthService } from "./better-auth.service";
import { MailModule } from "../mail/mail.module";
import { AuthUsersRepository } from "./auth-users.repository";
import { SessionMiddleware } from "./session.middleware";
import { PreviewModeMiddleware } from "./preview-mode.middleware";
import { AuthController } from "./auth.controller";
import { BillingModule } from "../billing/billing.module";

@Module({
  imports: [BillingModule, MailModule],
  controllers: [AuthController],
  providers: [AuthService, BetterAuthService, AuthUsersRepository, SessionMiddleware, PreviewModeMiddleware],
  exports: [AuthService, BetterAuthService, AuthUsersRepository, SessionMiddleware, PreviewModeMiddleware],
})
export class AuthModule {}
