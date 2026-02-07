module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('pagamentos', 'quantidade_licencas_solicitadas', {
      type: Sequelize.INTEGER,
      defaultValue: 1,
      allowNull: false,
      after: 'data_expiracao'
    });

    console.log('✅ Coluna quantidade_licencas_solicitadas adicionada à tabela pagamentos');
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('pagamentos', 'quantidade_licencas_solicitadas');
    console.log('⏮️  Coluna quantidade_licencas_solicitadas removida da tabela pagamentos');
  }
};
