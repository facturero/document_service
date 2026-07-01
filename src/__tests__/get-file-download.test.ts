import { describe, it, expect, beforeEach } from 'vitest';
import { GetFileDownloadUseCase } from '../application/use-cases/get-file-download';
import { FileReference } from '../domain/entities';
import { InMemoryUnitOfWork, MockStorage } from './helpers';
import { FileNotFoundError, FileIsQuarantinedError } from '../domain/errors';

describe('GetFileDownloadUseCase', () => {
  let uow: InMemoryUnitOfWork;
  let storage: MockStorage;
  let useCase: GetFileDownloadUseCase;

  beforeEach(() => {
    uow = new InMemoryUnitOfWork();
    storage = new MockStorage();
    useCase = new GetFileDownloadUseCase({ files: uow.files }, storage);
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
});
