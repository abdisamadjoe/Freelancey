import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { AuthModule } from "../auth/auth.module";
import { ActivityService } from "./activity.service";

@Module({
  imports: [PrismaModule, AuthModule],
  providers: [ActivityService],
  exports: [ActivityService],
})
export class ActivityModule {}
