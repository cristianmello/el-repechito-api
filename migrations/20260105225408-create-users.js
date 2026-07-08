'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('users', {
      user_code: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      user_name: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      user_lastname: {
        type: Sequelize.STRING(150),
        allowNull: false
      },
      user_mail: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      user_phone: {
        type: Sequelize.STRING(20),
        allowNull: true
      },
      user_password: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      role_code: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
        references: {
          model: 'roles',
          key: 'role_code'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      is_verified: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal(
          'CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'
        )
      }
    });

    await queryInterface.addIndex('users', ['user_mail'], {
      unique: true,
      name: 'unique_user_mail'
    });

    await queryInterface.addIndex('users', ['role_code']);
    await queryInterface.addIndex('users', ['is_verified']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('users');
  }
};
