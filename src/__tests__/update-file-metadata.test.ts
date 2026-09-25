import { describe, it, expect, beforeEach } from 'vitest';
import { UpdateFileMetadataUseCase } from '../application/use-cases/update-file-metadata';
import { FileReference } from '../domain/entities';
import { InMemoryUnitOfWork } from './helpers';
import { FileIsImmutableError, FileNotFoundError } from '../domain/errors';

describe('UpdateFileMetadataUseCase', () => {
  let uow: InMemoryUnitOfWork;
  let useCase: UpdateFileMetadataUseCase;

  beforeEach(() => {
    uow = new InMemoryUnitOfWork();
    useCase = new UpdateFileMetadataUseCase(uow);
  });

  it('updates description', async () => {
    const file = FileReference.create({
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
    await uow.files.save(file);

    const result = await useCase.execute(file.id.value, { description: 'Updated desc' });
    expect(result.description).toBe('Updated desc');
  });

  it('updates category', async () => {
    const file = FileReference.create({
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
    await uow.files.save(file);

    const result = await useCase.execute(file.id.value, { category: 'foto' });
    expect(result.category).toBe('foto');
  });

  it('sets and clears expiresAt', async () => {
    const file = FileReference.create({
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
    await uow.files.save(file);

    const withExpiry = await useCase.execute(file.id.value, { expiresAt: '2027-12-31T23:59:59Z' });
    expect(withExpiry.expiresAt).toBeTruthy();

    const cleared = await useCase.execute(file.id.value, { expiresAt: null });
    expect(cleared.expiresAt).toBeNull();
  });

  it('throws FileNotFoundError for nonexistent file', async () => {
    await expect(
      useCase.execute('00000000-0000-0000-0000-000000000000', { description: 'test' }),
    ).rejects.toThrow(FileNotFoundError);
  });

  it('no deja cambiar la categoría de un XML fiscal (sería la vía para luego borrarlo)', async () => {
    const file = FileReference.create({
      resourceType: 'fiscal_invoice',
      resourceId: 'fi-1',
      category: 'xml',
      originalName: 'autorizado.xml',
      mimeType: 'application/xml',
      size: 1024,
      storageKey: 'key',
      storageBucket: 'bucket',
      checksum: '',
      description: null,
      expiresAt: null,
      parentId: null,
      uploadedBy: 'user-1',
      organizationId: 'org-1',
    });
    await uow.files.save(file);

    await expect(
      useCase.execute(file.id.value, { category: 'otra' }, { userId: 'user-1', organizationId: 'org-1' }),
    ).rejects.toThrow(FileIsImmutableError);

    const saved = await uow.files.findById(file.id.value);
    expect(saved!.category).toBe('xml');
  });
});
