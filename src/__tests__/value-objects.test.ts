import { describe, it, expect } from 'vitest';
import { FileId, FileStatus, FileSize } from '../domain/value-objects';
import { InvalidFileIdError, InvalidFileStatusError, InvalidFileSizeError, FileTooLargeError } from '../domain/errors';

describe('FileId', () => {
  const validUuid = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';

  it('creates from a valid UUID', () => {
    const id = FileId.create(validUuid);
    expect(id.value).toBe(validUuid);
  });

  it('throws InvalidFileIdError for invalid string', () => {
    expect(() => FileId.create('not-a-uuid')).toThrow(InvalidFileIdError);
    expect(() => FileId.create('')).toThrow(InvalidFileIdError);
  });

  it('generates a valid UUID', () => {
    const id = FileId.generate();
    expect(id.value).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  });

  it('generates unique IDs', () => {
    const a = FileId.generate();
    const b = FileId.generate();
    expect(a.value).not.toBe(b.value);
  });

  it('equals returns true for same value', () => {
    const a = FileId.create(validUuid);
    const b = FileId.create(validUuid);
    expect(a.equals(b)).toBe(true);
  });

  it('equals returns false for different values', () => {
    const a = FileId.create(validUuid);
    const b = FileId.generate();
    expect(a.equals(b)).toBe(false);
  });
});

describe('FileStatus', () => {
  it('creates valid statuses', () => {
    expect(FileStatus.create('pending').value).toBe('pending');
    expect(FileStatus.create('confirmed').value).toBe('confirmed');
    expect(FileStatus.create('rejected').value).toBe('rejected');
    expect(FileStatus.create('quarantined').value).toBe('quarantined');
    expect(FileStatus.create('deleted').value).toBe('deleted');
  });

  it('throws InvalidFileStatusError for unknown status', () => {
    expect(() => FileStatus.create('unknown')).toThrow(InvalidFileStatusError);
    expect(() => FileStatus.create('')).toThrow(InvalidFileStatusError);
  });

  it('isPending returns true only for pending', () => {
    expect(FileStatus.create('pending').isPending()).toBe(true);
    expect(FileStatus.create('confirmed').isPending()).toBe(false);
  });

  it('isConfirmed returns true only for confirmed', () => {
    expect(FileStatus.create('confirmed').isConfirmed()).toBe(true);
    expect(FileStatus.create('pending').isConfirmed()).toBe(false);
  });

  it('isRejected returns true only for rejected', () => {
    expect(FileStatus.create('rejected').isRejected()).toBe(true);
    expect(FileStatus.create('confirmed').isRejected()).toBe(false);
  });

  it('isQuarantined returns true only for quarantined', () => {
    expect(FileStatus.create('quarantined').isQuarantined()).toBe(true);
    expect(FileStatus.create('pending').isQuarantined()).toBe(false);
  });

  it('isDeleted returns true only for deleted', () => {
    expect(FileStatus.create('deleted').isDeleted()).toBe(true);
    expect(FileStatus.create('confirmed').isDeleted()).toBe(false);
  });
});

describe('FileSize', () => {
  it('creates from valid bytes under max', () => {
    const size = FileSize.create(500, 1000);
    expect(size.bytes).toBe(500);
  });

  it('throws InvalidFileSizeError for negative bytes', () => {
    expect(() => FileSize.create(-1, 1000)).toThrow(InvalidFileSizeError);
    expect(() => FileSize.fromBytes(-1)).toThrow(InvalidFileSizeError);
  });

  it('throws FileTooLargeError when exceeding max', () => {
    expect(() => FileSize.create(1001, 1000)).toThrow(FileTooLargeError);
    expect(() => FileSize.create(1000, 999)).toThrow(FileTooLargeError);
  });

  it('accepts bytes equal to max', () => {
    const size = FileSize.create(1000, 1000);
    expect(size.bytes).toBe(1000);
  });

  it('fromBytes creates without max validation', () => {
    const size = FileSize.fromBytes(999999);
    expect(size.bytes).toBe(999999);
  });
});
