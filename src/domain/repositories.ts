import { FileReference } from './entities';

export interface FileReferenceRepository {
  findById(id: string): Promise<FileReference | null>;
  findByResource(resourceType: string, resourceId: string, category?: string): Promise<FileReference[]>;
  findByParentId(parentId: string): Promise<FileReference[]>;
  findExpired(): Promise<FileReference[]>;
  save(file: FileReference): Promise<void>;
  delete(id: string): Promise<void>;
  countByResource(resourceType: string, resourceId: string): Promise<number>;
  sumSizeByResource(resourceType: string, resourceId: string): Promise<number>;
}

export interface Repositories {
  files: FileReferenceRepository;
}
