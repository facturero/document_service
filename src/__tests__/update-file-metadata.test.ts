import { describe, it, expect, beforeEach } from 'vitest';
import { UpdateFileMetadataUseCase } from '../application/use-cases/update-file-metadata';
import { FileReference } from '../domain/entities';
import { InMemoryUnitOfWork } from './helpers';
import { FileNotFoundError } from '../domain/errors';

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
});
