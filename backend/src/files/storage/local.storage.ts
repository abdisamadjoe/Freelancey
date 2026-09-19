import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { StorageProvider } from "./storage.interface";
import { Readable } from "stream";
import * as fs from "fs/promises";
import * as path from "path";
import { createReadStream, existsSync } from "fs";

@Injectable()
export class LocalStorage implements StorageProvider {
  private uploadDir: string;

  constructor(private config: ConfigService) {
    this.uploadDir = this.config.get("UPLOAD_DIR", "./uploads");
  }

  private getFilePath(key: string): string {
    const filePath = path.resolve(this.uploadDir, key);
    if (!filePath.startsWith(path.resolve(this.uploadDir))) {
      throw new Error("Path traversal detected");
    }
    return filePath;
  }

  async upload(key: string, body: Buffer, _contentType: string): Promise<void> {
    const filePath = this.getFilePath(key);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, body);
  }

  async download(
    key: string,
  ): Promise<{ body: Readable; contentType: string }> {
    const filePath = this.getFilePath(key);
    if (!existsSync(filePath)) {
      throw new Error(`File not found: ${key}`);
    }
    const body = createReadStream(filePath);
    // Content type should be looked up from the DB, not filesystem
    return { body, contentType: "application/octet-stream" };
  }

  async getSignedUrl(key: string, _expiresIn?: number): Promise<string> {
    // Local storage doesn't support signed URLs; return a direct download path
    return `/api/files/download/${key}`;
  }

  async delete(key: string): Promise<void> {
    const filePath = this.getFilePath(key);
    if (existsSync(filePath)) {
      await fs.unlink(filePath);
    }
  }
}
