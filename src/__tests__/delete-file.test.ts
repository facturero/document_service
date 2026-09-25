import { describe, it, expect, beforeEach } from 'vitest';
import { DeleteFileUseCase } from '../application/use-cases/delete-file';
import { FileReference } from '../domain/entities';
import { InMemoryUnitOfWork, MockStorage } from './helpers';
import { FileIsImmutableError, FileNotFoundError } from '../domain/errors';

describe('DeleteFileUseCase', () => {
  let uow: InMemoryUnitOfWork;
  let storage: MockStorage;
  let useCase: DeleteFileUseCase;

  beforeEach(() => {
    uow = new InMemoryUnitOfWork();
    storage = new MockStorage();
    useCase = new DeleteFileUseCase(uow, storage);
  });

  it('marks file as deleted and removes from storage', async () => {
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
    storage.addObject('customer/c123/logo.png', Buffer.from('data'));

    await useCase.execute(file.id.value);

    const saved = await uow.files.findById(file.id.value);
    expect(saved!.status.isDeleted()).toBe(true);
  });

  it('throws FileNotFoundError for nonexistent file', async () => {
    await expect(
      useCase.execute('00000000-0000-0000-0000-000000000000'),
    ).rejects.toThrow(FileNotFoundError);
  });

  function confirmedFile(resourceType: string, category: string, mimeType: string, organizationId: string | null = 'org-1') {
    return FileReference.create({
      resourceType,
      resourceId: 'r-1',
      category,
      originalName: 'doc',
      mimeType,
      size: 1024,
      storageKey: `${resourceType}/r-1/doc`,
      storageBucket: 'bucket',
      checksum: '',
      description: null,
      expiresAt: null,
      parentId: null,
      uploadedBy: 'user-1',
      organizationId,
    }).confirm('checksum');
  }

  it.each([
    ['certificado de firma', 'fiscal_certificate', 'certificate', 'application/x-pkcs12'],
    ['XML autorizado por el SRI', 'fiscal_invoice', 'xml', 'application/xml'],
    ['.p12 con otro resourceType', 'customer', 'documento', 'application/x-pkcs12'],
    ['comprobante comercial de billing', 'invoice', 'comprobante', 'application/pdf'],
  ])('no borra un %s y lo deja en el almacenamiento', async (_label, resourceType, category, mimeType) => {
    const file = confirmedFile(resourceType, category, mimeType);
    await uow.files.save(file);
    storage.addObject(file.storageKey, Buffer.from('data'));

    await expect(
      useCase.execute(file.id.value, { userId: 'user-1', organizationId: 'org-1' }),
    ).rejects.toThrow(FileIsImmutableError);

    const saved = await uow.files.findById(file.id.value);
    expect(saved!.status.isDeleted()).toBe(false);
    expect(await storage.objectExists(file.storageKey)).toBe(true);
  });

  it('no borra un archivo fiscal sin organización aunque canAccessFile lo deje pasar', async () => {
    const file = confirmedFile('fiscal_invoice', 'xml', 'application/xml', null);
    await uow.files.save(file);

    await expect(
      useCase.execute(file.id.value, { userId: 'cualquiera', organizationId: 'otra-org' }),
    ).rejects.toThrow(FileIsImmutableError);
  });

  it('sigue borrando un adjunto normal de una factura', async () => {
    const file = confirmedFile('invoice', 'adjunto', 'application/pdf');
    await uow.files.save(file);
    storage.addObject(file.storageKey, Buffer.from('data'));

    await useCase.execute(file.id.value, { userId: 'user-1', organizationId: 'org-1' });

    const saved = await uow.files.findById(file.id.value);
    expect(saved!.status.isDeleted()).toBe(true);
  });
});
