import { Module } from "@nestjs/common";
import { NotificationsModule } from "../notifications/notifications.module";
import { ActivityModule } from "../activity/activity.module";
import { AuthModule } from "../auth/auth.module";
import { TasksController } from "./tasks.controller";
import { TasksService } from "./tasks.service";

@Module({
  imports: [NotificationsModule, ActivityModule, AuthModule],
  controllers: [TasksController],
  providers: [TasksService],
})
export class TasksModule {}
