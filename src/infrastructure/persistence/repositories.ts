import { randomUUID } from 'node:crypto';
import { Transaction, Op } from 'sequelize';
import { withActor } from '@facturero/outbox-relay';
import { FileReference } from '../../domain/entities';
import { DomainEvent, FileReferenceRepository, Repositories } from '../../domain/repositories';
import { FileReferenceModel, OutboxModel } from './models';
import { sequelize } from './sequelize';

function toDomain(model: FileReferenceModel): FileReference {
  return FileReference.fromPersistence({
    id: model.id,
    resourceType: model.resourceType,
    resourceId: model.resourceId,
    category: model.category,
    originalName: model.originalName,
    mimeType: model.mimeType,
    size: Number(model.size),
    storageKey: model.storageKey,
    storageBucket: model.storageBucket,
    checksum: model.checksum,
    status: model.status,
    description: model.description,
    expiresAt: model.expiresAt,
    parentId: model.parentId,
    uploadedBy: model.uploadedBy,
    organizationId: model.organizationId ?? null,
    createdAt: model.createdAt,
    updatedAt: model.updatedAt,
  });
}

export function fileReferenceRepository(tx?: Transaction): FileReferenceRepository {
  return {
    async findById(id: string): Promise<FileReference | null> {
      const model = await FileReferenceModel.findByPk(id, { transaction: tx });
      return model ? toDomain(model) : null;
    },

    async findByResource(resourceType: string, resourceId: string, category?: string): Promise<FileReference[]> {
      const where: any = { resourceType, resourceId };
      if (category) {
        where.category = category;
      }
      const models = await FileReferenceModel.findAll({
        where,
        transaction: tx,
        order: [['createdAt', 'DESC']],
      });
      return models.map(toDomain);
    },

    async findByParentId(parentId: string): Promise<FileReference[]> {
      const models = await FileReferenceModel.findAll({
        where: { parentId },
        transaction: tx,
      });
      return models.map(toDomain);
    },

    async findExpired(): Promise<FileReference[]> {
      const models = await FileReferenceModel.findAll({
        where: {
          expiresAt: { [Op.lte]: new Date() },
          status: { [Op.notIn]: ['deleted', 'rejected'] },
        },
        transaction: tx,
      });
      return models.map(toDomain);
    },

    async save(file: FileReference): Promise<void> {
      const data = file.toPersistence();
      await FileReferenceModel.upsert(
        {
          id: data.id,
          resourceType: data.resourceType,
          resourceId: data.resourceId,
          category: data.category,
          originalName: data.originalName,
          mimeType: data.mimeType,
          size: data.size,
          storageKey: data.storageKey,
          storageBucket: data.storageBucket,
          checksum: data.checksum,
          status: data.status,
          description: data.description,
          expiresAt: data.expiresAt,
          parentId: data.parentId,
          uploadedBy: data.uploadedBy,
          organizationId: data.organizationId,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        },
        { transaction: tx },
      );
    },

    async delete(id: string): Promise<void> {
      await FileReferenceModel.destroy({
        where: { id },
        transaction: tx,
      });
    },

    async countByResource(resourceType: string, resourceId: string): Promise<number> {
      return FileReferenceModel.count({
        where: { resourceType, resourceId },
        transaction: tx,
      });
    },

    async sumSizeByResource(resourceType: string, resourceId: string): Promise<number> {
      const result = await FileReferenceModel.findAll({
        attributes: [
          [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('size')), 0), 'total'],
        ],
        where: { resourceType, resourceId },
        transaction: tx,
        raw: true,
      });
      return Number((result[0] as any)?.total ?? 0);
    },
  };
}

function outboxRepository(tx?: Transaction) {
  return {
    async add(event: DomainEvent): Promise<void> {
      await OutboxModel.create(
        {
          id: randomUUID(),
          aggregate_type: event.aggregateType,
          aggregate_id: event.aggregateId,
          type: event.type,
          // Inyecta actor/ip/request-id del contexto de la petición, igual que
          // el resto de servicios, para que la bitácora sepa quién actuó.
          payload: withActor(event.payload),
          occurred_at: event.occurredAt,
          processed_at: null,
        },
        { transaction: tx },
      );
    },
  };
}

export function buildRepositories(tx?: Transaction): Repositories {
  return {
    files: fileReferenceRepository(tx),
    outbox: outboxRepository(tx),
  };
}

export class SequelizeUnitOfWork {
  execute<T>(work: (repos: Repositories) => Promise<T>): Promise<T> {
    return sequelize.transaction(async (tx) => {
      const repos = buildRepositories(tx);
      return work(repos);
    });
  }
}
