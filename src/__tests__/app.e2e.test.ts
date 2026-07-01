import { describe, it, expect, beforeEach } from 'vitest';
import { createApp } from '../interface/http/app';
import { AppDependencies } from '../interface/http/routes';
import { CreatePresignedUploadUseCase } from '../application/use-cases/create-presigned-upload';
import { ConfirmFileUploadUseCase } from '../application/use-cases/confirm-file-upload';
import { GetFileUseCase } from '../application/use-cases/get-file';
import { GetFileDownloadUseCase } from '../application/use-cases/get-file-download';
import { ListFilesUseCase } from '../application/use-cases/list-files';
import { UpdateFileMetadataUseCase } from '../application/use-cases/update-file-metadata';
import { DeleteFileUseCase } from '../application/use-cases/delete-file';
import { InMemoryUnitOfWork, MockStorage } from './helpers';

type Json = Record<string, unknown>;

function buildTestApp() {
  const uow = new InMemoryUnitOfWork();
  const storage = new MockStorage();

  const deps: AppDependencies = {
    useCases: {
      createPresigned: new CreatePresignedUploadUseCase(uow, storage, 'cmr-documents'),
      confirmUpload: new ConfirmFileUploadUseCase(uow),
      getFile: new GetFileUseCase({ files: uow.files }),
      getFileDownload: new GetFileDownloadUseCase({ files: uow.files }, storage),
      listFiles: new ListFilesUseCase({ files: uow.files }),
      updateMetadata: new UpdateFileMetadataUseCase(uow),
      deleteFile: new DeleteFileUseCase(uow, storage),
    },
    corsOrigin: '*',
  };

  const app = createApp(deps);

  async function request(method: string, path: string, options?: { body?: unknown; headers?: Record<string, string> }): Promise<{ status: number; json?: Json; headers: Headers }> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-User-Id': 'test-user',
      'X-User-Email': 'test@example.com',
      ...options?.headers,
    };
    const init: RequestInit = { method, headers };
    if (options?.body) {
      init.body = JSON.stringify(options.body);
    }
    const res = await app.fetch(new Request(`http://localhost${path}`, init));
    const contentType = res.headers.get('content-type');
    const json = contentType?.includes('application/json') ? await res.json() as Json : undefined;
    return { status: res.status, json, headers: res.headers };
  }

  const get = (path: string) => request('GET', path);
  const post = (path: string, body: unknown) => request('POST', path, { body });
  const patch = (path: string, body: unknown) => request('PATCH', path, { body });
  const del = (path: string) => request('DELETE', path);

  return { app, uow, storage, request, get, post, patch, del };
}

describe('E2E: Document API', () => {
  let t: ReturnType<typeof buildTestApp>;

  beforeEach(() => {
    t = buildTestApp();
  });

  describe('GET /health', () => {
    it('returns ok', async () => {
      const res = await t.app.fetch(new Request('http://localhost/health'));
      expect(res.status).toBe(200);
      const body = await res.json() as Json;
      expect(body).toEqual({ status: 'ok' });
    });
  });

  describe('POST /files/presigned', () => {
    it('creates presigned upload and returns 201', async () => {
      const { status, json } = await t.post('/files/presigned', {
        resourceType: 'customer',
        resourceId: 'c123',
        category: 'logo',
        originalName: 'logo.png',
        mimeType: 'image/png',
        size: 1024,
      });

      expect(status).toBe(201);
      expect(json!.fileId).toBeTruthy();
      expect(json!.presignedUrl).toBeTruthy();
      expect(json!.expiresIn).toBe(3600);
    });

    it('returns 400 for missing required fields', async () => {
      const { status, json } = await t.post('/files/presigned', {
        resourceType: 'customer',
      });

      expect(status).toBe(400);
      expect(json!.code).toBe('VALIDATION_ERROR');
    });

    it('returns 401 without auth headers', async () => {
      const res = await t.app.fetch(
        new Request('http://localhost/files/presigned', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            resourceType: 'customer',
            resourceId: 'c123',
            category: 'logo',
            originalName: 'logo.png',
            mimeType: 'image/png',
            size: 1024,
          }),
        }),
      );

      expect(res.status).toBe(401);
    });
  });

  describe('GET /files', () => {
    it('returns empty list initially', async () => {
      const { status, json } = await t.get('/files?resourceType=customer&resourceId=c123');

      expect(status).toBe(200);
      expect(json!.files).toEqual([]);
      expect(json!.total).toBe(0);
    });

    it('returns 400 without required query params', async () => {
      const { status } = await t.get('/files');
      expect(status).toBe(400);
    });
  });

  describe('PATCH /files/:id', () => {
    it('updates file metadata', async () => {
      const created = await t.post('/files/presigned', {
        resourceType: 'customer',
        resourceId: 'c123',
        category: 'logo',
        originalName: 'logo.png',
        mimeType: 'image/png',
        size: 1024,
      });

      const { status, json } = await t.patch(`/files/${created.json!.fileId}`, {
        description: 'Updated description',
      });

      expect(status).toBe(200);
      expect(json!.description).toBe('Updated description');
    });

    it('returns 404 for nonexistent file', async () => {
      const { status } = await t.patch('/files/00000000-0000-0000-0000-000000000000', {
        description: 'test',
      });

      expect(status).toBe(404);
    });
  });

  describe('DELETE /files/:id', () => {
    it('deletes a file', async () => {
      const created = await t.post('/files/presigned', {
        resourceType: 'customer',
        resourceId: 'c123',
        category: 'logo',
        originalName: 'logo.png',
        mimeType: 'image/png',
        size: 1024,
      });

      const { status } = await t.del(`/files/${created.json!.fileId}`);

      expect(status).toBe(204);
    });

    it('returns 404 for nonexistent file', async () => {
      const { status } = await t.del('/files/00000000-0000-0000-0000-000000000000');
      expect(status).toBe(404);
    });
  });

  describe('404 handling', () => {
    it('returns 404 for unknown routes', async () => {
      const res = await t.app.fetch(new Request('http://localhost/nonexistent'));
      expect(res.status).toBe(404);
      const body = await res.json() as Json;
      expect(body.code).toBe('NOT_FOUND');
    });
  });
});
