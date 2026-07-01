import { describe, it, expect } from 'vitest';
import { FileReference } from '../domain/entities';

function makeData(overrides: Record<string, unknown> = {}) {
  return {
    resourceType: 'customer',
    resourceId: 'c123',
    category: 'logo',
    originalName: 'logo.png',
    mimeType: 'image/png',
    size: 1024,
    storageKey: 'customer/c123/uuid-logo.png',
    storageBucket: 'cmr-documents',
    checksum: '',
    description: null,
    expiresAt: null,
    parentId: null,
    uploadedBy: 'user-1',
    ...overrides,
  };
}

describe('FileReference', () => {
  describe('create', () => {
    it('creates a pending file reference', () => {
      const file = FileReference.create(makeData());

      expect(file.id).toBeDefined();
      expect(file.status.isPending()).toBe(true);
      expect(file.resourceType).toBe('customer');
      expect(file.resourceId).toBe('c123');
      expect(file.category).toBe('logo');
      expect(file.originalName).toBe('logo.png');
      expect(file.mimeType).toBe('image/png');
      expect(file.size.bytes).toBe(1024);
      expect(file.checksum).toBe('');
      expect(file.uploadedBy).toBe('user-1');
      expect(file.createdAt).toBeInstanceOf(Date);
      expect(file.updatedAt).toBeInstanceOf(Date);
    });

    it('creates with optional fields', () => {
      const expiresAt = new Date('2027-12-31');
      const file = FileReference.create(makeData({
        description: 'Logo oficial',
        expiresAt,
        parentId: 'parent-uuid',
      }));

      expect(file.description).toBe('Logo oficial');
      expect(file.expiresAt).toEqual(expiresAt);
      expect(file.parentId).toBe('parent-uuid');
    });
  });

  describe('fromPersistence / toPersistence', () => {
    it('round-trips correctly', () => {
      const now = new Date();
      const data = {
        id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        resourceType: 'invoice',
        resourceId: 'inv-001',
        category: 'comprobante',
        originalName: 'factura.xml',
        mimeType: 'application/xml',
        size: 50000,
        storageKey: 'invoice/inv-001/uuid-factura.xml',
        storageBucket: 'cmr-documents',
        checksum: 'abc123def456',
        status: 'confirmed',
        description: 'Factura electrónica',
        expiresAt: null,
        parentId: null,
        uploadedBy: 'user-2',
        createdAt: now,
        updatedAt: now,
      };

      const file = FileReference.fromPersistence(data);
      expect(file.toPersistence()).toEqual(data);
    });

    it('round-trips with all nullable fields set', () => {
      const now = new Date();
      const data = {
        id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        resourceType: 'product',
        resourceId: 'prod-99',
        category: 'foto',
        originalName: 'product.jpg',
        mimeType: 'image/jpeg',
        size: 204800,
        storageKey: 'product/prod-99/uuid-product.jpg',
        storageBucket: 'cmr-documents',
        checksum: 'checksum123',
        status: 'quarantined',
        description: 'Foto del producto',
        expiresAt: new Date('2027-06-30T23:59:59Z'),
        parentId: 'parent-uuid-here',
        uploadedBy: 'user-3',
        createdAt: now,
        updatedAt: now,
      };

      const file = FileReference.fromPersistence(data);
      expect(file.toPersistence()).toEqual(data);
    });
  });

  describe('confirm', () => {
    it('changes status from pending to confirmed with checksum', () => {
      const file = FileReference.create(makeData());
      const confirmed = file.confirm('sha256-checksum');

      expect(confirmed.status.isConfirmed()).toBe(true);
      expect(confirmed.checksum).toBe('sha256-checksum');
      expect(confirmed.updatedAt.getTime()).toBeGreaterThanOrEqual(file.updatedAt.getTime());
    });

    it('returns same instance if not pending', () => {
      const file = FileReference.create(makeData());
      const confirmed = file.confirm('checksum');
      const reconfirmed = confirmed.confirm('new-checksum');

      expect(reconfirmed.checksum).toBe('checksum');
      expect(reconfirmed.status.isConfirmed()).toBe(true);
    });
  });

  describe('reject', () => {
    it('changes status to rejected', () => {
      const file = FileReference.create(makeData());
      const rejected = file.reject();

      expect(rejected.status.isRejected()).toBe(true);
    });
  });

  describe('quarantine', () => {
    it('changes status to quarantined', () => {
      const file = FileReference.create(makeData());
      const q = file.quarantine();

      expect(q.status.isQuarantined()).toBe(true);
    });
  });

  describe('markDeleted', () => {
    it('changes status to deleted', () => {
      const file = FileReference.create(makeData());
      const deleted = file.markDeleted();

      expect(deleted.status.isDeleted()).toBe(true);
    });
  });

  describe('updateMetadata', () => {
    it('updates description', () => {
      const file = FileReference.create(makeData());
      const updated = file.updateMetadata({ description: 'New description' });

      expect(updated.description).toBe('New description');
      expect(updated.category).toBe('logo');
    });

    it('updates category', () => {
      const file = FileReference.create(makeData());
      const updated = file.updateMetadata({ category: 'foto' });

      expect(updated.category).toBe('foto');
    });

    it('updates expiresAt', () => {
      const expiresAt = new Date('2027-12-31');
      const file = FileReference.create(makeData());
      const updated = file.updateMetadata({ expiresAt });

      expect(updated.expiresAt).toEqual(expiresAt);
    });

    it('clears expiresAt when null', () => {
      const expiresAt = new Date('2027-12-31');
      const file = FileReference.create(makeData({ expiresAt }));
      expect(file.expiresAt).toEqual(expiresAt);

      const updated = file.updateMetadata({ expiresAt: null });
      expect(updated.expiresAt).toBeNull();
    });

    it('does not change other fields', () => {
      const file = FileReference.create(makeData());
      const updated = file.updateMetadata({ description: 'Only desc' });

      expect(updated.originalName).toBe('logo.png');
      expect(updated.resourceType).toBe('customer');
      expect(updated.resourceId).toBe('c123');
    });
  });
});
