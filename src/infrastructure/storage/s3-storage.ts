import {
  S3Client,
  S3ClientConfig,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  CopyObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PresignedUrlInfo, StoragePort } from '../../application/ports';

export class S3StorageAdapter implements StoragePort {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(config: {
    endpoint: string;
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
    forcePathStyle: boolean;
    bucket: string;
  }) {
    const clientConfig: S3ClientConfig = {
      region: config.region,
      forcePathStyle: config.forcePathStyle,
    };

    if (config.endpoint) {
      clientConfig.endpoint = config.endpoint;
    }

    if (config.accessKeyId && config.secretAccessKey) {
      clientConfig.credentials = {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      };
    }

    this.client = new S3Client(clientConfig);
    this.bucket = config.bucket;
  }

  async generatePresignedUploadUrl(key: string, contentType: string, contentLength: number): Promise<PresignedUrlInfo> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
      ContentLength: contentLength,
    });

    const url = await getSignedUrl(this.client, command, { expiresIn: 3600 });

    return {
      url,
      expiresIn: 3600,
    };
  }

  async generatePresignedDownloadUrl(key: string, expiresIn = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    return getSignedUrl(this.client, command, { expiresIn });
  }

  async getObject(key: string): Promise<Buffer> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    const response = await this.client.send(command);
    const chunks: Uint8Array[] = [];

    for await (const chunk of response.Body as any) {
      chunks.push(chunk);
    }

    return Buffer.concat(chunks);
  }

  async deleteObject(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    await this.client.send(command);
  }

  async copyObject(sourceKey: string, destinationKey: string): Promise<void> {
    const command = new CopyObjectCommand({
      Bucket: this.bucket,
      CopySource: `${this.bucket}/${sourceKey}`,
      Key: destinationKey,
    });

    await this.client.send(command);
  }

  async objectExists(key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });
      await this.client.send(command);
      return true;
    } catch {
      return false;
    }
  }
}
