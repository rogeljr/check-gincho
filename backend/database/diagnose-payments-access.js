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

  const result = await client.query(`
    SELECT
      e.id,
      e.nome,
      e.codigo,
      e.data_expiracao,
      COALESCE(count(p.id) FILTER (WHERE p.status = 'approved'), 0)::int AS pagamentos_aprovados,
      max(p.data_expiracao) FILTER (WHERE p.status = 'approved') AS maior_expiracao_paga
    FROM empresas e
    LEFT JOIN pagamentos p ON p.empresa_id = e.id
    GROUP BY e.id, e.nome, e.codigo, e.data_expiracao
    ORDER BY e.id;
  `);

  console.table(result.rows);
  await client.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
