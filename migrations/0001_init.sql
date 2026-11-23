-- readiness-app-lite · schema inicial (modelo da Seção 4 da especificação)
-- Todas as tabelas guardam trilha de auditoria simples (quem criou/editou e quando).

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
  cnpj TEXT,
  vertical TEXT,
  tamanho_faixa TEXT,
  responsavel_nome TEXT NOT NULL,
  responsavel_email TEXT NOT NULL,
  cidade TEXT,
  estado TEXT,
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
  client_id INTEGER NOT NULL REFERENCES clients(id),
  estado TEXT NOT NULL DEFAULT 'aguardando',   -- aguardando | em_preenchimento | submetido | gerado
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
  tipo TEXT NOT NULL,                 -- escala | escolha | multipla | texto
  opcoes TEXT,                        -- JSON: [{label, level}] ou [{label}]
  obrigatoria INTEGER NOT NULL DEFAULT 1,
  rubrica TEXT,                       -- JSON: {labels:[5], levels:[5]} para escala
  ajuda TEXT,
  ativo INTEGER NOT NULL DEFAULT 1
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_questions_versao_ordem ON questions(versao, ordem);
CREATE UNIQUE INDEX IF NOT EXISTS idx_questions_versao_slug ON questions(versao, slug);

CREATE TABLE IF NOT EXISTS responses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  assessment_id INTEGER NOT NULL REFERENCES assessments(id),
  question_id INTEGER NOT NULL REFERENCES questions(id),
  valor TEXT,                         -- JSON
  respondido_em TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_responses_unique ON responses(assessment_id, question_id);

CREATE TABLE IF NOT EXISTS dimension_targets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  assessment_id INTEGER NOT NULL REFERENCES assessments(id),
  dimensao TEXT NOT NULL,
  meta_nivel INTEGER NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_targets_unique ON dimension_targets(assessment_id, dimensao);

CREATE TABLE IF NOT EXISTS initiatives (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  assessment_id INTEGER NOT NULL REFERENCES assessments(id),
  ordem INTEGER NOT NULL DEFAULT 1,
  dimensao TEXT,
  nome TEXT NOT NULL,
  problema TEXT,
  beneficio TEXT,
  urgencia INTEGER NOT NULL DEFAULT 2,   -- 1 baixa · 2 média · 3 alta
  prioridade_calculada TEXT,
  proximo_passo TEXT
);

CREATE TABLE IF NOT EXISTS reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  assessment_id INTEGER NOT NULL REFERENCES assessments(id),
  versao INTEGER NOT NULL,
  indice_geral REAL NOT NULL,
  conteudo TEXT NOT NULL,             -- JSON: scorecard, radar, iniciativas, plano_90d
  gerado_em TEXT NOT NULL DEFAULT (datetime('now')),
  pdf_path TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_reports_unique ON reports(assessment_id, versao);

CREATE TABLE IF NOT EXISTS report_access_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  report_id INTEGER,
  assessment_id INTEGER NOT NULL,
  origem TEXT NOT NULL DEFAULT 'cliente',  -- cliente | admin
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
