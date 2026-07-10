import { Hono } from 'hono';
import { CreatePresignedUploadUseCase } from '../../application/use-cases/create-presigned-upload';
import { ConfirmFileUploadUseCase } from '../../application/use-cases/confirm-file-upload';
import { GetFileUseCase } from '../../application/use-cases/get-file';
import { GetFileDownloadUseCase } from '../../application/use-cases/get-file-download';
import { ListFilesUseCase } from '../../application/use-cases/list-files';
import { UpdateFileMetadataUseCase } from '../../application/use-cases/update-file-metadata';
import { DeleteFileUseCase } from '../../application/use-cases/delete-file';
import { authMiddleware } from './middlewares';
import {
  createPresignedController,
  confirmUploadController,
  getFileController,
  getFileDownloadController,
  listFilesController,
  updateFileMetadataController,
  deleteFileController,
} from './controllers';
import {
  createPresignedSchema,
  confirmUploadSchema,
  updateMetadataSchema,
  listFilesQuerySchema,
  validateJson,
  validateQuery,
} from './validators';

export interface AppDependencies {
  useCases: {
    createPresigned: CreatePresignedUploadUseCase;
    confirmUpload: ConfirmFileUploadUseCase;
    getFile: GetFileUseCase;
    getFileDownload: GetFileDownloadUseCase;
    listFiles: ListFilesUseCase;
    updateMetadata: UpdateFileMetadataUseCase;
    deleteFile: DeleteFileUseCase;
  };
  corsOrigin: string;
}

export function healthRoutes(): Hono {
  const r = new Hono();
  r.get('/health', (c) => c.json({ status: 'ok' }));
  return r;
}

export function documentRoutes(deps: AppDependencies): Hono {
  const r = new Hono();
  const { useCases } = deps;

  r.post('/files/presigned', authMiddleware(), validateJson(createPresignedSchema), createPresignedController(useCases.createPresigned));
  r.get('/files', authMiddleware(), validateQuery(listFilesQuerySchema), listFilesController(useCases.listFiles));
  r.get('/files/:id', authMiddleware(), getFileController(useCases.getFile));
  r.get('/files/:id/download', getFileDownloadController(useCases.getFileDownload));
  r.patch('/files/:id/confirm', authMiddleware(), validateJson(confirmUploadSchema), confirmUploadController(useCases.confirmUpload));
  r.patch('/files/:id', authMiddleware(), validateJson(updateMetadataSchema), updateFileMetadataController(useCases.updateMetadata));
  r.delete('/files/:id', authMiddleware(), deleteFileController(useCases.deleteFile));

  return r;
}
