const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function runMigrations() {
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    console.error('❌ DATABASE_URL não configurada em .env');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString,
    ssl: process.env.NODE_ENV === 'production' ? {
      rejectUnauthorized: false
    } : false
  });

  try {
    console.log('🔄 Iniciando migrations...\n');

    // Migration 1: Add licenses
    console.log('📝 [1/3] Adicionando campos de licenças (quantidade_licencas, active_tokens)...');
    try {
      await pool.query(`
        ALTER TABLE empresas 
        ADD COLUMN IF NOT EXISTS quantidade_licencas INTEGER DEFAULT 1,
        ADD COLUMN IF NOT EXISTS active_tokens JSONB DEFAULT '[]'::jsonb,
        ADD COLUMN IF NOT EXISTS cpf_responsavel VARCHAR(11),
        ADD COLUMN IF NOT EXISTS active_token VARCHAR(255);
      `);
      console.log('✅ Campos de licenças adicionados com sucesso!\n');
    } catch (error) {
      console.log('⚠️  Campos j├á existem (OK)\n');
    }

    // Migration 2: Add quantity to payments
    console.log('📝 [2/3] Adicionando campo quantidade_licencas_solicitadas em pagamentos...');
    try {
      await pool.query(`
        ALTER TABLE pagamentos 
        ADD COLUMN IF NOT EXISTS quantidade_licencas_solicitadas INTEGER DEFAULT 1;
      `);
      console.log('✅ Campo quantidade_licencas_solicitadas adicionado com sucesso!\n');
    } catch (error) {
      console.log('⚠️  Campo j├á existe (OK)\n');
    }

    // Migration 3: Create index
    console.log('📝 [3/3] Criando índice para performance...');
    try {
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_empresas_quantidade_licencas 
        ON empresas(quantidade_licencas);
      `);
      console.log('✅ Índice criado com sucesso!\n');
    } catch (error) {
      console.log('⚠️  Índice j├á existe (OK)\n');
    }

    console.log('✅ Todas as migrations executadas com sucesso!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao executar migrations:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigrations();
