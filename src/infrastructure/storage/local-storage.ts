import { randomUUID } from 'node:crypto';
import { mkdir, readFile, unlink, copyFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { PresignedUrlInfo, StoragePort } from '../../application/ports';

export class LocalStorageAdapter implements StoragePort {
  private readonly basePath: string;

  constructor(basePath: string) {
    this.basePath = basePath;
  }

  async generatePresignedUploadUrl(key: string, contentType: string, contentLength: number): Promise<PresignedUrlInfo> {
    const filePath = join(this.basePath, key);
    await mkdir(dirname(filePath), { recursive: true });

    const token = randomUUID();

    return {
      url: `/local-storage/upload/${token}`,
      fields: { key, contentType: contentType, contentLength: String(contentLength), token },
      expiresIn: 3600,
    };
  }

  async generatePresignedDownloadUrl(key: string, _expiresIn = 3600): Promise<string> {
    const filePath = join(this.basePath, key);
    if (!existsSync(filePath)) {
      throw new Error(`Archivo no encontrado en almacenamiento local: ${key}`);
    }
    const token = randomUUID();
    return `/local-storage/download/${token}/${encodeURIComponent(key)}`;
  }

  async getObject(key: string): Promise<Buffer> {
    const filePath = join(this.basePath, key);
    return readFile(filePath);
  }

  async deleteObject(key: string): Promise<void> {
    const filePath = join(this.basePath, key);
    if (existsSync(filePath)) {
      await unlink(filePath);
    }
  }

  async copyObject(sourceKey: string, destinationKey: string): Promise<void> {
    const sourcePath = join(this.basePath, sourceKey);
    const destPath = join(this.basePath, destinationKey);
    await mkdir(dirname(destPath), { recursive: true });
    await copyFile(sourcePath, destPath);
  }

  async objectExists(key: string): Promise<boolean> {
    return existsSync(join(this.basePath, key));
  }
}
