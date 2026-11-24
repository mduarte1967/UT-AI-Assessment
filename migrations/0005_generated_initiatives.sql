-- Iniciativas passam a ser geradas pelo método a partir da biblioteca curada,
-- em função do índice geral e dos gaps por dimensão. O cliente já não declara
-- iniciativas, por isso a tabela ganha os campos que identificam a origem.
ALTER TABLE initiatives ADD COLUMN codigo TEXT;
ALTER TABLE initiatives ADD COLUMN kpi TEXT;
ALTER TABLE initiatives ADD COLUMN motivo TEXT;
ALTER TABLE initiatives ADD COLUMN origem TEXT NOT NULL DEFAULT 'metodo';
