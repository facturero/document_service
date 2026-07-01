import { Context, MiddlewareHandler } from 'hono';
import { AppError } from '../../domain/errors';

export interface AuthVariables {
  userId: string;
  userEmail: string;
}

export function authMiddleware(): MiddlewareHandler<{ Variables: AuthVariables }> {
  return async (c, next) => {
    const userId = c.req.header('X-User-Id');
    const userEmail = c.req.header('X-User-Email');

    if (!userId || !userEmail) {
      return c.json({ code: 'UNAUTHORIZED', message: 'Usuario no autenticado.' }, 401);
    }

    c.set('userId', userId);
    c.set('userEmail', userEmail);
    await next();
  };
}

export function errorHandler(err: Error, c: Context): Response {
  if (err instanceof AppError) {
    return c.json(
      {
        code: err.code,
        message: err.message,
        ...(err.details ? { details: err.details } : {}),
      },
      err.httpStatus as any,
    );
  }

  console.error('[document-service] error no controlado:', err);
  return c.json({ code: 'INTERNAL_ERROR', message: 'Error interno del servidor.' }, 500);
}
