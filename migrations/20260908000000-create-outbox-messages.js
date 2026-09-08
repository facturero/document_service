const { DataTypes } = require('sequelize');

/** Outbox de document-service.
 *
 * Este servicio era el único del backend que no publicaba NADA: su
 * `asyncapi.yaml` declaraba `document.file.attached` y `document.file.removed`
 * desde el primer día, pero no existía ni la tabla ni el relay. Consecuencia:
 * subir, reemplazar o borrar un documento (adjuntos de facturas incluidos) no
 * dejaba rastro en la bitácora de auditoría.
 *
 * Misma forma que en el resto de servicios, para que `OutboxRelay` la drene
 * sin configuración especial. */
module.exports = {
  async up(queryInterface) {
    await queryInterface.createTable('outbox_messages', {
      id: { type: DataTypes.CHAR(36), primaryKey: true },
      aggregate_type: { type: DataTypes.STRING(50), allowNull: false },
      aggregate_id: { type: DataTypes.CHAR(36), allowNull: false },
      type: { type: DataTypes.STRING(100), allowNull: false },
      payload: { type: DataTypes.JSON, allowNull: false },
      occurred_at: { type: DataTypes.DATE, allowNull: false },
      processed_at: { type: DataTypes.DATE, allowNull: true },
    });
    // El relay busca siempre por "lo que aún no se ha publicado".
    await queryInterface.addIndex('outbox_messages', ['processed_at']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('outbox_messages');
  },
};
