const { Client } = require('pg');

async function createTables() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.log('⚠️ DATABASE_URL não configurada');
    return; // Não bloqueia a inicialização
  }

  const client = new Client({ connectionString: databaseUrl });

  try {
    console.log('🔄 [DB INIT] Conectando ao banco de dados...');
    await client.connect();
    console.log('✅ [DB INIT] Conectado ao banco de dados');

    console.log('🔄 [DB INIT] Verificando/criando tabela trial_usage...');

    // Criar tabela trial_usage se não existir
    await client.query(`
      CREATE TABLE IF NOT EXISTS trial_usage (
        id SERIAL PRIMARY KEY,
        cpf VARCHAR(14),
        device_id VARCHAR(255),
        empresa_id INTEGER NOT NULL,
        data_uso TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE
      );
    `);

    console.log('✅ [DB INIT] Tabela trial_usage criada/verificada');

    // Criar índices (ignorar erros se já existem)
    try {
      await client.query(`CREATE INDEX IF NOT EXISTS idx_trial_usage_cpf ON trial_usage(cpf);`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_trial_usage_device_id ON trial_usage(device_id);`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_trial_usage_empresa_id ON trial_usage(empresa_id);`);
    } catch (e) {
      console.log('ℹ️ [DB INIT] Índices já existem ou erro menor:', e.message);
    }

    console.log('✅ [DB INIT] Setup de banco de dados concluído!');
    await client.end();
  } catch (error) {
    console.error('⚠️ [DB INIT] Erro durante inicialização:', error.message);
    console.log('ℹ️ [DB INIT] Continuando inicialização mesmo com erro...');
    try {
      await client.end();
    } catch (e) { }
  }
}

// Executar sem bloquear o servidor
createTables().catch(console.error);
