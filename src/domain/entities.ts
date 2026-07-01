import { FileId, FileStatus, FileSize } from './value-objects';

export interface FileReferenceData {
  id: string;
  resourceType: string;
  resourceId: string;
  category: string;
  originalName: string;
  mimeType: string;
  size: number;
  storageKey: string;
  storageBucket: string;
  checksum: string;
  status: string;
  description: string | null;
  expiresAt: Date | null;
  parentId: string | null;
  uploadedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export class FileReference {
  readonly id: FileId;
  readonly resourceType: string;
  readonly resourceId: string;
  readonly category: string;
  readonly originalName: string;
  readonly mimeType: string;
  readonly size: FileSize;
  readonly storageKey: string;
  readonly storageBucket: string;
  readonly checksum: string;
  readonly status: FileStatus;
  readonly description: string | null;
  readonly expiresAt: Date | null;
  readonly parentId: string | null;
  readonly uploadedBy: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  private constructor(data: FileReferenceData) {
    this.id = FileId.create(data.id);
    this.resourceType = data.resourceType;
    this.resourceId = data.resourceId;
    this.category = data.category;
    this.originalName = data.originalName;
    this.mimeType = data.mimeType;
    this.size = FileSize.fromBytes(data.size);
    this.storageKey = data.storageKey;
    this.storageBucket = data.storageBucket;
    this.checksum = data.checksum;
    this.status = FileStatus.create(data.status);
    this.description = data.description;
    this.expiresAt = data.expiresAt;
    this.parentId = data.parentId;
    this.uploadedBy = data.uploadedBy;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  static create(data: Omit<FileReferenceData, 'id' | 'status' | 'createdAt' | 'updatedAt'>): FileReference {
    const now = new Date();
    return new FileReference({
      ...data,
      id: FileId.generate().value,
      status: FileStatus.PENDING,
      createdAt: now,
      updatedAt: now,
    });
  }

  static fromPersistence(data: FileReferenceData): FileReference {
    return new FileReference(data);
  }

  confirm(checksum: string): FileReference {
    if (!this.status.isPending()) {
      return this;
    }
    return FileReference.fromPersistence({
      ...this.toPersistence(),
      checksum,
      status: FileStatus.CONFIRMED,
      updatedAt: new Date(),
    });
  }

  reject(): FileReference {
    return FileReference.fromPersistence({
      ...this.toPersistence(),
      status: FileStatus.REJECTED,
      updatedAt: new Date(),
    });
  }

  quarantine(): FileReference {
    return FileReference.fromPersistence({
      ...this.toPersistence(),
      status: FileStatus.QUARANTINED,
      updatedAt: new Date(),
    });
  }

  markDeleted(): FileReference {
    return FileReference.fromPersistence({
      ...this.toPersistence(),
      status: FileStatus.DELETED,
      updatedAt: new Date(),
    });
  }

  updateMetadata(data: { description?: string; category?: string; expiresAt?: Date | null }): FileReference {
    return FileReference.fromPersistence({
      ...this.toPersistence(),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.category !== undefined ? { category: data.category } : {}),
      ...(data.expiresAt !== undefined ? { expiresAt: data.expiresAt } : {}),
      updatedAt: new Date(),
    });
  }

  toPersistence(): FileReferenceData {
    return {
      id: this.id.value,
      resourceType: this.resourceType,
      resourceId: this.resourceId,
      category: this.category,
      originalName: this.originalName,
      mimeType: this.mimeType,
      size: this.size.bytes,
      storageKey: this.storageKey,
      storageBucket: this.storageBucket,
      checksum: this.checksum,
      status: this.status.value,
      description: this.description,
      expiresAt: this.expiresAt,
      parentId: this.parentId,
      uploadedBy: this.uploadedBy,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
