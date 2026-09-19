import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
import { initSentry } from "./instrument";

// Load backend/.env before NestJS bootstraps (npm -w runs from backend/)
function loadEnv(filePath: string) {
  if (!existsSync(filePath)) return;
  for (const line of readFileSync(filePath, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq);
    if (process.env[key] !== undefined) continue; // don't override existing
    let val = trimmed.slice(eq + 1);
    const quote = val[0];
    if (quote === '"' || quote === "'") {
      const endIdx = val.indexOf(quote, 1);
      if (endIdx !== -1) val = val.slice(1, endIdx);
      else val = val.slice(1);
    } else {
      // Strip inline comments for unquoted values
      const hashIdx = val.indexOf(" #");
      if (hashIdx !== -1) val = val.slice(0, hashIdx).trim();
    }
    process.env[key] = val;
  }
}
loadEnv(resolve(process.cwd(), ".env"));

// Initialize Sentry after env vars are loaded and before NestJS bootstrap
initSentry();

const required = [
  "DATABASE_URL",
  "APP_ENCRYPTION_SECRET",
  "NEON_AUTH_BASE_URL",
];
for (const key of required) {
  if (!process.env[key]) {
    console.error(`Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

// App encryption secret validation (used to derive AES/HMAC key material for
// settings encryption, push subscriptions, and payment signing — decoupled
// from the auth provider now that Neon Auth manages its own signing keys)
const DEFAULT_SECRET = "change-me-in-production";
const appSecret = process.env.APP_ENCRYPTION_SECRET!;
const isProduction = process.env.NODE_ENV === "production";

if (isProduction) {
  if (appSecret === DEFAULT_SECRET) {
    console.error(
      "FATAL: APP_ENCRYPTION_SECRET is set to the default value. " +
        "You must change it before running in production.",
    );
    process.exit(1);
  }
  if (appSecret.length < 32) {
    console.error(
      "FATAL: APP_ENCRYPTION_SECRET must be at least 32 characters in production. " +
        `Current length: ${appSecret.length}`,
    );
    process.exit(1);
  }
} else {
  if (appSecret === DEFAULT_SECRET) {
    console.warn(
      "WARNING: APP_ENCRYPTION_SECRET is set to the default value. " +
        "Change it before deploying to production.",
    );
  }
}

import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ValidationPipe, RequestMethod } from "@nestjs/common";
import { Logger } from "nestjs-pino";
import cookieParser from "cookie-parser";
import compression from "compression";
import helmet from "helmet";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
    rawBody: true,
  });
  app.useLogger(app.get(Logger));

  // Trust the platform's edge proxy (Railway) so that req.protocol reflects
  // the original HTTPS and cookies set correctly.
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.set("trust proxy", true);

  app.use(cookieParser());
  app.use(compression());

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "blob:"],
          connectSrc: ["'self'", process.env.WEB_URL || "http://localhost:3000"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
        },
      },
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: "cross-origin" },
    }),
  );

  app.enableCors({
    origin: process.env.WEB_URL || "http://localhost:3000",
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.setGlobalPrefix("api", {
    exclude: [{ path: "/", method: RequestMethod.GET }],
  });

  const port = process.env.PORT || 3001;
  await app.listen(port);
  app.get(Logger).log(`Freelancey API running on http://localhost:${port}`);
}

bootstrap();
