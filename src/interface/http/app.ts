import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { healthRoutes, documentRoutes, AppDependencies } from './routes';
import { errorHandler } from './middlewares';

export function createApp(deps: AppDependencies): Hono {
  const app = new Hono();

  app.use('*', logger());
  app.use('*', cors({
    origin: deps.corsOrigin,
    allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    exposeHeaders: ['Content-Disposition'],
  }));

  app.route('/', healthRoutes());
  app.route('/', documentRoutes(deps));

  app.onError(errorHandler);
  app.notFound((c) => c.json({ code: 'NOT_FOUND', message: 'Recurso no encontrado.' }, 404));

  return app;
}
