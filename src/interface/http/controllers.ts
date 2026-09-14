import { Context } from 'hono';
import { CreatePresignedUploadUseCase } from '../../application/use-cases/create-presigned-upload';
import { ConfirmFileUploadUseCase } from '../../application/use-cases/confirm-file-upload';
import { GetFileUseCase } from '../../application/use-cases/get-file';
import { GetFileDownloadUseCase } from '../../application/use-cases/get-file-download';
import { GetFileContentUseCase } from '../../application/use-cases/get-file-content';
import { ListFilesUseCase } from '../../application/use-cases/list-files';
import { UpdateFileMetadataUseCase } from '../../application/use-cases/update-file-metadata';
import { DeleteFileUseCase } from '../../application/use-cases/delete-file';
import { CreateInternalFileUseCase } from '../../application/use-cases/create-internal-file';
import { AuthVariables } from './middlewares';
import { ValidationError } from '../../domain/errors';
import type { FileActor } from '../../domain/file-access';

type Auth = { Variables: AuthVariables };

/** Quién pide el archivo, para acotar a su organización (ver domain/file-access.ts). */
function actorOf(c: Context): FileActor {
  const { userId, organizationId } = c.var as Auth['Variables'];
  return { userId, organizationId: organizationId ?? null };
}

function requireParam(c: Context, name: string): string {
  const value = c.req.param(name);
  if (value === undefined) {
    throw new ValidationError(`Parámetro requerido: ${name}`);
  }
  return value;
}

export function createPresignedController(useCase: CreatePresignedUploadUseCase) {
  return async (c: Context) => {
    const body = c.req.valid('json' as never) as any;
    const { userId, organizationId } = c.var as Auth['Variables'];
    const result = await useCase.execute({ ...body, uploadedBy: userId, organizationId: organizationId ?? null });
    return c.json(result, 201);
  };
}

export function confirmUploadController(useCase: ConfirmFileUploadUseCase) {
  return async (c: Context) => {
    const fileId = requireParam(c, 'id');
    const body = c.req.valid('json' as never) as any;
    const result = await useCase.execute({ fileId, checksum: body.checksum }, actorOf(c));
    return c.json(result, 200);
  };
}

export function getFileController(useCase: GetFileUseCase) {
  return async (c: Context) => {
    const fileId = requireParam(c, 'id');
    const result = await useCase.execute(fileId, actorOf(c));
    return c.json(result, 200);
  };
}

export function getFileDownloadController(useCase: GetFileDownloadUseCase) {
  return async (c: Context) => {
    const fileId = requireParam(c, 'id');
    const result = await useCase.execute(fileId, actorOf(c));
    return c.redirect(result.url, 302);
  };
}

/**
 * El enlace firmado del almacenamiento, en JSON. Es lo que usa la interfaz: pide
 * el enlace con su token y lo pone en <img src> o lo abre. Así la descarga exige
 * sesión sin que el navegador tenga que seguir una redirección con cabeceras a
 * otro origen (MinIO), que chocaría con CORS.
 */
export function getFileUrlController(useCase: GetFileDownloadUseCase) {
  return async (c: Context) => {
    const fileId = requireParam(c, 'id');
    const result = await useCase.execute(fileId, actorOf(c));
    return c.json({ url: result.url, originalName: result.originalName, mimeType: result.mimeType }, 200);
  };
}

export function getFileContentController(useCase: GetFileContentUseCase) {
  return async (c: Context) => {
    const fileId = requireParam(c, 'id');
    const result = await useCase.execute(fileId);
    return new Response(new Uint8Array(result.buffer), {
      status: 200,
      headers: {
        'Content-Type': result.mimeType,
        'Content-Length': String(result.buffer.length),
      },
    });
  };
}

export function listFilesController(useCase: ListFilesUseCase) {
  return async (c: Context) => {
    const query = c.req.valid('query' as never) as any;
    const result = await useCase.execute(query.resourceType, query.resourceId, query.category, actorOf(c));
    return c.json(result, 200);
  };
}

export function updateFileMetadataController(useCase: UpdateFileMetadataUseCase) {
  return async (c: Context) => {
    const fileId = requireParam(c, 'id');
    const body = c.req.valid('json' as never) as any;
    const result = await useCase.execute(fileId, body, actorOf(c));
    return c.json(result, 200);
  };
}

export function deleteFileController(useCase: DeleteFileUseCase) {
  return async (c: Context) => {
    const fileId = requireParam(c, 'id');
    await useCase.execute(fileId, actorOf(c));
    return c.body(null, 204);
  };
}

export function createInternalFileController(useCase: CreateInternalFileUseCase) {
  return async (c: Context) => {
    const body = await c.req.parseBody();
    const file = body['file'];
    if (!file || !(file instanceof File)) {
      return c.json({ code: 'VALIDATION_ERROR', message: 'Campo "file" requerido.' }, 400);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const resourceType = body['resourceType'] as string;
    const resourceId = body['resourceId'] as string;
    const category = body['category'] as string;
    const originalName = body['originalName'] as string || file.name;
    const mimeType = body['mimeType'] as string || file.type;
    const uploadedBy = body['uploadedBy'] as string || 'internal';
    const organizationId = (body['organizationId'] as string) || null;

    if (!resourceType || !resourceId || !category) {
      return c.json({ code: 'VALIDATION_ERROR', message: 'Campos resourceType, resourceId y category requeridos.' }, 400);
    }

    const result = await useCase.execute({
      resourceType,
      resourceId,
      category,
      originalName,
      mimeType,
      uploadedBy,
      organizationId,
      buffer,
    });
    return c.json(result, 201);
  };
}
