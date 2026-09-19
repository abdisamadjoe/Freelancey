import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { NotesService } from "./notes.service";
import { CreateNoteDto } from "./notes.dto";
import {
  AuthGuard,
  RolesGuard,
  Roles,
  CurrentUser,
  CurrentOrg,
  PaginationQueryDto,
} from "../common";

@Controller("notes")
@UseGuards(AuthGuard, RolesGuard)
export class NotesController {
  constructor(private notesService: NotesService) {}

  @Post()
  @Roles("owner", "admin")
  create(
    @Body() dto: CreateNoteDto,
    @Query("projectId") projectId: string,
    @CurrentOrg("id") orgId: string,
    @CurrentUser("id") userId: string,
  ) {
    if (!projectId) throw new BadRequestException("projectId is required");
    return this.notesService.create(dto.content, projectId, orgId, userId);
  }

  @Get("project/:projectId")
  @Roles("owner", "admin")
  findByProject(
    @Param("projectId") projectId: string,
    @CurrentOrg("id") orgId: string,
    @Query() pagination: PaginationQueryDto,
  ) {
    return this.notesService.findByProject(
      projectId,
      orgId,
      pagination.page,
      pagination.limit,
    );
  }

  @Delete(":id")
  @Roles("owner", "admin")
  remove(
    @Param("id") id: string,
    @CurrentOrg("id") orgId: string,
  ) {
    return this.notesService.remove(id, orgId);
  }
}
