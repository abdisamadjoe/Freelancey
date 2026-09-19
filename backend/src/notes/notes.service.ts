import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { NeonAuthUsersRepository } from "../auth/neon-auth-users.repository";
import { paginationArgs, paginatedResponse } from "../common";

@Injectable()
export class NotesService {
  constructor(
    private prisma: PrismaService,
    private neonAuthUsers: NeonAuthUsersRepository,
  ) {}

  async create(
    content: string,
    projectId: string,
    orgId: string,
    authorId: string,
  ) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, organizationId: orgId },
    });
    if (!project) throw new NotFoundException("Project not found");

    return this.prisma.projectNote.create({
      data: {
        content,
        projectId,
        organizationId: orgId,
        authorId,
      },
    });
  }

  async findByProject(
    projectId: string,
    orgId: string,
    page = 1,
    limit = 20,
  ) {
    const where = { projectId, organizationId: orgId };
    const [notes, total] = await Promise.all([
      this.prisma.projectNote.findMany({
        where,
        orderBy: { createdAt: "desc" },
        ...paginationArgs(page, limit),
      }),
      this.prisma.projectNote.count({ where }),
    ]);

    const authorIds = [...new Set(notes.map((n) => n.authorId))];
    const authors = await this.neonAuthUsers.findMany(authorIds);
    const authorMap = new Map(authors.map((a) => [a.id, a]));

    const enriched = notes.map((n) => {
      const author = authorMap.get(n.authorId);
      return {
        id: n.id,
        content: n.content,
        projectId: n.projectId,
        author: author ?? { id: n.authorId, name: "Unknown" },
        createdAt: n.createdAt,
      };
    });

    return paginatedResponse(enriched, total, page, limit);
  }

  async remove(id: string, orgId: string) {
    const note = await this.prisma.projectNote.findFirst({
      where: { id, organizationId: orgId },
    });
    if (!note) throw new NotFoundException("Note not found");

    await this.prisma.projectNote.delete({ where: { id } });
  }
}
