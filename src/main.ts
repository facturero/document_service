import { serve } from '@hono/node-server';
import { config } from './infrastructure/config';
import { sequelize } from './infrastructure/persistence/sequelize';
import './infrastructure/persistence/models';
import { buildRepositories, SequelizeUnitOfWork } from './infrastructure/persistence/repositories';
import { S3StorageAdapter } from './infrastructure/storage/s3-storage';
import { LocalStorageAdapter } from './infrastructure/storage/local-storage';
import { CreatePresignedUploadUseCase } from './application/use-cases/create-presigned-upload';
import { ConfirmFileUploadUseCase } from './application/use-cases/confirm-file-upload';
import { GetFileUseCase } from './application/use-cases/get-file';
import { GetFileDownloadUseCase } from './application/use-cases/get-file-download';
import { ListFilesUseCase } from './application/use-cases/list-files';
import { UpdateFileMetadataUseCase } from './application/use-cases/update-file-metadata';
import { DeleteFileUseCase } from './application/use-cases/delete-file';
import { createApp } from './interface/http/app';

async function main(): Promise<void> {
  await sequelize.authenticate();
  await sequelize.sync();

  const repos = buildRepositories();
  const uow = new SequelizeUnitOfWork();

  const storage = config.STORAGE_DRIVER === 's3'
    ? new S3StorageAdapter({
        endpoint: config.S3_ENDPOINT,
        publicEndpoint: config.S3_PUBLIC_ENDPOINT || config.S3_ENDPOINT,
        region: config.S3_REGION,
        accessKeyId: config.S3_ACCESS_KEY_ID,
        secretAccessKey: config.S3_SECRET_ACCESS_KEY,
        forcePathStyle: config.S3_FORCE_PATH_STYLE,
        bucket: config.S3_BUCKET,
      })
    : new LocalStorageAdapter(config.LOCAL_STORAGE_PATH);

  const app = createApp({
    useCases: {
      createPresigned: new CreatePresignedUploadUseCase(uow, storage, config.S3_BUCKET),
      confirmUpload: new ConfirmFileUploadUseCase(uow),
      getFile: new GetFileUseCase(repos),
      getFileDownload: new GetFileDownloadUseCase(repos, storage),
      listFiles: new ListFilesUseCase(repos),
      updateMetadata: new UpdateFileMetadataUseCase(uow),
      deleteFile: new DeleteFileUseCase(uow, storage),
    },
    corsOrigin: config.CORS_ORIGIN,
  });

  serve({ fetch: app.fetch, port: config.PORT }, (info) => {
    console.log(`document-service escuchando en http://localhost:${info.port}`);
  });
}

main().catch((e) => {
  console.error('Fallo al iniciar document-service:', e);
  process.exit(1);
});
