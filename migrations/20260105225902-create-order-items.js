'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('order_items', {
      order_item_code: {
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
      product_code: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'products',
          key: 'product_code'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      product_name: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      unit_price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      quantity: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      subtotal: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      }
      // timestamps: false (no created_at/updated_at columns)
    });

    await queryInterface.addIndex('order_items', ['order_code']);
    await queryInterface.addIndex('order_items', ['product_code']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('order_items');
  }
};
