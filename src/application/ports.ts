export interface PresignedUrlInfo {
  url: string;
  fields?: Record<string, string>;
  expiresIn: number;
}

export interface StoragePort {
  generatePresignedUploadUrl(key: string, contentType: string, contentLength: number): Promise<PresignedUrlInfo>;
  generatePresignedDownloadUrl(key: string, expiresIn?: number): Promise<string>;
  getObject(key: string): Promise<Buffer>;
  deleteObject(key: string): Promise<void>;
  copyObject(sourceKey: string, destinationKey: string): Promise<void>;
  objectExists(key: string): Promise<boolean>;
}

export interface AntivirusPort {
  scan(buffer: Buffer): Promise<ScanResult>;
}

export interface ScanResult {
  infected: boolean;
  virusName?: string;
}

export interface ImageVariant {
  suffix: string;
  width: number;
  height: number;
  fit: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
}

export interface ImageProcessorPort {
  generateVariants(buffer: Buffer, key: string, variants: ImageVariant[]): Promise<Array<{ key: string; buffer: Buffer }>>;
  isImage(mimeType: string): boolean;
}

export interface UnitOfWork {
  execute<T>(work: (repos: import('../domain/repositories').Repositories) => Promise<T>): Promise<T>;
}
