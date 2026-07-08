'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('orders', {
      order_code: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      customer_name: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      customer_lastname: {
        type: Sequelize.STRING(150),
        allowNull: false
      },
      customer_phone: {
        type: Sequelize.STRING(30),
        allowNull: true
      },
      pickup_date: {
        type: Sequelize.DATEONLY,
        allowNull: false
      },
      pickup_time: {
        type: Sequelize.TIME,
        allowNull: false
      },
      status: {
        type: Sequelize.ENUM('pending', 'paid', 'ready', 'cancelled', 'completed'),
        allowNull: false,
        defaultValue: 'pending'
      },
      total_amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00
      },
      payment_status: {
        type: Sequelize.ENUM('pending', 'approved', 'rejected', 'refunded'),
        allowNull: false,
        defaultValue: 'pending'
      },
      payment_method: {
        type: Sequelize.ENUM('card', 'mercadopago', 'cash'),
        allowNull: false,
        defaultValue: 'cash'
      },
      user_code: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'user_code'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      notes: {
        type: Sequelize.STRING(500),
        allowNull: true
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    });

    await queryInterface.addIndex('orders', ['user_code']);
    await queryInterface.addIndex('orders', ['status']);
    await queryInterface.addIndex('orders', ['pickup_date']);
    await queryInterface.addIndex('orders', ['payment_status']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('orders');
  }
};
