import { Module } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { StackAuthClient } from "./stack-auth.client";
import { NeonAuthUsersRepository } from "./neon-auth-users.repository";
import { SessionMiddleware } from "./session.middleware";
import { PreviewModeMiddleware } from "./preview-mode.middleware";
import { AuthController } from "./auth.controller";
import { BillingModule } from "../billing/billing.module";

@Module({
  imports: [BillingModule],
  controllers: [AuthController],
  providers: [AuthService, StackAuthClient, NeonAuthUsersRepository, SessionMiddleware, PreviewModeMiddleware],
  exports: [AuthService, StackAuthClient, NeonAuthUsersRepository, SessionMiddleware, PreviewModeMiddleware],
})
export class AuthModule {}
