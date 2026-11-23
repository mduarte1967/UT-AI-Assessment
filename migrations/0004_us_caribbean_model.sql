-- Modelo de cliente para EUA/Caribe: Tax ID (EIN), país, ZIP e site.
-- Substitui o campo brasileiro `cnpj` (mantido na tabela para não perder dados
-- históricos, mas a aplicação passou a usar `tax_id`).
ALTER TABLE clients ADD COLUMN tax_id TEXT;
ALTER TABLE clients ADD COLUMN country TEXT;
ALTER TABLE clients ADD COLUMN postal_code TEXT;
ALTER TABLE clients ADD COLUMN website TEXT;

-- Auto-cadastro público (botão no site da UT → formulário → e-mail com o link).
CREATE TABLE IF NOT EXISTS signup_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ip TEXT,
  email TEXT,
  client_id INTEGER,
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_signup_log_ip ON signup_log(ip, criado_em);

-- Padrões do auto-cadastro (ligado por default).
INSERT INTO settings (key, value) VALUES ('self_signup', '1')
  ON CONFLICT(key) DO NOTHING;
INSERT INTO settings (key, value) VALUES ('signup_contact_email', '')
  ON CONFLICT(key) DO NOTHING;
