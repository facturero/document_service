import { describe, it, expect, beforeEach } from 'vitest';
import { ConfirmFileUploadUseCase } from '../application/use-cases/confirm-file-upload';
import { FileReference } from '../domain/entities';
import { InMemoryUnitOfWork } from './helpers';
import { FileNotFoundError } from '../domain/errors';

describe('ConfirmFileUploadUseCase', () => {
  let uow: InMemoryUnitOfWork;
  let useCase: ConfirmFileUploadUseCase;

  beforeEach(() => {
    uow = new InMemoryUnitOfWork();
    useCase = new ConfirmFileUploadUseCase(uow);
  });

  it('confirms a pending file with checksum', async () => {
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

    const result = await useCase.execute({ fileId: file.id.value, checksum: 'abc123' });

    expect(result.status).toBe('confirmed');
    expect(result.checksum).toBe('abc123');
  });

  it('throws FileNotFoundError for nonexistent file', async () => {
    await expect(
      useCase.execute({ fileId: '00000000-0000-0000-0000-000000000000', checksum: 'abc' }),
    ).rejects.toThrow(FileNotFoundError);
  });

  it('returns current state if file is not pending (idempotent)', async () => {
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
    const confirmed = file.confirm('original-checksum');
    await uow.files.save(confirmed);

    const result = await useCase.execute({ fileId: file.id.value, checksum: 'new-checksum' });

    expect(result.status).toBe('confirmed');
    expect(result.checksum).toBe('original-checksum');
  });
});
