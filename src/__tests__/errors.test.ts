import { describe, it, expect } from 'vitest';
import {
  AppError,
  ValidationError,
  InvalidFileIdError,
  InvalidFileStatusError,
  InvalidFileSizeError,
  FileTooLargeError,
  FileNotFoundError,
  FileAlreadyConfirmedError,
  FileIsQuarantinedError,
  UnauthorizedError,
  ForbiddenError,
  StorageError,
  AntivirusError,
  ImageProcessingError,
  QuotaExceededError,
} from '../domain/errors';

describe('AppError', () => {
  it('is abstract but can be instantiated via subclass', () => {
    const err = new ValidationError('test');
    expect(err).toBeInstanceOf(AppError);
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('ValidationError');
    expect(err.message).toBe('test');
  });

  it('carries optional details', () => {
    const err = new ValidationError('test', { field: 'email' });
    expect(err.details).toEqual({ field: 'email' });
  });
});

describe('Specific errors', () => {
  const table = [
    { name: 'ValidationError', instance: new ValidationError('msg'), code: 'VALIDATION_ERROR', status: 400 },
    { name: 'InvalidFileIdError', instance: new InvalidFileIdError('bad-id'), code: 'INVALID_FILE_ID', status: 400 },
    { name: 'InvalidFileStatusError', instance: new InvalidFileStatusError('bad-status'), code: 'INVALID_FILE_STATUS', status: 400 },
    { name: 'InvalidFileSizeError', instance: new InvalidFileSizeError(-1), code: 'INVALID_FILE_SIZE', status: 400 },
    { name: 'FileTooLargeError', instance: new FileTooLargeError(9999, 1000), code: 'FILE_TOO_LARGE', status: 413 },
    { name: 'FileNotFoundError', instance: new FileNotFoundError('id-123'), code: 'FILE_NOT_FOUND', status: 404 },
    { name: 'FileAlreadyConfirmedError', instance: new FileAlreadyConfirmedError('id-123'), code: 'FILE_ALREADY_CONFIRMED', status: 409 },
    { name: 'FileIsQuarantinedError', instance: new FileIsQuarantinedError('id-123'), code: 'FILE_QUARANTINED', status: 423 },
    { name: 'UnauthorizedError', instance: new UnauthorizedError(), code: 'UNAUTHORIZED', status: 401 },
    { name: 'ForbiddenError', instance: new ForbiddenError(), code: 'FORBIDDEN', status: 403 },
    { name: 'StorageError', instance: new StorageError('s3 fail'), code: 'STORAGE_ERROR', status: 500 },
    { name: 'AntivirusError', instance: new AntivirusError('clamav fail'), code: 'ANTIVIRUS_ERROR', status: 500 },
    { name: 'ImageProcessingError', instance: new ImageProcessingError('sharp fail'), code: 'IMAGE_PROCESSING_ERROR', status: 500 },
    { name: 'QuotaExceededError', instance: new QuotaExceededError(), code: 'QUOTA_EXCEEDED', status: 413 },
  ];

  for (const { name, instance, code, status } of table) {
    it(`${name} has code ${code} and status ${status}`, () => {
      expect(instance.code).toBe(code);
      expect(instance.httpStatus).toBe(status);
      expect(instance).toBeInstanceOf(AppError);
    });
  }
});
