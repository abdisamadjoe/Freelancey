import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { DbKeepAliveTask } from "./db-keep-alive.task";

@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [DbKeepAliveTask],
})
export class KeepAliveModule {}
