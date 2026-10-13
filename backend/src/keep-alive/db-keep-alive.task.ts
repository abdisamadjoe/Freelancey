import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { PrismaService } from "../prisma/prisma.service";

/** Pings the database so Aiven doesn't power off an idle instance. */
@Injectable()
export class DbKeepAliveTask {
  private readonly logger = new Logger(DbKeepAliveTask.name);

  constructor(private prisma: PrismaService) {}

  @Cron("0 */12 * * *")
  async ping() {
    try {
      await this.prisma.$queryRawUnsafe("SELECT 1;");
      this.logger.log("Database keep-alive ping ok");
    } catch (err) {
      // Never let a failed ping crash the scheduler.
      this.logger.error(
        `Database keep-alive ping failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
