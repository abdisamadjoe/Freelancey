import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { ProjectTemplatesController, ProjectWorkflowController } from "./project-workflow.controller";
import { ProjectWorkflowService } from "./project-workflow.service";

@Module({
  imports: [PrismaModule],
  controllers: [ProjectWorkflowController, ProjectTemplatesController],
  providers: [ProjectWorkflowService],
  exports: [ProjectWorkflowService],
})
export class ProjectWorkflowModule {}
