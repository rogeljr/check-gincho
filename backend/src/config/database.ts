import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

// Railway fornece DATABASE_URL automaticamente quando PostgreSQL é adicionado
const databaseUrl = process.env.DATABASE_URL?.trim();

if (!databaseUrl) {
  console.error('❌ ERRO CRÍTICO: DATABASE_URL não foi definida!');
  console.error('   No Railway: Adicione um plugin PostgreSQL ao seu projeto');
  console.error('   Localmente: Configure a variável DATABASE_URL no arquivo .env');
  process.exit(1);
}

console.log('✅ Conectando ao banco de dados via DATABASE_URL...');

const sequelize = new Sequelize(databaseUrl, {
  dialect: 'postgres',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  // Importante para Railway/containers
  dialectOptions: {
    ssl: process.env.NODE_ENV === 'production' ? { require: true, rejectUnauthorized: false } : false
  }
});

export const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Conexão com o banco de dados estabelecida com sucesso!');
    return true;
  } catch (error) {
    console.error('❌ Erro ao conectar com o banco de dados:', error);
    return false;
  }
};

export default sequelize;
