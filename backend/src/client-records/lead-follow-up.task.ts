import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";

/** Once a day, tell each workspace which leads are waiting for a follow-up. One digest, not one alert per lead. */
@Injectable()
export class LeadFollowUpTask {
  private readonly logger = new Logger(LeadFollowUpTask.name);

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  @Cron("0 8 * * *")
  async sendDigests(now = new Date()) {
    const due = await this.prisma.client.findMany({
      where: { stage: "lead", archivedAt: null, nextFollowUpAt: { lte: now } },
      select: { organizationId: true, name: true },
      orderBy: { nextFollowUpAt: "asc" },
      take: 5000,
    });

    const byOrg = new Map<string, string[]>();
    for (const lead of due) {
      const names = byOrg.get(lead.organizationId) ?? [];
      names.push(lead.name);
      byOrg.set(lead.organizationId, names);
    }

    for (const [orgId, names] of byOrg) {
      this.notifications.notifyLeadFollowUps(orgId, names, names.length);
    }
    if (byOrg.size > 0) this.logger.log(`Sent lead follow-up digests to ${byOrg.size} workspace(s)`);
    return byOrg.size;
  }
}
