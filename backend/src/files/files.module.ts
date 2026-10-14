import { Logger, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { FilesController } from "./files.controller";
import { FilesService } from "./files.service";
import { SettingsModule } from "../settings/settings.module";
import { STORAGE_PROVIDER } from "./storage/storage.interface";
import { R2Storage } from "./storage/r2.storage";
import { LocalStorage } from "./storage/local.storage";

const R2_KEYS = ["R2_ACCOUNT_ID", "R2_BUCKET_NAME", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY"] as const;

@Module({
  imports: [SettingsModule],
  controllers: [FilesController],
  providers: [
    FilesService,
    {
      provide: STORAGE_PROVIDER,
      // R2 is optional: without all four R2_* variables, files fall back to local disk (UPLOAD_DIR).
      useFactory: (config: ConfigService) => {
        if (R2_KEYS.every((k) => !!config.get<string>(k))) return new R2Storage(config);
        new Logger("FilesModule").warn(
          "R2 is not configured, using local disk storage. Files are lost when the instance is redeployed.",
        );
        return new LocalStorage(config);
      },
      inject: [ConfigService],
    },
  ],
  exports: [FilesService, STORAGE_PROVIDER],
})
export class FilesModule {}
