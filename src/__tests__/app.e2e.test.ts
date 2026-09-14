vi.hoisted(() => {
  process.env.DB_HOST = 'localhost';
  process.env.DB_USER = 'test';
  process.env.DB_NAME = 'test-db';
  process.env.NODE_ENV = 'test';
});

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createApp } from '../interface/http/app';
import { AppDependencies } from '../interface/http/routes';
import { CreatePresignedUploadUseCase } from '../application/use-cases/create-presigned-upload';
import { ConfirmFileUploadUseCase } from '../application/use-cases/confirm-file-upload';
import { GetFileUseCase } from '../application/use-cases/get-file';
import { GetFileDownloadUseCase } from '../application/use-cases/get-file-download';
import { GetFileContentUseCase } from '../application/use-cases/get-file-content';
import { FileReference } from '../domain/entities';
import { ListFilesUseCase } from '../application/use-cases/list-files';
import { UpdateFileMetadataUseCase } from '../application/use-cases/update-file-metadata';
import { DeleteFileUseCase } from '../application/use-cases/delete-file';
import { CreateInternalFileUseCase } from '../application/use-cases/create-internal-file';
import { InMemoryUnitOfWork, MockStorage , readOnlyRepositories } from './helpers';

type Json = Record<string, unknown>;

function buildTestApp() {
  const uow = new InMemoryUnitOfWork();
  const storage = new MockStorage();

  const deps: AppDependencies = {
    useCases: {
      createPresigned: new CreatePresignedUploadUseCase(uow, storage, 'cmr-documents'),
      confirmUpload: new ConfirmFileUploadUseCase(uow),
      getFile: new GetFileUseCase(readOnlyRepositories(uow.files)),
      getFileDownload: new GetFileDownloadUseCase(readOnlyRepositories(uow.files), storage),
      getFileContent: new GetFileContentUseCase(readOnlyRepositories(uow.files), storage),
      listFiles: new ListFilesUseCase(readOnlyRepositories(uow.files)),
      updateMetadata: new UpdateFileMetadataUseCase(uow),
      deleteFile: new DeleteFileUseCase(uow, storage),
      createInternalFile: new CreateInternalFileUseCase(uow, storage, 'cmr-documents'),
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

  /** FACTURACION-BRECHAS.md, N13: cada organización solo ve sus archivos. */
  describe('aislamiento por organización', () => {
    const as = (org: string | null, user = 'user-a') => ({
      'X-User-Id': user,
      'X-User-Email': `${user}@example.com`,
      ...(org ? { 'X-Organization-Id': org } : {}),
    });

    async function uploadAs(org: string, body: Record<string, unknown> = {}) {
      const res = await t.request('POST', '/files/presigned', {
        headers: as(org),
        body: { resourceType: 'product', resourceId: 'p1', category: 'foto', originalName: 'foto.png', mimeType: 'image/png', size: 10, ...body },
      });
      return res.json!.fileId as string;
    }

    it('la organización dueña lo ve, lo lista, obtiene su enlace y lo descarga', async () => {
      const id = await uploadAs('org-a');
      expect((await t.request('GET', `/files/${id}`, { headers: as('org-a') })).status).toBe(200);
      expect((await t.request('GET', '/files?resourceType=product&resourceId=p1', { headers: as('org-a') })).json!.total).toBe(1);
      const url = await t.request('GET', `/files/${id}/url`, { headers: as('org-a') });
      expect(url.status).toBe(200);
      expect(url.json).toMatchObject({ url: expect.stringMatching(/^https?:\/\//), mimeType: 'image/png' });
      const download = await t.app.fetch(new Request(`http://localhost/files/${id}/download`, { headers: as('org-a') }));
      expect(download.status).toBe(302);
    });

    it('otra organización no lo ve, no lo lista, no lo descarga, no lo modifica ni lo borra', async () => {
      const id = await uploadAs('org-a');
      const other = as('org-b', 'user-b');
      expect((await t.request('GET', `/files/${id}`, { headers: other })).status).toBe(404);
      expect((await t.request('GET', '/files?resourceType=product&resourceId=p1', { headers: other })).json!.total).toBe(0);
      expect((await t.request('GET', `/files/${id}/url`, { headers: other })).status).toBe(404);
      expect((await t.app.fetch(new Request(`http://localhost/files/${id}/download`, { headers: other }))).status).toBe(404);
      expect((await t.request('PATCH', `/files/${id}`, { headers: other, body: { description: 'mío' } })).status).toBe(404);
      expect((await t.request('DELETE', `/files/${id}`, { headers: other })).status).toBe(404);
      // Sigue intacto para su dueña.
      expect((await t.request('GET', `/files/${id}`, { headers: as('org-a') })).status).toBe(200);
    });

    it('sin sesión no hay descarga ni enlace', async () => {
      const id = await uploadAs('org-a');
      expect((await t.app.fetch(new Request(`http://localhost/files/${id}/download`))).status).toBe(401);
      expect((await t.app.fetch(new Request(`http://localhost/files/${id}/url`))).status).toBe(401);
    });

    it('el avatar propio se ve desde cualquier organización a la que se pertenezca', async () => {
      const id = await uploadAs('org-a', { resourceType: 'user', resourceId: 'user-a', category: 'avatar' });
      expect((await t.request('GET', `/files/${id}/url`, { headers: as('org-b', 'user-a') })).status).toBe(200);
      expect((await t.request('GET', `/files/${id}/url`, { headers: as('org-b', 'user-b') })).status).toBe(404);
    });

    it('un archivo anterior a guardar la organización sigue accesible con sesión', async () => {
      const legacy = FileReference.create({
        resourceType: 'customer', resourceId: 'c-legacy', category: 'logo', originalName: 'logo.png', mimeType: 'image/png',
        size: 1, storageKey: 'customer/c-legacy/logo.png', storageBucket: 'cmr-documents', checksum: '', description: null,
        expiresAt: null, parentId: null, uploadedBy: 'antiguo',
      });
      await t.uow.files.save(legacy);
      expect((await t.request('GET', `/files/${legacy.id.value}/url`, { headers: as('org-z') })).status).toBe(200);
    });

    it('un servicio interno puede fijar la organización del archivo que sube', async () => {
      const form = new FormData();
      form.append('resourceType', 'invoice');
      form.append('resourceId', 'inv-1');
      form.append('category', 'comprobante');
      form.append('organizationId', 'org-a');
      form.append('file', new Blob([Buffer.from('%PDF')], { type: 'application/pdf' }), 'factura.pdf');
      const res = await t.app.fetch(new Request('http://localhost/files/internal', {
        method: 'POST', headers: { 'X-Internal-Secret': 'dev-internal-secret-change-me' }, body: form,
      }));
      const id = ((await res.json()) as Json).id as string;
      expect((await t.request('GET', `/files/${id}/url`, { headers: as('org-a') })).status).toBe(200);
      expect((await t.request('GET', `/files/${id}/url`, { headers: as('org-b', 'user-b') })).status).toBe(404);
    });
  });

  describe('GET /files/:id/content (interno)', () => {
    async function storedCertificate() {
      const file = FileReference.create({
        resourceType: 'fiscal_certificate', resourceId: 'org-1', category: 'certificado',
        originalName: 'firma.p12', mimeType: 'application/x-pkcs12', size: 3,
        storageKey: 'fiscal_certificate/org-1/firma.p12', storageBucket: 'cmr-documents',
        checksum: '', description: null, expiresAt: null, parentId: null, uploadedBy: 'fiscal-ecuador',
      });
      await t.uow.files.save(file);
      await t.storage.putObjectDirect(file.storageKey, Buffer.from([7, 8, 9]), 'application/x-pkcs12');
      return file;
    }

    it('con el secreto interno devuelve los bytes, sin redirigir', async () => {
      const file = await storedCertificate();
      const res = await t.app.fetch(new Request(`http://localhost/files/${file.id.value}/content`, {
        headers: { 'X-Internal-Secret': 'dev-internal-secret-change-me' },
      }));
      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toBe('application/x-pkcs12');
      expect([...new Uint8Array(await res.arrayBuffer())]).toEqual([7, 8, 9]);
    });

    it('sin el secreto no entrega nada: es un certificado', async () => {
      const file = await storedCertificate();
      const res = await t.app.fetch(new Request(`http://localhost/files/${file.id.value}/content`));
      expect(res.status).toBe(401);
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
