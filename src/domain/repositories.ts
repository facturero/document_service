import { FileReference } from './entities';

export interface FileReferenceRepository {
  findById(id: string): Promise<FileReference | null>;
  findByResource(resourceType: string, resourceId: string, category?: string): Promise<FileReference[]>;
  findByParentId(parentId: string): Promise<FileReference[]>;
  findExpired(): Promise<FileReference[]>;
  save(file: FileReference): Promise<void>;
  delete(id: string): Promise<void>;
  countByResource(resourceType: string, resourceId: string): Promise<number>;
  sumSizeByResource(resourceType: string, resourceId: string): Promise<number>;
}

/** Evento de dominio a publicar. Mismo contrato que el resto de servicios: se
 *  escribe en `outbox_messages` dentro de la MISMA transacción que el cambio,
 *  y `OutboxRelay` lo publica en `crm.events`. */
export interface DomainEvent {
  type: string;
  aggregateType: string;
  aggregateId: string;
  payload: Record<string, unknown>;
  occurredAt: Date;
}

export interface OutboxRepository {
  add(event: DomainEvent): Promise<void>;
}

export interface Repositories {
  files: FileReferenceRepository;
  outbox: OutboxRepository;
}
