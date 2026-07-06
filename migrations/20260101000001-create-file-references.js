const { DataTypes } = require('sequelize');

module.exports = {
  async up(queryInterface) {
    await queryInterface.createTable('file_references', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      resource_type: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      resource_id: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      category: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      original_name: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      mime_type: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      size: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
      },
      storage_key: {
        type: DataTypes.STRING(1024),
        allowNull: false,
      },
      storage_bucket: {
        type: DataTypes.STRING(255),
        allowNull: false,
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
      expires_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      parent_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      uploaded_by: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
      },
    });

    await queryInterface.addIndex('file_references', ['resource_type', 'resource_id'], {
      name: 'idx_resource',
    });
    await queryInterface.addIndex('file_references', ['status'], {
      name: 'idx_status',
    });
    await queryInterface.addIndex('file_references', ['parent_id'], {
      name: 'idx_parent',
    });
    await queryInterface.addIndex('file_references', ['expires_at'], {
      name: 'idx_expires',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('file_references');
  },
};
