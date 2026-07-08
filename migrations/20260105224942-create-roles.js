'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('roles', {
      role_code: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },

      role_name: {
        type: Sequelize.STRING(50),
        allowNull: false
      },

      role_description: {
        type: Sequelize.TEXT,
        allowNull: true
      }
    });

    // 🔹 índice único con nombre (como en el modelo)
    await queryInterface.addIndex('roles', ['role_name'], {
      unique: true,
      name: 'idx_unique_role_name'
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('roles');
  }
};
