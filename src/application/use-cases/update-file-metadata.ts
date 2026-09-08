import { FileNotFoundError } from '../../domain/errors';
import { Repositories } from '../../domain/repositories';
import { UnitOfWork } from '../ports';
import { UpdateFileMetadataInput, FileResponse } from '../dtos';

export class UpdateFileMetadataUseCase {
  constructor(
    private readonly uow: UnitOfWork,
  ) {}

  async execute(fileId: string, input: UpdateFileMetadataInput): Promise<FileResponse> {
    return this.uow.execute(async (repos: Repositories) => {
      const file = await repos.files.findById(fileId);
      if (!file) {
        throw new FileNotFoundError(fileId);
      }

      const updated = file.updateMetadata({
        description: input.description,
        category: input.category,
        expiresAt: input.expiresAt !== undefined ? (input.expiresAt ? new Date(input.expiresAt) : null) : undefined,
      });

      await repos.files.save(updated);

      // El asyncapi declaraba estos eventos desde el principio, pero el
      // servicio no publicaba nada: subir o borrar un documento (adjuntos de
      // facturas incluidos) no dejaba rastro en la bitácora.
      const updatedData = updated.toPersistence();
      await repos.outbox.add({
        type: 'document.file.metadata_updated',
        aggregateType: 'file',
        aggregateId: updatedData.id,
        payload: {
          fileId: updatedData.id,
          resourceType: updatedData.resourceType,
          resourceId: updatedData.resourceId,
          category: updatedData.category,
          originalName: updatedData.originalName,
          status: updatedData.status,
        },
        occurredAt: new Date(),
      });


      return this.toResponse(updated);
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
