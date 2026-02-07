require('dotenv').config();
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(process.env.DATABASE_URL || '', {
  dialect: 'postgres',
  logging: false
});

async function migrate() {
  try {
    console.log('🔄 Conectando ao banco de dados...');
    await sequelize.authenticate();
    console.log('✅ Conexão estabelecida\n');

    console.log('🔄 Adicionando coluna numero_sinistro...');
    await sequelize.query(`
      ALTER TABLE sinistros ADD COLUMN IF NOT EXISTS numero_sinistro VARCHAR(30) UNIQUE;
    `);
    console.log('✅ Coluna numero_sinistro adicionada com sucesso!\n');

    console.log('🔄 Verificando estrutura da tabela...');
    const columns = await sequelize.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'sinistros'
      ORDER BY ordinal_position;
    `);
    
    console.log('📋 Colunas da tabela sinistros:');
    columns[0].forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type}`);
    });
    
    console.log('\n✅ Migração concluída!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro durante migração:', error.message);
    process.exit(1);
  }
}

migrate();
