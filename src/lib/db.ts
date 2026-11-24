import { QUESTIONS, DIMENSIONS, QUESTION_BANK_VERSION } from './questions'
import type { QRow } from './scoring'
import { hashPassword } from './auth'
import { nowIso } from './util'

export type Env = {
  DB: D1Database
  APP_NAME?: string
  LINK_TTL_DAYS?: string
  ADMIN_EMAIL?: string
  ADMIN_PASSWORD?: string
  RESEND_API_KEY?: string
  MAIL_FROM?: string
}

export type ClientRow = {
  id: number
  razao_social: string
  nome_fantasia: string | null
  tax_id: string | null
  country: string | null
  estado_uf: string | null
  cidade: string | null
  postal_code: string | null
  website: string | null
  vertical: string | null
  tamanho_faixa: string | null
  responsavel_nome: string
  responsavel_email: string
  ativo: number
  criado_em: string
  excluido_em: string | null
}

let seedPromise: Promise<void> | null = null

/** Bump when the seeded content changes (e.g. language of the question bank). */
const SEED_VERSION = '5'

/** Legacy Portuguese option values written by v1 of the app, mapped to the English labels. */
const LEGACY_VERTICAIS: Record<string, string> = {
  'Saúde': 'Healthcare',
  'Financeiro': 'Financial services',
  'Varejo': 'Retail',
  'Indústria': 'Manufacturing',
  'Tecnologia': 'Technology',
  'Educação': 'Education',
  'Logística': 'Logistics',
  'Energia': 'Energy',
  'Serviços': 'Services',
  'Setor público': 'Public sector',
  'Outro': 'Other',
}

const LEGACY_PORTES: Record<string, string> = {
  '1 a 50 funcionários': '1 to 50 employees',
  '51 a 200 funcionários': '51 to 200 employees',
  '201 a 500 funcionários': '201 to 500 employees',
  '501 a 1.000 funcionários': '501 to 1,000 employees',
  '1.001 a 5.000 funcionários': '1,001 to 5,000 employees',
  'Mais de 5.000 funcionários': 'More than 5,000 employees',
}

/** Ensures the base schema (production) + the seeded question bank + initial admin. Idempotent. */
export async function ensureSeed(env: Env): Promise<void> {
  if (seedPromise) return seedPromise
  seedPromise = (async () => {
    const db = env.DB
    const marker = await db
      .prepare("SELECT value FROM settings WHERE key = 'seed_version'")
      .first<{ value: string }>()
      .catch(() => null)

    if (marker?.value === SEED_VERSION) return

    // Question bank v2 — the Outcome-Driven AI Assessment Framework.
    //
    // The legacy v1 bank is left untouched: assessments created before the
    // change keep questionario_versao = 1 and their answers stay readable.
    // Within v2 the upsert is keyed on (versao, slug) so question ids — and
    // therefore already collected drafts — stay stable across rewordings.
    const { results: existingRows } = await db
      .prepare('SELECT id, slug FROM questions WHERE versao = ?')
      .bind(QUESTION_BANK_VERSION)
      .all<{ id: number; slug: string }>()
    const existingBySlug = new Map((existingRows || []).map((r) => [r.slug, r.id]))

    const insStmt = db.prepare(
      `INSERT OR IGNORE INTO questions
        (slug, ref, persona, versao, dimensao, ordem, texto, tipo, opcoes, obrigatoria, rubrica, ajuda, ativo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`
    )
    const updStmt = db.prepare(
      `UPDATE questions
          SET ref = ?, persona = ?, dimensao = ?, ordem = ?, texto = ?, tipo = ?, opcoes = ?,
              obrigatoria = ?, rubrica = ?, ajuda = ?, ativo = 1
        WHERE versao = ? AND slug = ?`
    )

    const batch = QUESTIONS.map((q) => {
      const opcoes = q.opcoes ? JSON.stringify(q.opcoes) : null
      const rubrica = q.rubrica ? JSON.stringify(q.rubrica) : null
      const obrigatoria = q.obrigatoria ? 1 : 0
      return existingBySlug.has(q.slug)
        ? updStmt.bind(
            q.ref,
            q.persona,
            q.dimensao,
            q.ordem,
            q.texto,
            q.tipo,
            opcoes,
            obrigatoria,
            rubrica,
            q.ajuda ?? null,
            QUESTION_BANK_VERSION,
            q.slug
          )
        : insStmt.bind(
            q.slug,
            q.ref,
            q.persona,
            QUESTION_BANK_VERSION,
            q.dimensao,
            q.ordem,
            q.texto,
            q.tipo,
            opcoes,
            obrigatoria,
            rubrica,
            q.ajuda ?? null
          )
    })
    for (let i = 0; i < batch.length; i += 20) {
      await db.batch(batch.slice(i, i + 20))
    }

    // Backfill ref on legacy rows so historical reports keep their traceability.
    await db
      .prepare("UPDATE questions SET ref = slug WHERE (ref IS NULL OR ref = '') AND slug IS NOT NULL")
      .run()
      .catch(() => undefined)

    // Initial administrator
    const admins = await db.prepare('SELECT COUNT(*) AS n FROM admin_users').first<{ n: number }>()
    if (!admins || Number(admins.n) === 0) {
      const email = env.ADMIN_EMAIL || 'admin@unifiedtech.com'
      const senha = env.ADMIN_PASSWORD || 'Unified@2026'
      await db
        .prepare('INSERT INTO admin_users (nome, email, senha_hash) VALUES (?, ?, ?)')
        .bind('Practice Administrator', email, await hashPassword(senha))
        .run()
    }

    // Translate client attributes captured while the app was in Portuguese.
    for (const [pt, en] of Object.entries(LEGACY_VERTICAIS)) {
      await db.prepare('UPDATE clients SET vertical = ? WHERE vertical = ?').bind(en, pt).run()
    }
    for (const [pt, en] of Object.entries(LEGACY_PORTES)) {
      await db.prepare('UPDATE clients SET tamanho_faixa = ? WHERE tamanho_faixa = ?').bind(en, pt).run()
    }

    // Translate stored settings that still hold the Portuguese defaults.
    await db
      .prepare(
        `UPDATE settings SET value = ?
          WHERE key = 'mail_subject' AND value LIKE 'Convite —%'`
      )
      .bind('Invitation — AI Maturity Assessment · {{empresa}}')
      .run()
    await db
      .prepare(
        `UPDATE settings SET value = ?
          WHERE key = 'mail_intro' AND value LIKE 'A Unified Technologies preparou%'`
      )
      .bind(
        'Unified Technologies has prepared the artificial intelligence readiness assessment for {{empresa}}. It covers 7 dimensions and around 20 questions — an estimated 30 minutes, in a single session.'
      )
      .run()
    await db
      .prepare("UPDATE admin_users SET nome = 'Practice Administrator' WHERE nome = 'Administrador da Prática'")
      .run()

    // v3 — client model moved from the Brazilian layout (CNPJ / UF) to the
    // US/Caribbean one (Tax ID / country / ZIP). Legacy CNPJ values become the
    // Tax ID and records without a country default to Brazil, which is where
    // they were captured.
    //
    // `cnpj` only exists on databases created by migration 0001/0004 — a
    // database created from the consolidated SCHEMA_SQL never had it. The
    // statement therefore has to tolerate a missing column instead of aborting
    // the whole seed.
    await db
      .prepare(
        `UPDATE clients SET tax_id = cnpj
          WHERE (tax_id IS NULL OR tax_id = '') AND cnpj IS NOT NULL AND cnpj <> ''`
      )
      .run()
      .catch(() => undefined)
    await db
      .prepare(
        `UPDATE clients SET country = 'Brazil'
          WHERE country IS NULL OR country = ''`
      )
      .run()

    await db
      .prepare(
        `INSERT INTO settings (key, value) VALUES ('seed_version', ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`
      )
      .bind(SEED_VERSION)
      .run()
  })()
  return seedPromise
}

export function resetSeedCache() {
  seedPromise = null
}

export async function audit(
  db: D1Database,
  ator: string,
  acao: string,
  entidade: string,
  entidadeId: string | number | null,
  detalhe?: string
) {
  await db
    .prepare('INSERT INTO audit_log (ator, acao, entidade, entidade_id, detalhe) VALUES (?, ?, ?, ?, ?)')
    .bind(ator, acao, entidade, entidadeId === null ? null : String(entidadeId), detalhe || null)
    .run()
}

export async function questionsFor(env: Env, versao: number): Promise<QRow[]> {
  const { results } = await env.DB.prepare(
    `SELECT id, slug, ref, persona, versao, dimensao, ordem, texto, tipo, opcoes, obrigatoria, rubrica, ajuda
       FROM questions WHERE versao = ? AND ativo = 1 ORDER BY ordem ASC`
  )
    .bind(versao)
    .all<any>()
  return (results || []).map((r) => ({
    id: r.id,
    slug: r.slug,
    ref: r.ref || r.slug,
    persona: (r.persona || 'M') as 'O' | 'M' | 'H',
    versao: r.versao,
    dimensao: r.dimensao,
    ordem: r.ordem,
    texto: r.texto,
    tipo: r.tipo,
    opcoes: r.opcoes ? JSON.parse(r.opcoes) : null,
    obrigatoria: !!r.obrigatoria,
    rubrica: r.rubrica ? JSON.parse(r.rubrica) : null,
    ajuda: r.ajuda,
  })) as QRow[]
}

export type AssessmentFull = {
  id: number
  client_id: number
  estado: string
  link_token: string
  expira_em: string
  questionario_versao: number
  submetido_em: string | null
  reaberto: number
  criado_em: string
  client: ClientRow
}

export async function assessmentByToken(env: Env, token: string): Promise<AssessmentFull | null> {
  const row = await env.DB.prepare(
    `SELECT a.*, c.id AS c_id, c.razao_social, c.nome_fantasia, c.tax_id, c.country, c.estado AS estado_uf,
            c.cidade, c.postal_code, c.website, c.vertical, c.tamanho_faixa,
            c.responsavel_nome, c.responsavel_email, c.ativo, c.criado_em AS c_criado_em
       FROM assessments a JOIN clients c ON c.id = a.client_id
      WHERE a.link_token = ? AND c.ativo = 1`
  )
    .bind(token)
    .first<any>()
  if (!row) return null
  return {
    id: row.id,
    client_id: row.client_id,
    estado: row.estado,
    link_token: row.link_token,
    expira_em: row.expira_em,
    questionario_versao: row.questionario_versao,
    submetido_em: row.submetido_em,
    reaberto: row.reaberto,
    criado_em: row.criado_em,
    client: {
      id: row.c_id,
      razao_social: row.razao_social,
      nome_fantasia: row.nome_fantasia,
      tax_id: row.tax_id,
      country: row.country,
      estado_uf: row.estado_uf,
      cidade: row.cidade,
      postal_code: row.postal_code,
      website: row.website,
      vertical: row.vertical,
      tamanho_faixa: row.tamanho_faixa,
      responsavel_nome: row.responsavel_nome,
      responsavel_email: row.responsavel_email,
      ativo: row.ativo,
      criado_em: row.c_criado_em,
      excluido_em: null,
    },
  }
}

export async function responsesMap(env: Env, assessmentId: number): Promise<Record<number, unknown>> {
  const { results } = await env.DB.prepare(
    'SELECT question_id, valor FROM responses WHERE assessment_id = ?'
  )
    .bind(assessmentId)
    .all<{ question_id: number; valor: string }>()
  const map: Record<number, unknown> = {}
  for (const r of results || []) {
    try {
      map[r.question_id] = JSON.parse(r.valor as string)
    } catch {
      map[r.question_id] = r.valor
    }
  }
  return map
}

export async function targetsMap(env: Env, assessmentId: number): Promise<Record<string, number>> {
  const { results } = await env.DB.prepare(
    'SELECT dimensao, meta_nivel FROM dimension_targets WHERE assessment_id = ?'
  )
    .bind(assessmentId)
    .all<{ dimensao: string; meta_nivel: number }>()
  const map: Record<string, number> = {}
  for (const r of results || []) map[r.dimensao] = Number(r.meta_nivel)
  for (const d of DIMENSIONS) if (map[d.key] === undefined) map[d.key] = 3
  return map
}

export async function initiativesFor(env: Env, assessmentId: number) {
  const { results } = await env.DB.prepare(
    'SELECT * FROM initiatives WHERE assessment_id = ? ORDER BY ordem ASC, id ASC'
  )
    .bind(assessmentId)
    .all<any>()
  return results || []
}

export async function reportsFor(env: Env, assessmentId: number) {
  const { results } = await env.DB.prepare(
    'SELECT * FROM reports WHERE assessment_id = ? ORDER BY versao ASC'
  )
    .bind(assessmentId)
    .all<any>()
  return results || []
}

export function linkExpired(assessment: { expira_em: string | null }): boolean {
  if (!assessment.expira_em) return false
  return new Date(assessment.expira_em).getTime() < Date.now()
}

export function auditStamp(ator: string): string {
  return `${nowIso()} · ${ator}`
}
