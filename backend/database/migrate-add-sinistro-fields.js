const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(process.env.DATABASE_URL || '', {
  dialect: 'postgres',
  logging: false,
});

async function migrate() {
  try {
    console.log('🔄 Adicionando colunas extras em sinistros...');
    await sequelize.authenticate();

    const alterSql = `
      ALTER TABLE sinistros
        ADD COLUMN IF NOT EXISTS cpf_cliente VARCHAR(20),
        ADD COLUMN IF NOT EXISTS telefone_cliente VARCHAR(30),
        ADD COLUMN IF NOT EXISTS modelo_veiculo VARCHAR(255),
        ADD COLUMN IF NOT EXISTS cor_veiculo VARCHAR(50),
        ADD COLUMN IF NOT EXISTS origem_endereco TEXT,
        ADD COLUMN IF NOT EXISTS destino_endereco TEXT;
    `;

    await sequelize.query(alterSql);
    console.log('✅ Colunas adicionadas com sucesso!');

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao adicionar colunas:', error);
    await sequelize.close();
    process.exit(1);
  }
}

migrate();
