-- Controle de usuarios por licenca e campos adicionados recentemente.
-- Rode no banco de producao antes de publicar o backend novo.

ALTER TABLE empresas
  ADD COLUMN IF NOT EXISTS prestador_nome VARCHAR(255),
  ADD COLUMN IF NOT EXISTS prestador_telefone VARCHAR(30),
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS logo_cloudinary_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS login_responsavel VARCHAR(80),
  ADD COLUMN IF NOT EXISTS active_sessions JSONB DEFAULT '[]'::jsonb;

UPDATE empresas
SET active_sessions = '[]'::jsonb
WHERE active_sessions IS NULL;

ALTER TABLE empresas
  ALTER COLUMN active_sessions SET DEFAULT '[]'::jsonb;

CREATE TABLE IF NOT EXISTS usuarios (
  id SERIAL PRIMARY KEY,
  empresa_id INTEGER NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  login VARCHAR(80) NOT NULL,
  email VARCHAR(255),
  senha VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'operador' CHECK (role IN ('admin', 'operador', 'visualizador')),
  ativo BOOLEAN DEFAULT TRUE,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS login VARCHAR(80),
  ALTER COLUMN email DROP NOT NULL;

UPDATE usuarios
SET login = lower(COALESCE(login, email, 'usuario-' || id))
WHERE login IS NULL OR login = '';

ALTER TABLE usuarios
  ALTER COLUMN login SET NOT NULL;

DROP INDEX IF EXISTS idx_usuarios_empresa_email_unique;

CREATE UNIQUE INDEX IF NOT EXISTS idx_usuarios_empresa_login_unique
  ON usuarios (empresa_id, lower(login));

CREATE INDEX IF NOT EXISTS idx_usuarios_empresa_ativo
  ON usuarios (empresa_id, ativo);

CREATE INDEX IF NOT EXISTS idx_logs_usuario
  ON logs(usuario_id);
