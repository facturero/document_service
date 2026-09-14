import { FileNotFoundError } from '../../domain/errors';
import { Repositories } from '../../domain/repositories';
import { UnitOfWork } from '../ports';
import { ConfirmFileUploadInput, FileResponse } from '../dtos';
import { canAccessFile, FileActor } from '../../domain/file-access';

export class ConfirmFileUploadUseCase {
  constructor(
    private readonly uow: UnitOfWork,
  ) {}

  async execute(input: ConfirmFileUploadInput, actor?: FileActor): Promise<FileResponse> {
    return this.uow.execute(async (repos: Repositories) => {
      const file = await repos.files.findById(input.fileId);
      if (!file || (actor && !canAccessFile(file, actor))) {
        throw new FileNotFoundError(input.fileId);
      }

      if (!file.status.isPending()) {
        return this.toResponse(file);
      }

      const confirmed = file.confirm(input.checksum);
      await repos.files.save(confirmed);

      // El asyncapi declaraba estos eventos desde el principio, pero el
      // servicio no publicaba nada: subir o borrar un documento (adjuntos de
      // facturas incluidos) no dejaba rastro en la bitácora.
      const confirmedData = confirmed.toPersistence();
      await repos.outbox.add({
        type: 'document.file.attached',
        aggregateType: 'file',
        aggregateId: confirmedData.id,
        payload: {
          fileId: confirmedData.id,
          resourceType: confirmedData.resourceType,
          resourceId: confirmedData.resourceId,
          category: confirmedData.category,
          originalName: confirmedData.originalName,
          status: confirmedData.status,
        },
        occurredAt: new Date(),
      });


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
