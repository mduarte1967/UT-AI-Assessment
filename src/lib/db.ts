import { QUESTIONS, DIMENSIONS } from './questions'
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
  cnpj: string | null
  vertical: string | null
  tamanho_faixa: string | null
  responsavel_nome: string
  responsavel_email: string
  cidade: string | null
  estado_uf: string | null
  ativo: number
  criado_em: string
  excluido_em: string | null
}

let seedPromise: Promise<void> | null = null

/** Garante schema-base (produção) + perguntas v1 + admin inicial. Idempotente. */
export async function ensureSeed(env: Env): Promise<void> {
  if (seedPromise) return seedPromise
  seedPromise = (async () => {
    const db = env.DB
    const marker = await db
      .prepare("SELECT value FROM settings WHERE key = 'seed_version'")
      .first<{ value: string }>()
      .catch(() => null)

    if (marker?.value === '1') return

    // Perguntas v1
    const existing = await db
      .prepare('SELECT COUNT(*) AS n FROM questions WHERE versao = 1')
      .first<{ n: number }>()
    if (!existing || Number(existing.n) === 0) {
      const stmt = db.prepare(
        `INSERT OR IGNORE INTO questions
          (slug, versao, dimensao, ordem, texto, tipo, opcoes, obrigatoria, rubrica, ajuda, ativo)
         VALUES (?, 1, ?, ?, ?, ?, ?, ?, ?, ?, 1)`
      )
      const batch = QUESTIONS.map((q) =>
        stmt.bind(
          q.slug,
          q.dimensao,
          q.ordem,
          q.texto,
          q.tipo,
          q.opcoes ? JSON.stringify(q.opcoes) : null,
          q.obrigatoria ? 1 : 0,
          q.rubrica ? JSON.stringify(q.rubrica) : null,
          q.ajuda
        )
      )
      for (let i = 0; i < batch.length; i += 20) {
        await db.batch(batch.slice(i, i + 20))
      }
    }

    // Administrador inicial
    const admins = await db.prepare('SELECT COUNT(*) AS n FROM admin_users').first<{ n: number }>()
    if (!admins || Number(admins.n) === 0) {
      const email = env.ADMIN_EMAIL || 'admin@unifiedtech.com'
      const senha = env.ADMIN_PASSWORD || 'Unified@2026'
      await db
        .prepare('INSERT INTO admin_users (nome, email, senha_hash) VALUES (?, ?, ?)')
        .bind('Administrador da Prática', email, await hashPassword(senha))
        .run()
    }

    await db
      .prepare("INSERT INTO settings (key, value) VALUES ('seed_version', '1') ON CONFLICT(key) DO UPDATE SET value = '1'")
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
    `SELECT id, slug, versao, dimensao, ordem, texto, tipo, opcoes, obrigatoria, rubrica, ajuda
       FROM questions WHERE versao = ? AND ativo = 1 ORDER BY ordem ASC`
  )
    .bind(versao)
    .all<any>()
  return (results || []).map((r) => ({
    id: r.id,
    slug: r.slug,
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
    `SELECT a.*, c.id AS c_id, c.razao_social, c.nome_fantasia, c.cnpj, c.vertical, c.tamanho_faixa,
            c.responsavel_nome, c.responsavel_email, c.cidade, c.estado AS estado_uf, c.ativo, c.criado_em AS c_criado_em
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
      cnpj: row.cnpj,
      vertical: row.vertical,
      tamanho_faixa: row.tamanho_faixa,
      responsavel_nome: row.responsavel_nome,
      responsavel_email: row.responsavel_email,
      cidade: row.cidade,
      estado_uf: row.estado_uf,
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
  for (const d of DIMENSIONS) if (map[d.key] === undefined) map[d.key] = 2
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
