import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { httpInstrumentationMiddleware } from '@hono/otel';
import { healthRoutes, documentRoutes, AppDependencies } from './routes';
import { errorHandler } from './middlewares';

export function createApp(deps: AppDependencies): Hono {
  const app = new Hono();

  if (process.env.OTEL_EXPORTER_OTLP_ENDPOINT) {
    app.use('*', httpInstrumentationMiddleware({
      serviceName: process.env.OTEL_SERVICE_NAME ?? 'document-service',
      captureRequestHeaders: ['x-request-id'],
      spanNameFactory: (c) => `HTTP ${c.req.method} ${c.req.path}`,
    }));
  }
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
