import { describe, it, expect, beforeEach } from 'vitest';
import { GetFileDownloadUseCase } from '../application/use-cases/get-file-download';
import { FileReference } from '../domain/entities';
import { InMemoryUnitOfWork, MockStorage , readOnlyRepositories } from './helpers';
import { FileNotFoundError, FileIsQuarantinedError } from '../domain/errors';

describe('GetFileDownloadUseCase', () => {
  let uow: InMemoryUnitOfWork;
  let storage: MockStorage;
  let useCase: GetFileDownloadUseCase;

  beforeEach(() => {
    uow = new InMemoryUnitOfWork();
    storage = new MockStorage();
    useCase = new GetFileDownloadUseCase(readOnlyRepositories(uow.files), storage);
  });

  it('returns download URL for confirmed file', async () => {
    const file = FileReference.create({
      resourceType: 'customer',
      resourceId: 'c123',
      category: 'logo',
      originalName: 'logo.png',
      mimeType: 'image/png',
      size: 1024,
      storageKey: 'customer/c123/logo.png',
      storageBucket: 'bucket',
      checksum: '',
      description: null,
      expiresAt: null,
      parentId: null,
      uploadedBy: 'user-1',
    });
    const confirmed = file.confirm('checksum');
    await uow.files.save(confirmed);

    const result = await useCase.execute(file.id.value);

    expect(result.url).toBeTruthy();
    expect(result.originalName).toBe('logo.png');
    expect(result.mimeType).toBe('image/png');
  });

  it('throws FileNotFoundError for nonexistent file', async () => {
    await expect(
      useCase.execute('00000000-0000-0000-0000-000000000000'),
    ).rejects.toThrow(FileNotFoundError);
  });

  it('throws FileIsQuarantinedError for quarantined file', async () => {
    const file = FileReference.create({
      resourceType: 'customer',
      resourceId: 'c123',
      category: 'logo',
      originalName: 'malware.exe',
      mimeType: 'application/x-msdownload',
      size: 1024,
      storageKey: 'key',
      storageBucket: 'bucket',
      checksum: '',
      description: null,
      expiresAt: null,
      parentId: null,
      uploadedBy: 'user-1',
    });
    const quarantined = file.quarantine();
    await uow.files.save(quarantined);

    await expect(
      useCase.execute(file.id.value),
    ).rejects.toThrow(FileIsQuarantinedError);
  });

  /**
   * La ruta es pública (la interfaz pinta imágenes con <img src> sin token). Los
   * archivos fiscales no pueden salir por aquí: con solo el id se obtenía un
   * enlace firmado al .p12 de la firma electrónica de una empresa.
   */
  describe('archivos fiscales', () => {
    const fiscalFile = (resourceType: string, mimeType: string) => FileReference.create({
      resourceType, resourceId: 'org-1', category: 'certificado', originalName: 'firma.p12', mimeType,
      size: 1, storageKey: `${resourceType}/firma`, storageBucket: 'bucket', checksum: '',
      description: null, expiresAt: null, parentId: null, uploadedBy: 'fiscal-ecuador',
    });

    it.each([
      ['un certificado de firma', 'fiscal_certificate', 'application/x-pkcs12'],
      ['un comprobante fiscal', 'fiscal_invoice', 'application/xml'],
      ['un .p12 con cualquier tipo de recurso', 'customer', 'application/x-pkcs12'],
    ])('%s no sale por la descarga pública y responde como si no existiera', async (_name, resourceType, mimeType) => {
      const file = fiscalFile(resourceType, mimeType);
      await uow.files.save(file.confirm('checksum'));

      await expect(useCase.execute(file.id.value)).rejects.toThrow(FileNotFoundError);
    });
  });
});
