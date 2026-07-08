'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('payments', {
      payment_code: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      order_code: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'orders',
          key: 'order_code'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      provider: {
        type: Sequelize.ENUM('mercadopago', 'card', 'cash'),
        allowNull: false
      },
      provider_payment_id: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      currency: {
        type: Sequelize.STRING(10),
        allowNull: false,
        defaultValue: 'UYU'
      },
      status: {
        type: Sequelize.ENUM('pending', 'approved', 'rejected', 'refunded'),
        allowNull: false,
        defaultValue: 'pending'
      },
      raw_response: {
        type: Sequelize.JSON,
        allowNull: true
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
      // updated_at: false (del model)
    });

    await queryInterface.addIndex('payments', ['order_code']);
    await queryInterface.addIndex('payments', ['provider_payment_id']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('payments');
  }
};
