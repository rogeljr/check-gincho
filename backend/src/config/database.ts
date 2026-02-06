import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

// Railway fornece essas variáveis automaticamente quando PostgreSQL é adicionado
const databaseUrl = process.env.DATABASE_URL?.trim();

// Se tiver DATABASE_URL direta, usa
if (databaseUrl && databaseUrl !== '') {
  console.log('✅ Conectando via DATABASE_URL...');
} else if (process.env.PGHOST && process.env.PGUSER) {
  // Se forem as variáveis individuais do Postgres que Railway adiciona
  console.log('✅ Conectando via variáveis PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE...');
} else {
  console.error('❌ ERRO CRÍTICO: Variáveis de banco de dados não configuradas!');
  console.error('   DATABASE_URL não está definida');
  console.error('   PGHOST/PGUSER também não estão definidos');
  console.error('');
  console.error('   Variáveis disponíveis:');
  console.error('   DATABASE_URL:', process.env.DATABASE_URL ? '[definida]' : '[indefinida]');
  console.error('   PGHOST:', process.env.PGHOST ? '[definida]' : '[indefinida]');
  console.error('   PGPORT:', process.env.PGPORT ? '[definida]' : '[indefinida]');
  console.error('   PGUSER:', process.env.PGUSER ? '[definida]' : '[indefinida]');
  console.error('   PGPASSWORD:', process.env.PGPASSWORD ? '[definida]' : '[indefinida]');
  console.error('   PGDATABASE:', process.env.PGDATABASE ? '[definida]' : '[indefinida]');
  console.error('');
  console.error('   Ação: Verifique se o PostgreSQL está linkado no Railway');
  process.exit(1);
}

let sequelize: Sequelize;

if (databaseUrl && databaseUrl !== '') {
  sequelize = new Sequelize(databaseUrl, {
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    dialectOptions: {
      ssl: process.env.NODE_ENV === 'production' ? { require: true, rejectUnauthorized: false } : false
    }
  });
} else {
  // Fallback para variáveis individuais (PGHOST, PGPORT, etc)
  sequelize = new Sequelize({
    dialect: 'postgres',
    host: process.env.PGHOST || process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.PGPORT || process.env.DB_PORT || '5432'),
    database: process.env.PGDATABASE || process.env.DB_NAME || 'check_guincho',
    username: process.env.PGUSER || process.env.DB_USER || 'postgres',
    password: process.env.PGPASSWORD || process.env.DB_PASSWORD || '',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    dialectOptions: {
      ssl: process.env.NODE_ENV === 'production' ? { require: true, rejectUnauthorized: false } : false
    }
  });
}

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
