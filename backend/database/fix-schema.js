const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function fixSchema() {
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
    console.log('🔧 [CORRIGIR SCHEMA] Adicionando todas as colunas do Empresa...\n');

    const sqlCommands = [
      // Colunas da anti-abuse system
      'ALTER TABLE empresas ADD COLUMN IF NOT EXISTS "cpf_responsavel" VARCHAR(14);',
      
      // Colunas de device/session
      'ALTER TABLE empresas ADD COLUMN IF NOT EXISTS "device_id" VARCHAR(255);',
      'ALTER TABLE empresas ADD COLUMN IF NOT EXISTS "active_token" TEXT;',
      'ALTER TABLE empresas ADD COLUMN IF NOT EXISTS "ultimo_login" TIMESTAMP WITH TIME ZONE;',
      
      // Colunas do multi-license system
      'ALTER TABLE empresas ADD COLUMN IF NOT EXISTS "active_tokens" JSONB DEFAULT \'[]\'::jsonb;',
      'ALTER TABLE empresas ADD COLUMN IF NOT EXISTS "quantidade_licencas" INTEGER DEFAULT 1;',
      
      // Colunas de trial/subscription
      'ALTER TABLE empresas ADD COLUMN IF NOT EXISTS "data_inicio_trial" TIMESTAMP WITH TIME ZONE;',
      'ALTER TABLE empresas ADD COLUMN IF NOT EXISTS "data_expiracao" TIMESTAMP WITH TIME ZONE;',
      
      // Coluna de pagamentos
      'ALTER TABLE pagamentos ADD COLUMN IF NOT EXISTS "quantidade_licencas_solicitadas" INTEGER DEFAULT 1;',
    ];

    for (const sql of sqlCommands) {
      try {
        await pool.query(sql);
        const colName = sql.match(/"([^"]+)"/)[1];
        console.log(`✅ ${colName}`);
      } catch (error) {
        if (error.message.includes('already exists')) {
          const colName = sql.match(/"([^"]+)"/)[1];
          console.log(`⚠️  ${colName} - já existe`);
        } else {
          throw error;
        }
      }
    }

    // Create indexes
    console.log('\n📊 Criando índices...');
    try {
      await pool.query('CREATE INDEX IF NOT EXISTS idx_empresas_quantidade_licencas ON empresas(quantidade_licencas);');
      console.log('✅ Índice de quantidade_licencas criado');
    } catch (error) {
      if (!error.message.includes('already exists')) {
        console.log('⚠️  Índice já existe');
      }
    }

    console.log('\n✅ Schema corrigido com sucesso!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao corrigir schema:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

fixSchema();
