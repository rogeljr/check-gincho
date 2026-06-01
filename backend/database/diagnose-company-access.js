const { Client } = require('pg');

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL nao configurada');
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();

  const summary = await client.query(`
    SELECT
      count(*)::int AS total,
      count(*) FILTER (WHERE senha IS NOT NULL AND senha <> '')::int AS com_senha,
      count(*) FILTER (WHERE senha IS NOT NULL AND senha <> '' AND ativo = false)::int AS com_senha_inativa,
      count(*) FILTER (WHERE login_responsavel IS NULL OR login_responsavel = '')::int AS sem_login_responsavel,
      count(*) FILTER (
        WHERE active_tokens IS NULL
          OR active_sessions IS NULL
          OR quantidade_licencas IS NULL
          OR quantidade_licencas < 1
      )::int AS campos_licenca_pendentes,
      count(*) FILTER (WHERE senha IS NOT NULL AND senha <> '' AND data_expiracao IS NULL)::int AS com_senha_sem_expiracao
    FROM empresas;
  `);

  console.log('Resumo:');
  console.table(summary.rows);

  const sample = await client.query(`
    SELECT
      id,
      nome,
      codigo,
      ativo,
      login_responsavel,
      cpf_responsavel,
      cnpj,
      quantidade_licencas,
      data_inicio_trial,
      data_expiracao,
      senha IS NOT NULL AND senha <> '' AS tem_senha
    FROM empresas
    ORDER BY id
    LIMIT 10;
  `);

  console.log('Amostra:');
  console.table(sample.rows);

  await client.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
