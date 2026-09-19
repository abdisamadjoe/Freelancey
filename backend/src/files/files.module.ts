import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { FilesController } from "./files.controller";
import { FilesService } from "./files.service";
import { SettingsModule } from "../settings/settings.module";
import { STORAGE_PROVIDER } from "./storage/storage.interface";
import { R2Storage } from "./storage/r2.storage";

@Module({
  imports: [SettingsModule],
  controllers: [FilesController],
  providers: [
    FilesService,
    {
      provide: STORAGE_PROVIDER,
      useFactory: (config: ConfigService) => new R2Storage(config),
      inject: [ConfigService],
    },
  ],
  exports: [FilesService, STORAGE_PROVIDER],
})
export class FilesModule {}
