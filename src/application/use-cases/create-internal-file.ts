import { randomUUID, createHash } from 'node:crypto';
import { FileReference } from '../../domain/entities';
import { UnitOfWork, StoragePort } from '../ports';
import { FileResponse } from '../dtos';

function toFileResponseDTO(file: FileReference): FileResponse {
  return {
    id: file.id.value,
    resourceType: file.resourceType,
    resourceId: file.resourceId,
    category: file.category,
    originalName: file.originalName,
    mimeType: file.mimeType,
    size: file.size.bytes,
    checksum: file.checksum,
    status: file.status.value,
    description: file.description,
    expiresAt: file.expiresAt ? file.expiresAt.toISOString() : null,
    parentId: file.parentId,
    uploadedBy: file.uploadedBy,
    createdAt: file.createdAt.toISOString(),
    updatedAt: file.updatedAt.toISOString(),
  };
}

export class CreateInternalFileUseCase {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly storage: StoragePort,
    private readonly storageBucket: string,
  ) {}

  async execute(input: {
    resourceType: string;
    resourceId: string;
    category: string;
    originalName: string;
    mimeType: string;
    uploadedBy: string;
    /** Organización dueña; los servicios la mandan para que la descarga quede acotada a ella. */
    organizationId?: string | null;
    buffer: Buffer;
  }): Promise<FileResponse> {
    return this.uow.execute(async (repos) => {
      const storageKey = `${input.resourceType}/${input.resourceId}/${randomUUID()}-${input.originalName}`;
      const checksum = createHash('sha256').update(input.buffer).digest('hex');

      await this.storage.putObjectDirect(storageKey, input.buffer, input.mimeType);

      let file = FileReference.create({
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        category: input.category.toLowerCase(),
        originalName: input.originalName,
        mimeType: input.mimeType,
        size: input.buffer.length,
        storageKey,
        storageBucket: this.storageBucket,
        checksum: '',
        description: null,
        expiresAt: null,
        parentId: null,
        uploadedBy: input.uploadedBy,
        organizationId: input.organizationId ?? null,
      });
      file = file.confirm(checksum);

      await repos.files.save(file);

      // El asyncapi declaraba estos eventos desde el principio, pero el
      // servicio no publicaba nada: subir o borrar un documento (adjuntos de
      // facturas incluidos) no dejaba rastro en la bitácora.
      const fileData = file.toPersistence();
      await repos.outbox.add({
        type: 'document.file.attached',
        aggregateType: 'file',
        aggregateId: fileData.id,
        payload: {
          fileId: fileData.id,
          resourceType: fileData.resourceType,
          resourceId: fileData.resourceId,
          category: fileData.category,
          originalName: fileData.originalName,
          status: fileData.status,
        },
        occurredAt: new Date(),
      });

      return toFileResponseDTO(file);
    });
  }
}
