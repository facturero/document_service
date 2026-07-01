import { FileNotFoundError } from '../../domain/errors';
import { Repositories } from '../../domain/repositories';
import { StoragePort, UnitOfWork } from '../ports';
import { ConfirmFileUploadInput, FileResponse } from '../dtos';

export class ConfirmFileUploadUseCase {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly storage: StoragePort,
  ) {}

  async execute(input: ConfirmFileUploadInput): Promise<FileResponse> {
    return this.uow.execute(async (repos: Repositories) => {
      const file = await repos.files.findById(input.fileId);
      if (!file) {
        throw new FileNotFoundError(input.fileId);
      }

      if (!file.status.isPending()) {
        return this.toResponse(file);
      }

      const confirmed = file.confirm(input.checksum);
      await repos.files.save(confirmed);

      return this.toResponse(confirmed);
    });
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
