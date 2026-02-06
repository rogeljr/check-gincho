const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function checkSchema() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const result = await pool.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'empresas' ORDER BY ordinal_position;"
    );
    
    console.log('Colunas da tabela empresas:');
    result.rows.forEach(row => console.log(' -', row.column_name));
    
    // Check for required columns
    const requiredCols = [
      'cpf_responsavel', 'device_id', 'active_token', 'ultimo_login', 
      'active_tokens', 'quantidade_licencas', 'data_inicio_trial', 'data_expiracao'
    ];
    
    const existingCols = result.rows.map(r => r.column_name);
    console.log('\nVerificação de colunas necessárias:');
    requiredCols.forEach(col => {
      if (existingCols.includes(col)) {
        console.log(`✅ ${col}`);
      } else {
        console.log(`❌ ${col} - FALTANDO`);
      }
    });
    
  } finally {
    await pool.end();
  }
}

checkSchema().catch(err => {
  console.error('Erro:', err.message);
  process.exit(1);
});
