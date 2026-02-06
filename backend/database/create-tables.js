const { Client } = require('pg');

async function createTables() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.log('⚠️ DATABASE_URL não configurada, pulando criação de tabelas');
    process.exit(0);
  }

  const client = new Client({ connectionString: databaseUrl });

  try {
    console.log('🔄 Conectando ao banco de dados...');
    await client.connect();
    console.log('✅ Conectado ao banco de dados');

    console.log('🔄 Verificando/criando tabela trial_usage...');

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

    console.log('✅ Tabela trial_usage criada/verificada');

    // Criar índices (ignorar erros se já existem)
    try {
      await client.query(`CREATE INDEX idx_trial_usage_cpf ON trial_usage(cpf);`);
    } catch (e) { }
    
    try {
      await client.query(`CREATE INDEX idx_trial_usage_device_id ON trial_usage(device_id);`);
    } catch (e) { }
    
    try {
      await client.query(`CREATE INDEX idx_trial_usage_empresa_id ON trial_usage(empresa_id);`);
    } catch (e) { }

    console.log('✅ Índices verificados/criados');
    console.log('✅ Setup de banco de dados concluído com sucesso');

    await client.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao criar tabelas:', error.message);
    try {
      await client.end();
    } catch (e) { }
    process.exit(1);
  }
}

createTables();
