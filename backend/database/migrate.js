const { Sequelize, DataTypes } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(process.env.DATABASE_URL || '', {
  dialect: 'postgres',
  logging: false
});

async function migrate() {
  try {
    console.log('🔄 Iniciando migração do banco de dados...\n');
    
    // Testar conexão
    await sequelize.authenticate();
    console.log('✅ Conexão com banco estabelecida\n');
    
    // Criar tabela de empresas
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS empresas (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(255) NOT NULL,
        cnpj VARCHAR(18) NOT NULL UNIQUE,
        codigo VARCHAR(50) NOT NULL UNIQUE,
        email VARCHAR(255) NOT NULL UNIQUE,
        senha VARCHAR(255),
        ativo BOOLEAN DEFAULT FALSE,
        prestador_nome VARCHAR(255),
        prestador_telefone VARCHAR(30),
        logo_url TEXT,
        logo_cloudinary_id VARCHAR(255),
        login_responsavel VARCHAR(80),
        cpf_responsavel VARCHAR(14),
        device_id VARCHAR(255),
        active_token TEXT,
        active_tokens JSONB DEFAULT '[]'::jsonb,
        active_sessions JSONB DEFAULT '[]'::jsonb,
        quantidade_licencas INTEGER DEFAULT 1,
        ultimo_login TIMESTAMP,
        data_inicio_trial TIMESTAMP,
        data_expiracao TIMESTAMP,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Tabela "empresas" criada');

    await sequelize.query(`
      ALTER TABLE empresas
      ADD COLUMN IF NOT EXISTS cpf_responsavel VARCHAR(14),
      ADD COLUMN IF NOT EXISTS prestador_nome VARCHAR(255),
      ADD COLUMN IF NOT EXISTS prestador_telefone VARCHAR(30),
      ADD COLUMN IF NOT EXISTS logo_url TEXT,
      ADD COLUMN IF NOT EXISTS logo_cloudinary_id VARCHAR(255),
      ADD COLUMN IF NOT EXISTS login_responsavel VARCHAR(80),
      ADD COLUMN IF NOT EXISTS device_id VARCHAR(255),
      ADD COLUMN IF NOT EXISTS active_token TEXT,
      ADD COLUMN IF NOT EXISTS active_tokens JSONB DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS active_sessions JSONB DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS quantidade_licencas INTEGER DEFAULT 1,
      ADD COLUMN IF NOT EXISTS ultimo_login TIMESTAMP;
    `);
    console.log('✅ Campos de segurança/licenças garantidos em "empresas"');
    
    // Criar tabela de usuários
    await sequelize.query(`
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
    `);
    console.log('✅ Tabela "usuarios" criada');

    await sequelize.query(`
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
    `);
    console.log('✅ Índices de usuários garantidos');
    
    // Criar tabela de sinistros
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS sinistros (
        id SERIAL PRIMARY KEY,
        empresa_id INTEGER NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
        usuario_id INTEGER REFERENCES usuarios(id),
        numero_sinistro VARCHAR(30) UNIQUE,
        placa_veiculo VARCHAR(10) NOT NULL,
        tipo_atendimento VARCHAR(100) NOT NULL,
        nome_cliente VARCHAR(255),
        observacoes TEXT,
        status VARCHAR(20) DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'em_andamento', 'finalizado', 'cancelado')),
        latitude_inicio DECIMAL(10, 8),
        longitude_inicio DECIMAL(11, 8),
        latitude_fim DECIMAL(10, 8),
        longitude_fim DECIMAL(11, 8),
        quilometragem DECIMAL(10, 2),
        assinatura_url VARCHAR(500),
        assinatura_nome VARCHAR(255),
        pdf_url VARCHAR(500),
        finalizado_em TIMESTAMP,
        sincronizado BOOLEAN DEFAULT TRUE,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS idx_sinistros_empresa ON sinistros(empresa_id);
      CREATE INDEX IF NOT EXISTS idx_sinistros_status ON sinistros(status);
      CREATE INDEX IF NOT EXISTS idx_sinistros_sincronizado ON sinistros(sincronizado);
    `);
    console.log('✅ Tabela "sinistros" criada');
    
    // Criar tabela de fotos
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS fotos (
        id SERIAL PRIMARY KEY,
        sinistro_id INTEGER NOT NULL REFERENCES sinistros(id) ON DELETE CASCADE,
        url VARCHAR(500) NOT NULL,
        cloudinary_id VARCHAR(255) NOT NULL,
        descricao VARCHAR(255),
        ordem INTEGER DEFAULT 0,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS idx_fotos_sinistro ON fotos(sinistro_id);
    `);
    console.log('✅ Tabela "fotos" criada');
    
    // Criar tabela de pagamentos
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS pagamentos (
        id SERIAL PRIMARY KEY,
        empresa_id INTEGER NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
        mercadopago_id VARCHAR(255) UNIQUE,
        valor DECIMAL(10, 2) NOT NULL,
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled', 'refunded')),
        tipo_pagamento VARCHAR(20) NOT NULL CHECK (tipo_pagamento IN ('pix', 'credit_card', 'debit_card')),
        data_pagamento TIMESTAMP,
        data_expiracao TIMESTAMP,
        metadata JSONB,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS idx_pagamentos_empresa ON pagamentos(empresa_id);
      CREATE INDEX IF NOT EXISTS idx_pagamentos_mercadopago ON pagamentos(mercadopago_id);
      CREATE INDEX IF NOT EXISTS idx_pagamentos_status ON pagamentos(status);
    `);
    console.log('✅ Tabela "pagamentos" criada');
    
    // Criar tabela de logs
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS logs (
        id SERIAL PRIMARY KEY,
        empresa_id INTEGER REFERENCES empresas(id),
        usuario_id INTEGER REFERENCES usuarios(id),
        acao VARCHAR(100) NOT NULL,
        entidade VARCHAR(100) NOT NULL,
        entidade_id INTEGER,
        ip VARCHAR(45),
        user_agent TEXT,
        detalhes JSONB,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS idx_logs_empresa ON logs(empresa_id);
      CREATE INDEX IF NOT EXISTS idx_logs_usuario ON logs(usuario_id);
      CREATE INDEX IF NOT EXISTS idx_logs_acao ON logs(acao);
      CREATE INDEX IF NOT EXISTS idx_logs_entidade ON logs(entidade);
    `);
    console.log('✅ Tabela "logs" criada');
    
    console.log('\n✅ Migração concluída com sucesso!');
    
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Erro na migração:', error);
    await sequelize.close();
    process.exit(1);
  }
}

migrate();
