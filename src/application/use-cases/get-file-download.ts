import { FileNotFoundError, FileIsQuarantinedError } from '../../domain/errors';
import { Repositories } from '../../domain/repositories';
import { StoragePort } from '../ports';
import { canAccessFile, FileActor, isPrivateFile } from '../../domain/file-access';

export interface DownloadResult {
  url: string;
  originalName: string;
  mimeType: string;
}

// `GET /files/:id/download` era pública en el gateway porque la interfaz pinta
// imágenes con `<img src>`, sin token: con solo el id se obtenía un enlace
// firmado al .p12. Los archivos privados nunca salen por aquí (ver isPrivateFile).

export class GetFileDownloadUseCase {
  constructor(
    private readonly repos: Repositories,
    private readonly storage: StoragePort,
  ) {}

  async execute(fileId: string, actor?: FileActor): Promise<DownloadResult> {
    const file = await this.repos.files.findById(fileId);
    // Un archivo privado, o de otra organización, responde igual que uno
    // inexistente: no se confirma que exista.
    if (!file || isPrivateFile(file) || (actor && !canAccessFile(file, actor))) {
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
