/**
 * Boots the real Nest app (real guards, validation, controllers, services,
 * Prisma) against the TEST_DATABASE_URL database. Only two things are faked:
 * the JWT check (tokens look like "test:<userId>") and outgoing email.
 *
 * Import order matters: the env vars below must be set before AppModule is
 * loaded, because ConfigModule reads them at module initialisation.
 */
process.env.LOG_LEVEL = "silent";
process.env.NODE_ENV = "test";
process.env.APP_ENCRYPTION_SECRET ??= "e2e-secret-e2e-secret-e2e-secret-1234";
process.env.NEON_AUTH_BASE_URL ??= "http://127.0.0.1:1/auth";
process.env.WEB_URL ??= "http://localhost:3000";
process.env.R2_ACCOUNT_ID ??= "e2e";
process.env.R2_BUCKET_NAME ??= "e2e";
process.env.R2_ACCESS_KEY_ID ??= "e2e";
process.env.R2_SECRET_ACCESS_KEY ??= "e2e";
process.env.THROTTLE_LIMIT = "100000";

import { ValidationPipe, RequestMethod, type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import cookieParser from "cookie-parser";
import { AppModule } from "../app.module";
import { StackAuthClient } from "../auth/stack-auth.client";
import { MailService } from "../mail/mail.service";
import { PrismaService } from "../prisma/prisma.service";

export interface SentMail {
  to: string;
  subject: string;
  html: string;
}

export interface Harness {
  app: INestApplication;
  prisma: PrismaService;
  baseUrl: string;
  mails: SentMail[];
  close: () => Promise<void>;
}

export async function bootApp(): Promise<Harness> {
  if (!process.env.TEST_DATABASE_URL) throw new Error("TEST_DATABASE_URL is required for e2e specs");
  const mails: SentMail[] = [];

  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(StackAuthClient)
    .useValue({
      verifyAccessToken: async (token: string) => (token.startsWith("test:") ? { sub: token.slice(5) } : null),
    })
    .overrideProvider(MailService)
    .useValue({
      send: async (to: string, subject: string, html: string) => {
        mails.push({ to, subject, html });
      },
    })
    .compile();

  const app = moduleRef.createNestApplication({ rawBody: true });
  // Mirrors main.ts (kept in sync by hand; main.ts is not importable without side effects).
  app.getHttpAdapter().getInstance().set("trust proxy", true);
  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.setGlobalPrefix("api", { exclude: [{ path: "/", method: RequestMethod.GET }] });
  await app.listen(0);

  const address = app.getHttpServer().address();
  const baseUrl = `http://127.0.0.1:${typeof address === "object" && address ? address.port : 0}`;
  return { app, prisma: app.get(PrismaService), baseUrl, mails, close: () => app.close() };
}

export interface ApiResult<T = any> {
  status: number;
  json: T;
}

export function makeApi(baseUrl: string) {
  return async function api<T = any>(
    method: string,
    path: string,
    opts: { token?: string; body?: unknown; headers?: Record<string, string> } = {},
  ): Promise<ApiResult<T>> {
    const res = await fetch(`${baseUrl}/api${path}`, {
      method,
      headers: {
        ...(opts.body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(opts.token ? { Authorization: `Bearer test:${opts.token}` } : {}),
        ...opts.headers,
      },
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
    const text = await res.text();
    let json: any = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = text;
    }
    return { status: res.status, json };
  };
}

/** Polls until `fn` returns a truthy value (for fire-and-forget side effects such as notifications). */
export async function waitFor<T>(fn: () => Promise<T | null | undefined | false>, timeoutMs = 4000): Promise<T> {
  const start = Date.now();
  for (;;) {
    const value = await fn();
    if (value) return value as T;
    if (Date.now() - start > timeoutMs) throw new Error("waitFor timed out");
    await new Promise((r) => setTimeout(r, 50));
  }
}
