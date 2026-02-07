// Script para executar migration no Railway
// Uso: node backend/database/run-migration.js 20260205_fix_url_length

const path = require('path');

const migrationName = process.argv[2];

if (!migrationName) {
  console.error('❌ Erro: especifique o nome da migration');
  console.log('Uso: node run-migration.js <nome_da_migration>');
  console.log('Exemplo: node run-migration.js 20260205_fix_url_length');
  process.exit(1);
}

const migrationPath = path.join(__dirname, 'migrations', migrationName);

try {
  const migration = require(migrationPath);
  
  if (typeof migration.migrate === 'function') {
    migration.migrate()
      .then(() => {
        console.log(`✅ Migration ${migrationName} executada com sucesso!`);
        process.exit(0);
      })
      .catch((error) => {
        console.error(`❌ Erro ao executar migration ${migrationName}:`, error);
        process.exit(1);
      });
  } else {
    console.error(`❌ Migration ${migrationName} não exporta função migrate()`);
    process.exit(1);
  }
} catch (error) {
  console.error(`❌ Erro ao carregar migration ${migrationName}:`, error);
  process.exit(1);
}
