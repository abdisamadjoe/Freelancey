import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { ActivityModule } from "../activity/activity.module";
import { ClientRecordsController } from "./client-records.controller";
import { ClientRecordsService } from "./client-records.service";

@Module({
  imports: [PrismaModule, ActivityModule],
  controllers: [ClientRecordsController],
  providers: [ClientRecordsService],
  exports: [ClientRecordsService],
})
export class ClientRecordsModule {}
