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

type Auth = { Variables: AuthVariables };

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
    const { userId } = c.var as Auth['Variables'];
    const result = await useCase.execute({ ...body, uploadedBy: userId });
    return c.json(result, 201);
  };
}

export function confirmUploadController(useCase: ConfirmFileUploadUseCase) {
  return async (c: Context) => {
    const fileId = requireParam(c, 'id');
    const body = c.req.valid('json' as never) as any;
    const result = await useCase.execute({ fileId, checksum: body.checksum });
    return c.json(result, 200);
  };
}

export function getFileController(useCase: GetFileUseCase) {
  return async (c: Context) => {
    const fileId = requireParam(c, 'id');
    const result = await useCase.execute(fileId);
    return c.json(result, 200);
  };
}

export function getFileDownloadController(useCase: GetFileDownloadUseCase) {
  return async (c: Context) => {
    const fileId = requireParam(c, 'id');
    const result = await useCase.execute(fileId);
    return c.redirect(result.url, 302);
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
    const result = await useCase.execute(query.resourceType, query.resourceId, query.category);
    return c.json(result, 200);
  };
}

export function updateFileMetadataController(useCase: UpdateFileMetadataUseCase) {
  return async (c: Context) => {
    const fileId = requireParam(c, 'id');
    const body = c.req.valid('json' as never) as any;
    const result = await useCase.execute(fileId, body);
    return c.json(result, 200);
  };
}

export function deleteFileController(useCase: DeleteFileUseCase) {
  return async (c: Context) => {
    const fileId = requireParam(c, 'id');
    await useCase.execute(fileId);
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
      buffer,
    });
    return c.json(result, 201);
  };
}
