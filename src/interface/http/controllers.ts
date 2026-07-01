import { Context } from 'hono';
import { CreatePresignedUploadUseCase } from '../../application/use-cases/create-presigned-upload';
import { ConfirmFileUploadUseCase } from '../../application/use-cases/confirm-file-upload';
import { GetFileUseCase } from '../../application/use-cases/get-file';
import { GetFileDownloadUseCase } from '../../application/use-cases/get-file-download';
import { ListFilesUseCase } from '../../application/use-cases/list-files';
import { UpdateFileMetadataUseCase } from '../../application/use-cases/update-file-metadata';
import { DeleteFileUseCase } from '../../application/use-cases/delete-file';
import { AuthVariables } from './middlewares';

type Auth = { Variables: AuthVariables };

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
    const fileId = c.req.param('id');
    const body = c.req.valid('json' as never) as any;
    const result = await useCase.execute({ fileId, checksum: body.checksum });
    return c.json(result, 200);
  };
}

export function getFileController(useCase: GetFileUseCase) {
  return async (c: Context) => {
    const fileId = c.req.param('id');
    const result = await useCase.execute(fileId);
    return c.json(result, 200);
  };
}

export function getFileDownloadController(useCase: GetFileDownloadUseCase) {
  return async (c: Context) => {
    const fileId = c.req.param('id');
    const result = await useCase.execute(fileId);
    return c.redirect(result.url, 302);
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
    const fileId = c.req.param('id');
    const body = c.req.valid('json' as never) as any;
    const result = await useCase.execute(fileId, body);
    return c.json(result, 200);
  };
}

export function deleteFileController(useCase: DeleteFileUseCase) {
  return async (c: Context) => {
    const fileId = c.req.param('id');
    await useCase.execute(fileId);
    return c.body(null, 204);
  };
}
