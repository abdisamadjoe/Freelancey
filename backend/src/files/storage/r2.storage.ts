import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { StorageProvider } from "./storage.interface";
import { Readable } from "stream";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * Cloudflare R2 storage, accessed via its S3-compatible API.
 */
@Injectable()
export class R2Storage implements StorageProvider {
  private client: S3Client;
  private bucket: string;

  constructor(config: ConfigService) {
    const accountId = config.getOrThrow<string>("R2_ACCOUNT_ID");
    this.bucket = config.getOrThrow<string>("R2_BUCKET_NAME");

    this.client = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.getOrThrow("R2_ACCESS_KEY_ID"),
        secretAccessKey: config.getOrThrow("R2_SECRET_ACCESS_KEY"),
      },
    });
  }

  async upload(key: string, body: Buffer, contentType: string): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
  }

  async download(
    key: string,
  ): Promise<{ body: Readable; contentType: string }> {
    const response = await this.client.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );
    return {
      body: response.Body as Readable,
      contentType: response.ContentType || "application/octet-stream",
    };
  }

  async getSignedUrl(key: string, expiresIn = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    return getSignedUrl(this.client, command, { expiresIn });
  }

  async delete(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );
  }
}
