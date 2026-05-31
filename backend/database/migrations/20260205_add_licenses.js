const { Pool } = require('pg');

async function migrate() {
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    throw new Error('DATABASE_URL não configurada');
  }

  const pool = new Pool({
    connectionString,
    ssl: process.env.NODE_ENV === 'production' ? {
      rejectUnauthorized: false
    } : false
  });

  try {
    console.log('🔄 Iniciando migration: sistema de licenças múltiplas...');
    
    // 1. Adicionar campos de licenças na tabela empresas
    console.log('📝 Adicionando campos: quantidade_licencas, active_tokens...');
    await pool.query(`
      ALTER TABLE empresas 
      ADD COLUMN IF NOT EXISTS quantidade_licencas INTEGER DEFAULT 1,
      ADD COLUMN IF NOT EXISTS active_tokens JSONB DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS active_sessions JSONB DEFAULT '[]'::jsonb;
    `);
    console.log('✅ Campos adicionados à tabela empresas');
    
    // 2. Criar índice para performance
    console.log('📝 Criando índices...');
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_empresas_quantidade_licencas ON empresas(quantidade_licencas);
    `);
    console.log('✅ Índices criados');
    
    console.log('✅ Migration de licenças concluída com sucesso!');
  } catch (error) {
    console.error('❌ Erro na migration:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  migrate()
    .then(() => {
      console.log('✅ Migration executada com sucesso');
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ Erro ao executar migration:', err);
      process.exit(1);
    });
}

module.exports = { migrate };
