import { InvalidFileIdError, InvalidFileStatusError, InvalidFileSizeError, FileTooLargeError } from './errors';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class FileId {
  readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  static create(value: string): FileId {
    if (!UUID_REGEX.test(value)) {
      throw new InvalidFileIdError(value);
    }
    return new FileId(value);
  }

  static generate(): FileId {
    const { v4 } = require('uuid');
    return new FileId(v4());
  }

  equals(other: FileId): boolean {
    return this.value === other.value;
  }
}

export class FileStatus {
  static readonly PENDING = 'pending';
  static readonly CONFIRMED = 'confirmed';
  static readonly REJECTED = 'rejected';
  static readonly QUARANTINED = 'quarantined';
  static readonly DELETED = 'deleted';

  private static readonly ALLOWED = [
    FileStatus.PENDING,
    FileStatus.CONFIRMED,
    FileStatus.REJECTED,
    FileStatus.QUARANTINED,
    FileStatus.DELETED,
  ];

  readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  static create(value: string): FileStatus {
    if (!FileStatus.ALLOWED.includes(value)) {
      throw new InvalidFileStatusError(value);
    }
    return new FileStatus(value);
  }

  isPending(): boolean { return this.value === FileStatus.PENDING; }
  isConfirmed(): boolean { return this.value === FileStatus.CONFIRMED; }
  isRejected(): boolean { return this.value === FileStatus.REJECTED; }
  isQuarantined(): boolean { return this.value === FileStatus.QUARANTINED; }
  isDeleted(): boolean { return this.value === FileStatus.DELETED; }
}

export class FileSize {
  readonly bytes: number;

  private constructor(bytes: number) {
    this.bytes = bytes;
  }

  static create(bytes: number, maxSize: number): FileSize {
    if (bytes < 0) throw new InvalidFileSizeError(bytes);
    if (bytes > maxSize) throw new FileTooLargeError(bytes, maxSize);
    return new FileSize(bytes);
  }

  static fromBytes(bytes: number): FileSize {
    if (bytes < 0) throw new InvalidFileSizeError(bytes);
    return new FileSize(bytes);
  }
}
