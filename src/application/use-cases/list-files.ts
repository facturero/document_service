import { Repositories } from '../../domain/repositories';
import { FileListResponse, FileResponse } from '../dtos';

export class ListFilesUseCase {
  constructor(private readonly repos: Repositories) {}

  async execute(resourceType: string, resourceId: string, category?: string): Promise<FileListResponse> {
    const files = await this.repos.files.findByResource(resourceType, resourceId, category);
    return {
      files: files.map(this.toResponse),
      total: files.length,
    };
  }

  private toResponse(file: import('../../domain/entities').FileReference): FileResponse {
    const data = file.toPersistence();
    return {
      id: data.id,
      resourceType: data.resourceType,
      resourceId: data.resourceId,
      category: data.category,
      originalName: data.originalName,
      mimeType: data.mimeType,
      size: data.size,
      checksum: data.checksum,
      status: data.status,
      description: data.description,
      expiresAt: data.expiresAt?.toISOString() ?? null,
      parentId: data.parentId,
      uploadedBy: data.uploadedBy,
      createdAt: data.createdAt.toISOString(),
      updatedAt: data.updatedAt.toISOString(),
    };
  }
}
