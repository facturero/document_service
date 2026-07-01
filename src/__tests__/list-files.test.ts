import { describe, it, expect, beforeEach } from 'vitest';
import { ListFilesUseCase } from '../application/use-cases/list-files';
import { FileReference } from '../domain/entities';
import { InMemoryUnitOfWork } from './helpers';

describe('ListFilesUseCase', () => {
  let uow: InMemoryUnitOfWork;
  let useCase: ListFilesUseCase;

  beforeEach(() => {
    uow = new InMemoryUnitOfWork();
    useCase = new ListFilesUseCase({ files: uow.files });
  });

  it('returns empty list when no files exist', async () => {
    const result = await useCase.execute('customer', 'c123');
    expect(result.files).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  it('returns all files for a resource', async () => {
    for (let i = 0; i < 3; i++) {
      const file = FileReference.create({
        resourceType: 'customer',
        resourceId: 'c123',
        category: 'logo',
        originalName: `logo${i}.png`,
        mimeType: 'image/png',
        size: 1024,
        storageKey: `key${i}`,
        storageBucket: 'bucket',
        checksum: '',
        description: null,
        expiresAt: null,
        parentId: null,
        uploadedBy: 'user-1',
      });
      await uow.files.save(file);
    }

    const result = await useCase.execute('customer', 'c123');
    expect(result.total).toBe(3);
    expect(result.files).toHaveLength(3);
  });

  it('filters by category', async () => {
    const logo = FileReference.create({
      resourceType: 'customer',
      resourceId: 'c123',
      category: 'logo',
      originalName: 'logo.png',
      mimeType: 'image/png',
      size: 1024,
      storageKey: 'key1',
      storageBucket: 'bucket',
      checksum: '',
      description: null,
      expiresAt: null,
      parentId: null,
      uploadedBy: 'user-1',
    });
    await uow.files.save(logo);

    const doc = FileReference.create({
      resourceType: 'customer',
      resourceId: 'c123',
      category: 'document',
      originalName: 'doc.pdf',
      mimeType: 'application/pdf',
      size: 2048,
      storageKey: 'key2',
      storageBucket: 'bucket',
      checksum: '',
      description: null,
      expiresAt: null,
      parentId: null,
      uploadedBy: 'user-1',
    });
    await uow.files.save(doc);

    const logos = await useCase.execute('customer', 'c123', 'logo');
    expect(logos.total).toBe(1);
    expect(logos.files[0].originalName).toBe('logo.png');

    const docs = await useCase.execute('customer', 'c123', 'document');
    expect(docs.total).toBe(1);
    expect(docs.files[0].originalName).toBe('doc.pdf');
  });

  it('does not include files from other resources', async () => {
    const file1 = FileReference.create({
      resourceType: 'customer',
      resourceId: 'c123',
      category: 'logo',
      originalName: 'logo.png',
      mimeType: 'image/png',
      size: 1024,
      storageKey: 'key',
      storageBucket: 'bucket',
      checksum: '',
      description: null,
      expiresAt: null,
      parentId: null,
      uploadedBy: 'user-1',
    });
    await uow.files.save(file1);

    const file2 = FileReference.create({
      resourceType: 'invoice',
      resourceId: 'inv-001',
      category: 'comprobante',
      originalName: 'factura.xml',
      mimeType: 'application/xml',
      size: 50000,
      storageKey: 'key2',
      storageBucket: 'bucket',
      checksum: '',
      description: null,
      expiresAt: null,
      parentId: null,
      uploadedBy: 'user-1',
    });
    await uow.files.save(file2);

    const customers = await useCase.execute('customer', 'c123');
    expect(customers.total).toBe(1);

    const invoices = await useCase.execute('invoice', 'inv-001');
    expect(invoices.total).toBe(1);
  });
});
