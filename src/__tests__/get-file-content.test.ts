import { describe, it, expect, beforeEach } from 'vitest';
import { GetFileContentUseCase } from '../application/use-cases/get-file-content';
import { FileReference } from '../domain/entities';
import { FileNotFoundError } from '../domain/errors';
import { InMemoryUnitOfWork, MockStorage, readOnlyRepositories } from './helpers';

describe('GetFileContentUseCase', () => {
  let uow: InMemoryUnitOfWork;
  let storage: MockStorage;
  let useCase: GetFileContentUseCase;

  beforeEach(() => {
    uow = new InMemoryUnitOfWork();
    storage = new MockStorage();
    useCase = new GetFileContentUseCase(readOnlyRepositories(uow.files), storage);
  });

  it('devuelve los bytes del almacenamiento, no una URL a la que redirigir', async () => {
    const file = FileReference.create({
      resourceType: 'fiscal_certificate',
      resourceId: 'org-1',
      category: 'certificado',
      originalName: 'firma.p12',
      mimeType: 'application/x-pkcs12',
      size: 4,
      storageKey: 'fiscal_certificate/org-1/firma.p12',
      storageBucket: 'bucket',
      checksum: '',
      description: null,
      expiresAt: null,
      parentId: null,
      uploadedBy: 'fiscal-ecuador',
    });
    await uow.files.save(file);
    await storage.putObjectDirect(file.storageKey, Buffer.from([1, 2, 3, 4]), 'application/x-pkcs12');

    const result = await useCase.execute(file.id.value);

    expect([...result.buffer]).toEqual([1, 2, 3, 4]);
    expect(result.mimeType).toBe('application/x-pkcs12');
    expect(result.originalName).toBe('firma.p12');
  });

  it('un archivo inexistente es FileNotFoundError', async () => {
    await expect(useCase.execute('00000000-0000-0000-0000-000000000000')).rejects.toThrow(FileNotFoundError);
  });
});
