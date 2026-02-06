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
    console.log('🔄 Iniciando migration: segurança (sessão única + anti-abuso trial)...');
    
    // 1. Adicionar campos de segurança na tabela empresas
    console.log('📝 Adicionando campos: cpf_responsavel, device_id, active_token...');
    await pool.query(`
      ALTER TABLE empresas 
      ADD COLUMN IF NOT EXISTS cpf_responsavel VARCHAR(14),
      ADD COLUMN IF NOT EXISTS device_id VARCHAR(255),
      ADD COLUMN IF NOT EXISTS active_token TEXT,
      ADD COLUMN IF NOT EXISTS ultimo_login TIMESTAMP;
    `);
    console.log('✅ Campos adicionados à tabela empresas');
    
    // 2. Criar tabela para rastrear uso de trials
    console.log('📝 Criando tabela trial_usage...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS trial_usage (
        id SERIAL PRIMARY KEY,
        cpf VARCHAR(14),
        device_id VARCHAR(255),
        empresa_id INTEGER REFERENCES empresas(id) ON DELETE CASCADE,
        data_uso TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(cpf, device_id)
      );
    `);
    console.log('✅ Tabela trial_usage criada');
    
    // 3. Criar índices para performance
    console.log('📝 Criando índices...');
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_trial_usage_cpf ON trial_usage(cpf);
      CREATE INDEX IF NOT EXISTS idx_trial_usage_device ON trial_usage(device_id);
      CREATE INDEX IF NOT EXISTS idx_empresas_device ON empresas(device_id);
      CREATE INDEX IF NOT EXISTS idx_empresas_cpf ON empresas(cpf_responsavel);
    `);
    console.log('✅ Índices criados');
    
    console.log('✅ Migration de segurança concluída com sucesso!');
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
