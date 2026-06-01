const { Client } = require('pg');

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL nao configurada');
  }

  const codigo = process.env.COMPANY_CODE;
  const dias = Number(process.env.ACCESS_DAYS || 7);

  if (!codigo) {
    throw new Error('COMPANY_CODE nao configurado');
  }

  if (!Number.isInteger(dias) || dias < 1 || dias > 365) {
    throw new Error('ACCESS_DAYS deve ser um numero inteiro entre 1 e 365');
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();

  const result = await client.query(
    `
      UPDATE empresas
      SET ativo = TRUE,
          data_expiracao = NOW() + ($2::int * INTERVAL '1 day')
      WHERE codigo = $1
      RETURNING id, nome, codigo, ativo, data_expiracao;
    `,
    [codigo, dias]
  );

  if (result.rowCount === 0) {
    throw new Error(`Empresa nao encontrada: ${codigo}`);
  }

  console.table(result.rows);
  await client.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
