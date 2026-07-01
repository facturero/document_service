import { describe, it, expect, beforeEach } from 'vitest';
import { DeleteFileUseCase } from '../application/use-cases/delete-file';
import { FileReference } from '../domain/entities';
import { InMemoryUnitOfWork, MockStorage } from './helpers';
import { FileNotFoundError } from '../domain/errors';

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
});
