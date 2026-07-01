import { FileNotFoundError } from '../../domain/errors';
import { Repositories } from '../../domain/repositories';
import { FileResponse } from '../dtos';

export class GetFileUseCase {
  constructor(private readonly repos: Repositories) {}

  async execute(fileId: string): Promise<FileResponse> {
    const file = await this.repos.files.findById(fileId);
    if (!file) {
      throw new FileNotFoundError(fileId);
    }
    return this.toResponse(file);
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
