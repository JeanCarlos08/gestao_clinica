import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

export default sql;

export async function ensureSchema() {
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(100) UNIQUE NOT NULL,
      display_name VARCHAR(200) DEFAULT '',
      email VARCHAR(200) DEFAULT '',
      password_hash VARCHAR(500) NOT NULL,
      role VARCHAR(50) DEFAULT 'admin',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      last_login TIMESTAMPTZ
    )`;

  await sql`
    CREATE TABLE IF NOT EXISTS pacientes (
      id SERIAL PRIMARY KEY,
      nome VARCHAR(300) NOT NULL,
      slug VARCHAR(300) NOT NULL,
      cpf VARCHAR(20),
      telefone VARCHAR(30),
      email VARCHAR(200),
      data_nascimento DATE,
      sexo VARCHAR(20),
      estado_civil VARCHAR(50),
      profissao VARCHAR(200),
      convenio VARCHAR(200),
      numero_convenio VARCHAR(100),
      empresa VARCHAR(200),
      endereco TEXT,
      contato_emergencia VARCHAR(300),
      telefone_emergencia VARCHAR(30),
      observacoes TEXT,
      foto TEXT,
      criado_em TIMESTAMPTZ DEFAULT NOW(),
      atualizado_em TIMESTAMPTZ DEFAULT NOW()
    )`;

  await sql`
    CREATE TABLE IF NOT EXISTS atendimentos (
      id SERIAL PRIMARY KEY,
      empresa VARCHAR(200) NOT NULL,
      nome VARCHAR(300) NOT NULL,
      modalidade VARCHAR(100) NOT NULL,
      data DATE NOT NULL,
      hora TIME NOT NULL,
      status VARCHAR(50) DEFAULT 'Agendado',
      paciente_id INTEGER REFERENCES pacientes(id) ON DELETE SET NULL,
      criado_em TIMESTAMPTZ DEFAULT NOW()
    )`;

  await sql`
    CREATE TABLE IF NOT EXISTS arquivos (
      id SERIAL PRIMARY KEY,
      filename VARCHAR(500) NOT NULL,
      content BYTEA,
      content_type VARCHAR(100),
      size INTEGER DEFAULT 0,
      criado_em TIMESTAMPTZ DEFAULT NOW()
    )`;

  await sql`
    CREATE TABLE IF NOT EXISTS auditoria (
      id SERIAL PRIMARY KEY,
      acao VARCHAR(200) NOT NULL,
      entidade VARCHAR(100),
      entidade_id VARCHAR(50),
      detalhes TEXT,
      usuario VARCHAR(200),
      criado_em TIMESTAMPTZ DEFAULT NOW()
    )`;

  await sql`
    CREATE TABLE IF NOT EXISTS user_preferences (
      id SERIAL PRIMARY KEY,
      pref_key VARCHAR(200) UNIQUE NOT NULL,
      pref_value TEXT,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`;

  await sql`
    CREATE TABLE IF NOT EXISTS documentos (
      id SERIAL PRIMARY KEY,
      titulo VARCHAR(500) NOT NULL,
      google_doc_id VARCHAR(200),
      tipo VARCHAR(100) DEFAULT 'laudo',
      atendimento_id INTEGER REFERENCES atendimentos(id) ON DELETE SET NULL,
      criado_em TIMESTAMPTZ DEFAULT NOW()
    )`;

  await sql`
    CREATE TABLE IF NOT EXISTS temporary_permissions (
      id SERIAL PRIMARY KEY,
      google_doc_id VARCHAR(200) NOT NULL,
      permission_id VARCHAR(200) NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      revoked BOOLEAN DEFAULT FALSE,
      criado_em TIMESTAMPTZ DEFAULT NOW()
    )`;

  await sql`
    CREATE TABLE IF NOT EXISTS consentimentos (
      id SERIAL PRIMARY KEY,
      titular_nome VARCHAR(300),
      titular_email VARCHAR(200),
      finalidade VARCHAR(200) NOT NULL,
      base_legal VARCHAR(100) NOT NULL,
      aceito BOOLEAN DEFAULT TRUE,
      revogado BOOLEAN DEFAULT FALSE,
      ip_origem VARCHAR(100),
      user_agent TEXT,
      criado_em TIMESTAMPTZ DEFAULT NOW()
    )`;

  await sql`
    CREATE TABLE IF NOT EXISTS login_attempts (
      id SERIAL PRIMARY KEY,
      username VARCHAR(200) NOT NULL,
      ip_address VARCHAR(100),
      sucesso BOOLEAN DEFAULT FALSE,
      tentado_em TIMESTAMPTZ DEFAULT NOW()
    )`;

  await sql`
    CREATE TABLE IF NOT EXISTS lgpd_esquecimentos (
      id SERIAL PRIMARY KEY,
      titular_email VARCHAR(200) NOT NULL,
      titular_hash VARCHAR(200) NOT NULL,
      consentimentos_removidos INTEGER DEFAULT 0,
      atendimentos_anonimizados INTEGER DEFAULT 0,
      executado_em TIMESTAMPTZ DEFAULT NOW()
    )`;

  await sql`
    CREATE TABLE IF NOT EXISTS lgpd_config (
      id SERIAL PRIMARY KEY,
      chave VARCHAR(200) UNIQUE NOT NULL,
      valor TEXT,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`;

  await sql`
    CREATE TABLE IF NOT EXISTS notas (
      id SERIAL PRIMARY KEY,
      titulo VARCHAR(300) NOT NULL,
      conteudo TEXT,
      tags TEXT,
      favorita BOOLEAN DEFAULT FALSE,
      criado_em TIMESTAMPTZ DEFAULT NOW(),
      atualizado_em TIMESTAMPTZ DEFAULT NOW()
    )`;
}
