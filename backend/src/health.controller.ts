import { Controller, Get, HttpException, HttpStatus } from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";
import { ConfigService } from "@nestjs/config";
import { Public } from "./common";
import { PrismaService } from "./prisma/prisma.service";

@SkipThrottle()
@Controller("health")
export class HealthController {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  @Public()
  @Get("config")
  getConfig() {
    return {
      billingEnabled: this.config.get("BILLING_ENABLED") === "true",
      signupEnabled: this.config.get("ALLOW_SIGNUPS") !== "false",
    };
  }

  @Get()
  async check() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: "ok",
        database: "connected",
        timestamp: new Date().toISOString(),
      };
    } catch {
      throw new HttpException(
        {
          status: "degraded",
          database: "disconnected",
          timestamp: new Date().toISOString(),
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }
}
