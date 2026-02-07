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
    console.log('🔄 Iniciando migration: corrigir problemas de produção...');
    
    // 1. Aumentar tamanho do campo url na tabela fotos de VARCHAR(500) para VARCHAR(2000)
    console.log('📝 Alterando tamanho do campo url...');
    await pool.query(`
      ALTER TABLE fotos 
      ALTER COLUMN url TYPE VARCHAR(2000);
    `);
    console.log('✅ Campo url aumentado de 500 para 2000 caracteres');
    
    // 2. Alterar tipo_pagamento de ENUM para VARCHAR para aceitar todos os tipos do Mercado Pago
    console.log('📝 Alterando tipo_pagamento de ENUM para VARCHAR...');
    await pool.query(`
      ALTER TABLE pagamentos 
      ALTER COLUMN tipo_pagamento TYPE VARCHAR(50);
    `);
    console.log('✅ Campo tipo_pagamento agora aceita qualquer valor do Mercado Pago');
    
    console.log('✅ Migration concluída com sucesso!');
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
