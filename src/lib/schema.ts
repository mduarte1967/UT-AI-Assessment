// DDL consolidado — permite que a aplicação funcione em produção mesmo sem
// rodar migrations manualmente (idempotente). Mantido em sincronia com migrations/.
export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS admin_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  senha_hash TEXT NOT NULL,
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS clients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  razao_social TEXT NOT NULL,
  nome_fantasia TEXT,
  tax_id TEXT,
  country TEXT,
  estado TEXT,
  cidade TEXT,
  postal_code TEXT,
  vertical TEXT,
  tamanho_faixa TEXT,
  responsavel_nome TEXT NOT NULL,
  responsavel_email TEXT NOT NULL,
  website TEXT,
  ativo INTEGER NOT NULL DEFAULT 1,
  criado_em TEXT NOT NULL DEFAULT (datetime('now')),
  criado_por TEXT,
  atualizado_em TEXT,
  atualizado_por TEXT,
  excluido_em TEXT,
  excluido_por TEXT
);
CREATE TABLE IF NOT EXISTS assessments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL,
  estado TEXT NOT NULL DEFAULT 'aguardando',
  link_token TEXT NOT NULL UNIQUE,
  expira_em TEXT,
  questionario_versao INTEGER NOT NULL DEFAULT 1,
  submetido_em TEXT,
  reaberto INTEGER NOT NULL DEFAULT 0,
  criado_em TEXT NOT NULL DEFAULT (datetime('now')),
  criado_por TEXT,
  atualizado_em TEXT,
  atualizado_por TEXT
);
CREATE INDEX IF NOT EXISTS idx_assessments_client ON assessments(client_id);
CREATE INDEX IF NOT EXISTS idx_assessments_estado ON assessments(estado);
CREATE TABLE IF NOT EXISTS questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL,
  versao INTEGER NOT NULL DEFAULT 1,
  dimensao TEXT NOT NULL,
  ordem INTEGER NOT NULL,
  texto TEXT NOT NULL,
  tipo TEXT NOT NULL,
  opcoes TEXT,
  obrigatoria INTEGER NOT NULL DEFAULT 1,
  rubrica TEXT,
  ajuda TEXT,
  ativo INTEGER NOT NULL DEFAULT 1
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_questions_versao_ordem ON questions(versao, ordem);
CREATE UNIQUE INDEX IF NOT EXISTS idx_questions_versao_slug ON questions(versao, slug);
CREATE TABLE IF NOT EXISTS responses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  assessment_id INTEGER NOT NULL,
  question_id INTEGER NOT NULL,
  valor TEXT,
  respondido_em TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_responses_unique ON responses(assessment_id, question_id);
CREATE TABLE IF NOT EXISTS dimension_targets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  assessment_id INTEGER NOT NULL,
  dimensao TEXT NOT NULL,
  meta_nivel INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_targets_unique ON dimension_targets(assessment_id, dimensao);
CREATE TABLE IF NOT EXISTS initiatives (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  assessment_id INTEGER NOT NULL,
  ordem INTEGER NOT NULL DEFAULT 1,
  dimensao TEXT,
  nome TEXT NOT NULL,
  problema TEXT,
  beneficio TEXT,
  urgencia INTEGER NOT NULL DEFAULT 2,
  prioridade_calculada TEXT,
  proximo_passo TEXT,
  codigo TEXT,
  kpi TEXT,
  motivo TEXT,
  origem TEXT NOT NULL DEFAULT 'metodo'
);
CREATE TABLE IF NOT EXISTS reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  assessment_id INTEGER NOT NULL,
  versao INTEGER NOT NULL,
  indice_geral REAL NOT NULL,
  conteudo TEXT NOT NULL,
  gerado_em TEXT NOT NULL DEFAULT (datetime('now')),
  pdf_path TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_reports_unique ON reports(assessment_id, versao);
CREATE TABLE IF NOT EXISTS report_access_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  report_id INTEGER,
  assessment_id INTEGER NOT NULL,
  origem TEXT NOT NULL DEFAULT 'cliente',
  ip TEXT,
  user_agent TEXT,
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ator TEXT,
  acao TEXT NOT NULL,
  entidade TEXT NOT NULL,
  entidade_id TEXT,
  detalhe TEXT,
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_audit_entidade ON audit_log(entidade, entidade_id);
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  atualizado_em TEXT NOT NULL DEFAULT (datetime('now')),
  atualizado_por TEXT
);
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  admin_id INTEGER NOT NULL,
  criado_em TEXT NOT NULL DEFAULT (datetime('now')),
  expira_em TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_admin ON sessions(admin_id);
CREATE TABLE IF NOT EXISTS signup_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ip TEXT,
  email TEXT,
  client_id INTEGER,
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_signup_log_ip ON signup_log(ip, criado_em);
`

/**
 * Columns added after the first release. `CREATE TABLE IF NOT EXISTS` above
 * already includes them for fresh databases; these statements upgrade older
 * ones. Each is applied with a swallowed error in the bootstrap loop, so
 * re-running them on an up-to-date schema is harmless.
 */
export const COLUMN_MIGRATIONS = `
ALTER TABLE clients ADD COLUMN tax_id TEXT;
ALTER TABLE clients ADD COLUMN country TEXT;
ALTER TABLE clients ADD COLUMN postal_code TEXT;
ALTER TABLE clients ADD COLUMN website TEXT;
ALTER TABLE initiatives ADD COLUMN codigo TEXT;
ALTER TABLE initiatives ADD COLUMN kpi TEXT;
ALTER TABLE initiatives ADD COLUMN motivo TEXT;
ALTER TABLE initiatives ADD COLUMN origem TEXT NOT NULL DEFAULT 'metodo';
`
