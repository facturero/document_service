import { describe, it, expect, beforeEach } from 'vitest';
import { ConfirmFileUploadUseCase } from '../application/use-cases/confirm-file-upload';
import { UpdateFileMetadataUseCase } from '../application/use-cases/update-file-metadata';
import { DeleteFileUseCase } from '../application/use-cases/delete-file';
import { FileReference } from '../domain/entities';
import { InMemoryUnitOfWork, MockStorage } from './helpers';

/**
 * Este servicio no publicaba NADA: su `asyncapi.yaml` declaraba
 * `document.file.attached` y `document.file.removed` desde el principio, pero
 * no había ni outbox ni relay, así que subir o borrar un documento no dejaba
 * rastro en la bitácora de auditoría. Estos tests fijan el contrato para que no
 * vuelva a perderse en silencio.
 */
function pendingFile(): FileReference {
  return FileReference.create({
    resourceType: 'invoice',
    resourceId: 'inv-1',
    category: 'attachment',
    originalName: 'contrato.pdf',
    mimeType: 'application/pdf',
    size: 2048,
    storageKey: 'invoices/inv-1/contrato.pdf',
    storageBucket: 'cmr-documents',
    checksum: '',
    description: null,
    expiresAt: null,
    parentId: null,
    uploadedBy: 'user-1',
  });
}

describe('eventos de auditoría de document-service', () => {
  let uow: InMemoryUnitOfWork;

  beforeEach(() => {
    uow = new InMemoryUnitOfWork();
  });

  it('confirmar la subida emite document.file.attached', async () => {
    const file = pendingFile();
    await uow.files.save(file);

    await new ConfirmFileUploadUseCase(uow).execute({
      fileId: file.id.value,
      checksum: 'abc123',
    });

    expect(uow.events).toHaveLength(1);
    const [event] = uow.events;
    expect(event.type).toBe('document.file.attached');
    expect(event.aggregateType).toBe('file');
    expect(event.aggregateId).toBe(file.id.value);
    expect(event.payload).toMatchObject({
      fileId: file.id.value,
      resourceType: 'invoice',
      resourceId: 'inv-1',
      originalName: 'contrato.pdf',
      status: 'confirmed',
    });
  });

  it('editar los metadatos emite document.file.metadata_updated', async () => {
    const file = pendingFile();
    await uow.files.save(file);

    await new UpdateFileMetadataUseCase(uow).execute(file.id.value, {
      description: 'contrato firmado',
    });

    expect(uow.events.map((e) => e.type)).toEqual(['document.file.metadata_updated']);
  });

  it('borrar emite document.file.removed', async () => {
    const file = pendingFile();
    await uow.files.save(file);

    await new DeleteFileUseCase(uow, new MockStorage()).execute(file.id.value);

    expect(uow.events.map((e) => e.type)).toEqual(['document.file.removed']);
    expect(uow.events[0].payload).toMatchObject({ fileId: file.id.value, status: 'deleted' });
  });

  it('un fichero ya confirmado no vuelve a emitir al reconfirmar', async () => {
    const file = pendingFile();
    await uow.files.save(file);
    const useCase = new ConfirmFileUploadUseCase(uow);

    await useCase.execute({ fileId: file.id.value, checksum: 'abc123' });
    await useCase.execute({ fileId: file.id.value, checksum: 'abc123' });

    // El caso de uso sale antes si ya no está pendiente: una sola fila de
    // auditoría, no una por reintento del cliente.
    expect(uow.events).toHaveLength(1);
  });
});
