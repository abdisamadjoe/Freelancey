import { Module } from "@nestjs/common";
import { SetupController } from "./setup.controller";
import { SetupService } from "./setup.service";
import { MailModule } from "../mail/mail.module";
import { SettingsModule } from "../settings/settings.module";

@Module({
  imports: [MailModule, SettingsModule],
  controllers: [SetupController],
  providers: [SetupService],
  exports: [SetupService],
})
export class SetupModule {}
