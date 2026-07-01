import { FileNotFoundError } from '../../domain/errors';
import { Repositories } from '../../domain/repositories';
import { StoragePort, UnitOfWork } from '../ports';

export class DeleteFileUseCase {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly storage: StoragePort,
  ) {}

  async execute(fileId: string): Promise<void> {
    return this.uow.execute(async (repos: Repositories) => {
      const file = await repos.files.findById(fileId);
      if (!file) {
        throw new FileNotFoundError(fileId);
      }

      const deleted = file.markDeleted();
      await repos.files.save(deleted);
      await this.storage.deleteObject(file.storageKey);
    });
  }
}
