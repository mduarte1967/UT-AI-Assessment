-- 0006 — Outcome-Driven AI Assessment Framework (question bank v2)
--
-- Every question now carries:
--   ref     — the stable code used in the report and the initiative mapping
--             (STR01 … ECO05). For legacy rows it is backfilled with the slug.
--   persona — O (outcome discovery, not scored), M (maturity, scored) or
--             H (hybrid: scored + evidence text).
--
-- The v2 bank is seeded as versao = 2 by the application bootstrap. Existing
-- assessments keep questionario_versao = 1 so their historical answers and
-- generated reports stay readable.

ALTER TABLE questions ADD COLUMN ref TEXT;
ALTER TABLE questions ADD COLUMN persona TEXT NOT NULL DEFAULT 'M';

UPDATE questions SET ref = slug WHERE (ref IS NULL OR ref = '') AND slug IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_questions_versao_ref ON questions(versao, ref);
