'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableExists = await queryInterface.tableExists('trial_usage');
    
    if (tableExists) {
      console.log('Tabela trial_usage já existe');
      return;
    }
    
    await queryInterface.createTable('trial_usage', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      cpf: {
        type: Sequelize.STRING(14),
        allowNull: true
      },
      device_id: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      empresa_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'empresas',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      data_uso: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      createdAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Criar índices
    await queryInterface.addIndex('trial_usage', ['cpf']);
    await queryInterface.addIndex('trial_usage', ['device_id']);
    await queryInterface.addIndex('trial_usage', ['empresa_id']);
    
    console.log('✅ Tabela trial_usage criada com sucesso');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('trial_usage');
  }
};
