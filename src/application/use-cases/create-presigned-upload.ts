import { FileReference } from '../../domain/entities';
import { Repositories } from '../../domain/repositories';
import { StoragePort, UnitOfWork } from '../ports';
import { CreateFilePresignedInput, PresignedUrlResponse } from '../dtos';

export class CreatePresignedUploadUseCase {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly storage: StoragePort,
    private readonly storageBucket: string,
  ) {}

  async execute(input: CreateFilePresignedInput): Promise<PresignedUrlResponse> {
    return this.uow.execute(async (repos: Repositories) => {
      const storageKey = `${input.resourceType}/${input.resourceId}/${crypto.randomUUID()}-${input.originalName}`;

      const file = FileReference.create({
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        category: input.category.toLowerCase(),
        originalName: input.originalName,
        mimeType: input.mimeType,
        size: input.size,
        storageKey,
        storageBucket: this.storageBucket,
        checksum: '',
        description: input.description ?? null,
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
        parentId: null,
        uploadedBy: input.uploadedBy,
      });

      const presigned = await this.storage.generatePresignedUploadUrl(
        storageKey,
        input.mimeType,
        input.size,
      );

      await repos.files.save(file);

      return {
        fileId: file.id.value,
        presignedUrl: presigned.url,
        fields: presigned.fields,
        expiresIn: presigned.expiresIn,
      };
    });
  }
}
