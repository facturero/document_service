import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional } from 'sequelize';
import { sequelize } from './sequelize';

export class FileReferenceModel extends Model<InferAttributes<FileReferenceModel>, InferCreationAttributes<FileReferenceModel>> {
  declare id: string;
  declare resourceType: string;
  declare resourceId: string;
  declare category: string;
  declare originalName: string;
  declare mimeType: string;
  declare size: number;
  declare storageKey: string;
  declare storageBucket: string;
  declare checksum: string;
  declare status: string;
  declare description: string | null;
  declare expiresAt: Date | null;
  declare parentId: string | null;
  declare uploadedBy: string;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

FileReferenceModel.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    resourceType: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'resource_type',
    },
    resourceId: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'resource_id',
    },
    category: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    originalName: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'original_name',
    },
    mimeType: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'mime_type',
    },
    size: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
    },
    storageKey: {
      type: DataTypes.STRING(1024),
      allowNull: false,
      field: 'storage_key',
    },
    storageBucket: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'storage_bucket',
    },
    checksum: {
      type: DataTypes.STRING(128),
      allowNull: false,
      defaultValue: '',
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'pending',
    },
    description: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'expires_at',
    },
    parentId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'parent_id',
    },
    uploadedBy: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'uploaded_by',
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'created_at',
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'updated_at',
    },
  },
  {
    sequelize,
    tableName: 'file_references',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        name: 'idx_resource',
        fields: ['resource_type', 'resource_id'],
      },
      {
        name: 'idx_status',
        fields: ['status'],
      },
      {
        name: 'idx_parent',
        fields: ['parent_id'],
      },
      {
        name: 'idx_expires',
        fields: ['expires_at'],
      },
    ],
  },
);

/** Outbox: mismo esquema que el resto de servicios para que `OutboxRelay` lo
 *  drene sin configuración especial. Ver migración 20260908000000. */
export class OutboxModel extends Model<
  InferAttributes<OutboxModel>,
  InferCreationAttributes<OutboxModel>
> {
  declare id: string;
  declare aggregate_type: string;
  declare aggregate_id: string;
  declare type: string;
  declare payload: unknown;
  declare occurred_at: Date;
  declare processed_at: Date | null;
}

OutboxModel.init(
  {
    id: { type: DataTypes.CHAR(36), primaryKey: true },
    aggregate_type: { type: DataTypes.STRING(50), allowNull: false },
    aggregate_id: { type: DataTypes.CHAR(36), allowNull: false },
    type: { type: DataTypes.STRING(100), allowNull: false },
    payload: { type: DataTypes.JSON, allowNull: false },
    occurred_at: { type: DataTypes.DATE, allowNull: false },
    processed_at: { type: DataTypes.DATE, allowNull: true },
  },
  { sequelize, tableName: 'outbox_messages', timestamps: false },
);

export type { Model } from 'sequelize';
