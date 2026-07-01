import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { ValidationError } from '../../domain/errors';

export const createPresignedSchema = z.object({
  resourceType: z.string().min(1).max(100),
  resourceId: z.string().min(1).max(100),
  category: z.string().min(1).max(100),
  originalName: z.string().min(1).max(255),
  mimeType: z.string().min(1).max(255),
  size: z.number().int().positive(),
  description: z.string().max(500).optional(),
  expiresAt: z.string().datetime().optional(),
});

export const confirmUploadSchema = z.object({
  checksum: z.string().min(1).max(128),
});

export const updateMetadataSchema = z.object({
  description: z.string().max(500).optional(),
  category: z.string().min(1).max(100).optional(),
  expiresAt: z.string().datetime().nullable().optional(),
});

export const listFilesQuerySchema = z.object({
  resourceType: z.string().min(1),
  resourceId: z.string().min(1),
  category: z.string().optional(),
});

export function validateJson<T extends z.ZodSchema>(schema: T) {
  return zValidator('json', schema, (result) => {
    if (!result.success) {
      throw new ValidationError('Datos inválidos.', { issues: result.error.issues });
    }
  });
}

export function validateQuery<T extends z.ZodSchema>(schema: T) {
  return zValidator('query', schema, (result) => {
    if (!result.success) {
      throw new ValidationError('Parámetros de consulta inválidos.', { issues: result.error.issues });
    }
  });
}
