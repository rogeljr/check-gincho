import sequelize from './config/database';

const runMigration = async () => {
  try {
    console.log('Executando migração...');
    
    // Adicionar coluna assinatura_timestamp
    await sequelize.query(`
      ALTER TABLE sinistros 
      ADD COLUMN IF NOT EXISTS assinatura_timestamp TIMESTAMP NULL;
    `);
    
    console.log('✅ Migração concluída: coluna assinatura_timestamp adicionada');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro na migração:', error);
    process.exit(1);
  }
};

runMigration();
