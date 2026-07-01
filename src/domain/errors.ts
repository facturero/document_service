export abstract class AppError extends Error {
  abstract readonly code: string;
  abstract readonly httpStatus: number;
  readonly details?: Record<string, unknown>;

  constructor(message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = this.constructor.name;
    this.details = details;
  }
}

export class ValidationError extends AppError {
  readonly code = 'VALIDATION_ERROR';
  readonly httpStatus = 400;
}

export class InvalidFileIdError extends AppError {
  readonly code = 'INVALID_FILE_ID';
  readonly httpStatus = 400;

  constructor(value: string) {
    super(`ID de archivo inválido: ${value}`);
  }
}

export class InvalidFileStatusError extends AppError {
  readonly code = 'INVALID_FILE_STATUS';
  readonly httpStatus = 400;

  constructor(value: string) {
    super(`Estado de archivo inválido: ${value}`);
  }
}

export class InvalidFileSizeError extends AppError {
  readonly code = 'INVALID_FILE_SIZE';
  readonly httpStatus = 400;

  constructor(bytes: number) {
    super(`Tamaño de archivo inválido: ${bytes}`);
  }
}

export class FileTooLargeError extends AppError {
  readonly code = 'FILE_TOO_LARGE';
  readonly httpStatus = 413;

  constructor(bytes: number, maxSize: number) {
    super(`Archivo demasiado grande: ${bytes} bytes (máximo ${maxSize} bytes)`);
  }
}

export class FileNotFoundError extends AppError {
  readonly code = 'FILE_NOT_FOUND';
  readonly httpStatus = 404;

  constructor(fileId: string) {
    super(`Archivo no encontrado: ${fileId}`);
  }
}

export class FileAlreadyConfirmedError extends AppError {
  readonly code = 'FILE_ALREADY_CONFIRMED';
  readonly httpStatus = 409;

  constructor(fileId: string) {
    super(`El archivo ya fue confirmado: ${fileId}`);
  }
}

export class FileIsQuarantinedError extends AppError {
  readonly code = 'FILE_QUARANTINED';
  readonly httpStatus = 423;

  constructor(fileId: string) {
    super(`El archivo está en cuarentena: ${fileId}`);
  }
}

export class UnauthorizedError extends AppError {
  readonly code = 'UNAUTHORIZED';
  readonly httpStatus = 401;

  constructor(message = 'No autorizado.') {
    super(message);
  }
}

export class ForbiddenError extends AppError {
  readonly code = 'FORBIDDEN';
  readonly httpStatus = 403;

  constructor(message = 'Acceso denegado.') {
    super(message);
  }
}

export class StorageError extends AppError {
  readonly code = 'STORAGE_ERROR';
  readonly httpStatus = 500;

  constructor(message: string) {
    super(message);
  }
}

export class AntivirusError extends AppError {
  readonly code = 'ANTIVIRUS_ERROR';
  readonly httpStatus = 500;

  constructor(message: string) {
    super(message);
  }
}

export class ImageProcessingError extends AppError {
  readonly code = 'IMAGE_PROCESSING_ERROR';
  readonly httpStatus = 500;

  constructor(message: string) {
    super(message);
  }
}

export class QuotaExceededError extends AppError {
  readonly code = 'QUOTA_EXCEEDED';
  readonly httpStatus = 413;

  constructor() {
    super('Cuota de almacenamiento excedida.');
  }
}
