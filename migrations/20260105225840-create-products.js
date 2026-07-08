'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('products', {
      product_code: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      product_name: {
        type: Sequelize.STRING(200),
        allowNull: false
      },
      product_slug: {
        type: Sequelize.STRING(200),
        allowNull: false
      },
      short_description: {
        type: Sequelize.STRING(500),
        allowNull: true
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      image_url: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      stock: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      unit: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'unidad'
      },
      sku: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      barcode: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      category_code: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'categories',
          key: 'category_code'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
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

    await queryInterface.addIndex('products', ['product_slug'], {
      unique: true,
      name: 'idx_product_slug'
    });
    await queryInterface.addIndex('products', ['category_code']);
    await queryInterface.addIndex('products', ['is_active']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('products');
  }
};
