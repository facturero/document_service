const { DataTypes } = require('sequelize');

/**
 * Cada archivo recuerda la organización que lo subió (FACTURACION-BRECHAS.md, N13).
 *
 * Hasta ahora `file_references` no la guardaba: cualquier usuario autenticado
 * podía leer, renombrar o borrar el archivo de otra empresa sabiendo su id, y la
 * descarga ni siquiera pedía sesión. Con la columna, las rutas de usuarios solo
 * sirven archivos de la propia organización.
 *
 * Los archivos anteriores quedan con NULL: no hay forma fiable de deducir de
 * quién son (resource_id apunta a clientes, productos o facturas de otros
 * servicios), así que siguen accesibles con sesión, como antes pero sin la
 * descarga anónima.
 */
module.exports = {
  async up(queryInterface) {
    const table = await queryInterface.describeTable('file_references');
    if (!table.organization_id) {
      await queryInterface.addColumn('file_references', 'organization_id', {
        type: DataTypes.CHAR(36),
        allowNull: true,
      });
    }
    await queryInterface.addIndex('file_references', ['organization_id', 'resource_type', 'resource_id'], {
      name: 'file_references_org_resource',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('file_references', 'file_references_org_resource');
    await queryInterface.removeColumn('file_references', 'organization_id');
  },
};
