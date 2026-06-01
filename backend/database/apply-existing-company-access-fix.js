const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL nao configurada');
  }

  const sqlPath = path.join(__dirname, 'migrations', '20260601_fix_existing_company_access.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  await client.query('BEGIN');

  try {
    await client.query(sql);
    await client.query('COMMIT');
    console.log('Correcao aplicada com sucesso.');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
