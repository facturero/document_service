import { FileNotFoundError, FileIsQuarantinedError } from '../../domain/errors';
import { Repositories } from '../../domain/repositories';
import { StoragePort } from '../ports';

export interface DownloadResult {
  url: string;
  originalName: string;
  mimeType: string;
}

export class GetFileDownloadUseCase {
  constructor(
    private readonly repos: Repositories,
    private readonly storage: StoragePort,
  ) {}

  async execute(fileId: string): Promise<DownloadResult> {
    const file = await this.repos.files.findById(fileId);
    if (!file) {
      throw new FileNotFoundError(fileId);
    }
    if (file.status.isQuarantined()) {
      throw new FileIsQuarantinedError(fileId);
    }

    const url = await this.storage.generatePresignedDownloadUrl(file.storageKey);

    return {
      url,
      originalName: file.originalName,
      mimeType: file.mimeType,
    };
  }
}
