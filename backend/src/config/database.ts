import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

// Railway pode fornecer através de DATABASE_URL OU através de variáveis individuais
// Tenta DATABASE_URL primeiro
let sequelize: Sequelize;

const databaseUrl = process.env.DATABASE_URL;

if (databaseUrl && databaseUrl.includes('postgresql://')) {
  console.log('✅ Conectando com DATABASE_URL');
  sequelize = new Sequelize(databaseUrl, {
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: { max: 5, min: 0, acquire: 30000, idle: 10000 },
    dialectOptions: {
      ssl: process.env.NODE_ENV === 'production' ? { require: true, rejectUnauthorized: false } : false
    }
  });
} else {
  // Fallback para variáveis individuais (PGHOST, PGUSER, etc - padrão Railway)
  console.log('✅ Conectando com variáveis individuais (PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE)');
  
  const pgHost = process.env.PGHOST || process.env.DB_HOST || 'localhost';
  const pgPort = parseInt(process.env.PGPORT || process.env.DB_PORT || '5432');
  const pgDatabase = process.env.PGDATABASE || process.env.DB_NAME || 'check_guincho';
  const pgUser = process.env.PGUSER || process.env.DB_USER || 'postgres';
  const pgPassword = process.env.PGPASSWORD || process.env.DB_PASSWORD || '';

  console.log(`📍 Conectando em: ${pgHost}:${pgPort}/${pgDatabase}`);

  sequelize = new Sequelize({
    dialect: 'postgres',
    host: pgHost,
    port: pgPort,
    database: pgDatabase,
    username: pgUser,
    password: pgPassword,
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: { max: 5, min: 0, acquire: 30000, idle: 10000 },
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
