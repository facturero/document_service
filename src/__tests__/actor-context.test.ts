// El middleware importa la configuración, que exige variables de entorno (en CI no hay .env).
vi.hoisted(() => {
  process.env.DB_HOST = 'localhost';
  process.env.DB_USER = 'test';
  process.env.DB_NAME = 'test-db';
  process.env.NODE_ENV = 'test';
});

import { describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';
import { getActor } from '@facturero/outbox-relay';
import { authMiddleware } from '../interface/http/middlewares';

// Los eventos de archivos llegaban a la bitácora sin quién los hizo: el repositorio del outbox pedía el actor, pero
// nadie lo ponía en el contexto de la petición.
describe('authMiddleware deja al actor disponible para el outbox', () => {
  const app = new Hono();
  app.get('/quien', authMiddleware(), (c) => c.json(getActor() ?? null));

  it('usuario, correo, IP y request id viajan hasta quien publica el evento', async () => {
    const res = await app.fetch(
      new Request('http://localhost/quien', {
        headers: {
          'X-User-Id': 'user-1',
          'X-User-Email': 'ana@empresa.com',
          'X-Organization-Id': 'org-1',
          'X-Client-Ip': '203.0.113.7',
          'X-Request-Id': 'req-1',
        },
      }),
    );
    expect(await res.json()).toEqual({
      actorId: 'user-1',
      actorEmail: 'ana@empresa.com',
      actorIp: '203.0.113.7',
      requestId: 'req-1',
    });
  });

  it('sin usuario sigue respondiendo 401 y no abre contexto', async () => {
    const res = await app.fetch(new Request('http://localhost/quien'));
    expect(res.status).toBe(401);
  });
});
