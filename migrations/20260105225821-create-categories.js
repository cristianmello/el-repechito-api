'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('categories', {
      category_code: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      category_name: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      category_slug: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      description: {
        type: Sequelize.STRING(500),
        allowNull: true
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

    await queryInterface.addIndex('categories', ['category_name'], {
      unique: true,
      name: 'idx_categories_name'
    });
    await queryInterface.addIndex('categories', ['category_slug'], {
      unique: true,
      name: 'idx_categories_slug'
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('categories');
  }
};
