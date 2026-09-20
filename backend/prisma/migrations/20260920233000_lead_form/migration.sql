-- Opt-in switch for the public lead form (off by default).
ALTER TABLE "system_settings" ADD COLUMN "leadFormEnabled" BOOLEAN NOT NULL DEFAULT false;
