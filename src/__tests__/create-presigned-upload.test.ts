import { describe, it, expect, beforeEach } from 'vitest';
import { CreatePresignedUploadUseCase } from '../application/use-cases/create-presigned-upload';
import { InMemoryUnitOfWork, MockStorage } from './helpers';

describe('CreatePresignedUploadUseCase', () => {
  let uow: InMemoryUnitOfWork;
  let storage: MockStorage;
  let useCase: CreatePresignedUploadUseCase;

  beforeEach(() => {
    uow = new InMemoryUnitOfWork();
    storage = new MockStorage();
    useCase = new CreatePresignedUploadUseCase(uow, storage, 'cmr-documents');
  });

  it('creates a pending file record and returns presigned URL', async () => {
    const result = await useCase.execute({
      resourceType: 'customer',
      resourceId: 'c123',
      category: 'logo',
      originalName: 'logo.png',
      mimeType: 'image/png',
      size: 1024,
      uploadedBy: 'user-1',
    });

    expect(result.fileId).toBeTruthy();
    expect(result.presignedUrl).toBe('https://storage.example.com/upload');
    expect(result.expiresIn).toBe(3600);
  });

  it('persists the file reference', async () => {
    const result = await useCase.execute({
      resourceType: 'customer',
      resourceId: 'c123',
      category: 'logo',
      originalName: 'logo.png',
      mimeType: 'image/png',
      size: 1024,
      uploadedBy: 'user-1',
    });

    const saved = await uow.files.findById(result.fileId);
    expect(saved).not.toBeNull();
    expect(saved!.originalName).toBe('logo.png');
    expect(saved!.status.isPending()).toBe(true);
    expect(saved!.storageBucket).toBe('cmr-documents');
  });

  it('normalizes category to lowercase', async () => {
    const result = await useCase.execute({
      resourceType: 'customer',
      resourceId: 'c123',
      category: 'LOGO',
      originalName: 'logo.png',
      mimeType: 'image/png',
      size: 1024,
      uploadedBy: 'user-1',
    });

    const saved = await uow.files.findById(result.fileId);
    expect(saved!.category).toBe('logo');
  });

  it('accepts optional fields', async () => {
    const result = await useCase.execute({
      resourceType: 'customer',
      resourceId: 'c123',
      category: 'logo',
      originalName: 'logo.png',
      mimeType: 'image/png',
      size: 1024,
      description: 'Logo oficial',
      expiresAt: '2027-12-31T23:59:59Z',
      uploadedBy: 'user-1',
    });

    const saved = await uow.files.findById(result.fileId);
    expect(saved!.description).toBe('Logo oficial');
    expect(saved!.expiresAt).toBeInstanceOf(Date);
    expect(saved!.expiresAt!.toISOString()).toBe('2027-12-31T23:59:59.000Z');
  });

  it('generates a storage key with resource prefix', async () => {
    const result = await useCase.execute({
      resourceType: 'invoice',
      resourceId: 'inv-001',
      category: 'comprobante',
      originalName: 'factura.xml',
      mimeType: 'application/xml',
      size: 50000,
      uploadedBy: 'user-1',
    });

    const saved = await uow.files.findById(result.fileId);
    expect(saved!.storageKey).toMatch(/^invoice\/inv-001\//);
    expect(saved!.storageKey).toContain('factura.xml');
  });
});
