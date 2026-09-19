import { Readable } from "stream";

export interface StorageProvider {
  upload(key: string, body: Buffer, contentType: string): Promise<void>;
  download(key: string): Promise<{ body: Readable; contentType: string }>;
  getSignedUrl(key: string, expiresIn?: number): Promise<string>;
  delete(key: string): Promise<void>;
}

export const STORAGE_PROVIDER = "STORAGE_PROVIDER";
