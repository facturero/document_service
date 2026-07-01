import { describe, it, expect, beforeEach } from 'vitest';
import { GetFileUseCase } from '../application/use-cases/get-file';
import { FileReference } from '../domain/entities';
import { InMemoryUnitOfWork } from './helpers';
import { FileNotFoundError } from '../domain/errors';

describe('GetFileUseCase', () => {
  let uow: InMemoryUnitOfWork;
  let useCase: GetFileUseCase;

  beforeEach(() => {
    uow = new InMemoryUnitOfWork();
    useCase = new GetFileUseCase({ files: uow.files });
  });

  it('returns file metadata by id', async () => {
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
      description: 'Logo',
      expiresAt: null,
      parentId: null,
      uploadedBy: 'user-1',
    });
    await uow.files.save(file);

    const result = await useCase.execute(file.id.value);

    expect(result.id).toBe(file.id.value);
    expect(result.originalName).toBe('logo.png');
    expect(result.description).toBe('Logo');
    expect(result.status).toBe('pending');
  });

  it('throws FileNotFoundError for nonexistent file', async () => {
    await expect(
      useCase.execute('00000000-0000-0000-0000-000000000000'),
    ).rejects.toThrow(FileNotFoundError);
  });
});
