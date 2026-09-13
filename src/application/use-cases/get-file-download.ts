import { FileNotFoundError, FileIsQuarantinedError } from '../../domain/errors';
import { Repositories } from '../../domain/repositories';
import { StoragePort } from '../ports';

export interface DownloadResult {
  url: string;
  originalName: string;
  mimeType: string;
}

/**
 * Archivos que no pueden salir por la descarga pública.
 *
 * `GET /files/:id/download` es pública en el gateway porque la interfaz pinta
 * imágenes con `<img src>`, sin token. Eso está bien para un logo, no para la
 * firma electrónica de una empresa ni para sus comprobantes fiscales: con solo
 * el id se obtenía un enlace firmado al .p12. Ninguno de estos se descarga por
 * aquí legítimamente: fiscal-ecuador los lee por `/files/:id/content` (interna)
 * y el XML llega al usuario por `/fiscal-invoices/:id/xml/download`, con permiso.
 */
const PRIVATE_RESOURCE_TYPES = new Set(['fiscal_certificate', 'fiscal_invoice']);
const PRIVATE_MIME_TYPES = new Set(['application/x-pkcs12']);

export function isPrivateFile(file: { resourceType: string; mimeType: string }): boolean {
  return PRIVATE_RESOURCE_TYPES.has(file.resourceType) || PRIVATE_MIME_TYPES.has(file.mimeType);
}

export class GetFileDownloadUseCase {
  constructor(
    private readonly repos: Repositories,
    private readonly storage: StoragePort,
  ) {}

  async execute(fileId: string): Promise<DownloadResult> {
    const file = await this.repos.files.findById(fileId);
    // Un archivo privado responde igual que uno inexistente: no se confirma que exista.
    if (!file || isPrivateFile(file)) {
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
