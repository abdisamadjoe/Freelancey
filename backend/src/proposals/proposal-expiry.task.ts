import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { ProposalsService } from "./proposals.service";

@Injectable()
export class ProposalExpiryTask {
  private readonly logger = new Logger(ProposalExpiryTask.name);

  constructor(private proposals: ProposalsService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async run() {
    try {
      const expired = await this.proposals.expireOverdue();
      if (expired > 0) this.logger.log(`Expired ${expired} overdue proposal(s)`);
    } catch (err) {
      this.logger.error(`Proposal expiry failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}
