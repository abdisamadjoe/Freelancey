import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class InvoiceOverdueTask {
  private readonly logger = new Logger(InvoiceOverdueTask.name);

  constructor(private prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async markOverdueInvoices() {
    const now = new Date();

    const result = await this.prisma.invoice.updateMany({
      where: {
        status: "sent",
        dueDate: { lt: now },
      },
      data: { status: "overdue" },
    });

    if (result.count > 0) {
      this.logger.log(`Marked ${result.count} invoice(s) as overdue`);
    }
  }
}
