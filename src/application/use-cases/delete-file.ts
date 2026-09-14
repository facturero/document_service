import { FileNotFoundError } from '../../domain/errors';
import { Repositories } from '../../domain/repositories';
import { StoragePort, UnitOfWork } from '../ports';
import { canAccessFile, FileActor } from '../../domain/file-access';

export class DeleteFileUseCase {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly storage: StoragePort,
  ) {}

  async execute(fileId: string, actor?: FileActor): Promise<void> {
    return this.uow.execute(async (repos: Repositories) => {
      const file = await repos.files.findById(fileId);
      if (!file || (actor && !canAccessFile(file, actor))) {
        throw new FileNotFoundError(fileId);
      }

      const deleted = file.markDeleted();
      await repos.files.save(deleted);
      await this.storage.deleteObject(file.storageKey);

      // El asyncapi declaraba estos eventos desde el principio, pero el
      // servicio no publicaba nada: subir o borrar un documento (adjuntos de
      // facturas incluidos) no dejaba rastro en la bitácora.
      const deletedData = deleted.toPersistence();
      await repos.outbox.add({
        type: 'document.file.removed',
        aggregateType: 'file',
        aggregateId: deletedData.id,
        payload: {
          fileId: deletedData.id,
          resourceType: deletedData.resourceType,
          resourceId: deletedData.resourceId,
          category: deletedData.category,
          originalName: deletedData.originalName,
          status: deletedData.status,
        },
        occurredAt: new Date(),
      });

    });
  }
}
