import { FileNotFoundError, FileIsQuarantinedError } from '../../domain/errors';
import { Repositories } from '../../domain/repositories';
import { StoragePort } from '../ports';

export interface FileContent {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
}

/**
 * Los bytes de un archivo, para otros servicios del clúster.
 *
 * `GetFileDownloadUseCase` devuelve una URL prefirmada del almacenamiento que
 * apunta al endpoint PÚBLICO (S3_PUBLIC_ENDPOINT), pensada para el navegador.
 * Un servicio interno que la sigue no llega: dentro de un contenedor
 * `localhost:9000` no es MinIO. Así fiscal-ecuador nunca podía leer el .p12
 * para firmar ("fetch failed"). Esto lee directo del almacenamiento.
 */
export class GetFileContentUseCase {
  constructor(
    private readonly repos: Repositories,
    private readonly storage: StoragePort,
  ) {}

  async execute(fileId: string): Promise<FileContent> {
    const file = await this.repos.files.findById(fileId);
    if (!file) {
      throw new FileNotFoundError(fileId);
    }
    if (file.status.isQuarantined()) {
      throw new FileIsQuarantinedError(fileId);
    }

    return {
      buffer: await this.storage.getObject(file.storageKey),
      originalName: file.originalName,
      mimeType: file.mimeType,
    };
  }
}
