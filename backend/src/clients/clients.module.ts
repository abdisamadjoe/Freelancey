import { Module } from "@nestjs/common";
import { ClientsController } from "./clients.controller";
import { ClientsService } from "./clients.service";
import { AuthModule } from "../auth/auth.module";
import { MailModule } from "../mail/mail.module";

@Module({
  imports: [AuthModule, MailModule],
  controllers: [ClientsController],
  providers: [ClientsService],
})
export class ClientsModule {}
