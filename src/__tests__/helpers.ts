import { FileReference } from '../domain/entities';
import { FileReferenceRepository, Repositories } from '../domain/repositories';
import { StoragePort, PresignedUrlInfo, UnitOfWork } from '../application/ports';

export class InMemoryFileRepository implements FileReferenceRepository {
  private store = new Map<string, FileReference>();

  async findById(id: string): Promise<FileReference | null> {
    return this.store.get(id) ?? null;
  }

  async findByResource(resourceType: string, resourceId: string, category?: string): Promise<FileReference[]> {
    const results: FileReference[] = [];
    for (const f of this.store.values()) {
      const data = f.toPersistence();
      if (data.resourceType === resourceType && data.resourceId === resourceId) {
        if (category && data.category !== category) continue;
        results.push(f);
      }
    }
    return results;
  }

  async findByParentId(parentId: string): Promise<FileReference[]> {
    const results: FileReference[] = [];
    for (const f of this.store.values()) {
      if (f.toPersistence().parentId === parentId) {
        results.push(f);
      }
    }
    return results;
  }

  async findExpired(): Promise<FileReference[]> {
    const now = new Date();
    const results: FileReference[] = [];
    for (const f of this.store.values()) {
      const data = f.toPersistence();
      if (data.expiresAt && data.expiresAt <= now && data.status !== 'deleted' && data.status !== 'rejected') {
        results.push(f);
      }
    }
    return results;
  }

  async save(file: FileReference): Promise<void> {
    this.store.set(file.id.value, file);
  }

  async delete(id: string): Promise<void> {
    this.store.delete(id);
  }

  async countByResource(resourceType: string, resourceId: string): Promise<number> {
    let count = 0;
    for (const f of this.store.values()) {
      const data = f.toPersistence();
      if (data.resourceType === resourceType && data.resourceId === resourceId) {
        count++;
      }
    }
    return count;
  }

  async sumSizeByResource(resourceType: string, resourceId: string): Promise<number> {
    let total = 0;
    for (const f of this.store.values()) {
      const data = f.toPersistence();
      if (data.resourceType === resourceType && data.resourceId === resourceId) {
        total += data.size;
      }
    }
    return total;
  }

  clear(): void {
    this.store.clear();
  }
}

export class InMemoryUnitOfWork implements UnitOfWork {
  readonly files: InMemoryFileRepository;

  constructor(files?: InMemoryFileRepository) {
    this.files = files ?? new InMemoryFileRepository();
  }

  async execute<T>(work: (repos: Repositories) => Promise<T>): Promise<T> {
    return work({ files: this.files });
  }

  clear(): void {
    this.files.clear();
  }
}

export class MockStorage implements StoragePort {
  private objects = new Map<string, Buffer>();

  async generatePresignedUploadUrl(_key: string, _contentType: string, _contentLength: number): Promise<PresignedUrlInfo> {
    return { url: 'https://storage.example.com/upload', expiresIn: 3600 };
  }

  async generatePresignedDownloadUrl(_key: string, _expiresIn?: number): Promise<string> {
    return 'https://storage.example.com/download/file';
  }

  async getObject(key: string): Promise<Buffer> {
    const buf = this.objects.get(key);
    if (!buf) throw new Error('Object not found');
    return buf;
  }

  async deleteObject(key: string): Promise<void> {
    this.objects.delete(key);
  }

  async copyObject(_sourceKey: string, _destinationKey: string): Promise<void> {
    // no-op for tests
  }

  async objectExists(key: string): Promise<boolean> {
    return this.objects.has(key);
  }

  addObject(key: string, data: Buffer): void {
    this.objects.set(key, data);
  }

  clear(): void {
    this.objects.clear();
  }
}
