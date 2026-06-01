-- Correcoes para empresas cadastradas antes do fluxo com login separado.
-- Rode em producao depois de fazer backup do banco.

ALTER TABLE empresas
  ADD COLUMN IF NOT EXISTS cpf_responsavel VARCHAR(14),
  ADD COLUMN IF NOT EXISTS login_responsavel VARCHAR(80),
  ADD COLUMN IF NOT EXISTS active_tokens JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS active_sessions JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS quantidade_licencas INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS data_inicio_trial TIMESTAMP,
  ADD COLUMN IF NOT EXISTS data_expiracao TIMESTAMP;

UPDATE empresas
SET
  login_responsavel = COALESCE(NULLIF(login_responsavel, ''), NULLIF(cpf_responsavel, ''), cnpj),
  active_tokens = COALESCE(active_tokens, '[]'::jsonb),
  active_sessions = COALESCE(active_sessions, '[]'::jsonb),
  quantidade_licencas = COALESCE(NULLIF(quantidade_licencas, 0), 1),
  ativo = CASE WHEN senha IS NOT NULL AND senha <> '' THEN TRUE ELSE ativo END,
  data_inicio_trial = COALESCE(data_inicio_trial, "createdAt", NOW()),
  data_expiracao = CASE
    WHEN senha IS NOT NULL AND senha <> '' AND data_expiracao IS NULL THEN NOW() + INTERVAL '7 days'
    ELSE data_expiracao
  END
WHERE
  login_responsavel IS NULL
  OR login_responsavel = ''
  OR active_tokens IS NULL
  OR active_sessions IS NULL
  OR quantidade_licencas IS NULL
  OR quantidade_licencas < 1
  OR (senha IS NOT NULL AND senha <> '' AND ativo = FALSE)
  OR data_inicio_trial IS NULL
  OR (senha IS NOT NULL AND senha <> '' AND data_expiracao IS NULL);

ALTER TABLE empresas
  ALTER COLUMN active_tokens SET DEFAULT '[]'::jsonb,
  ALTER COLUMN active_tokens SET NOT NULL,
  ALTER COLUMN active_sessions SET DEFAULT '[]'::jsonb,
  ALTER COLUMN active_sessions SET NOT NULL,
  ALTER COLUMN quantidade_licencas SET DEFAULT 1,
  ALTER COLUMN quantidade_licencas SET NOT NULL;

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
