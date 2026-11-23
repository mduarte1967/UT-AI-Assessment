import type { Env } from './db'

export type Settings = Record<string, string>

export const DEFAULTS: Settings = {
  mail_provider: 'resend',
  mail_from: 'Unified Technologies <onboarding@resend.dev>',
  link_ttl_days: '30',
  mail_subject: 'Convite — Assessment de Maturidade em IA · {{empresa}}',
  mail_intro:
    'A Unified Technologies preparou o assessment de prontidão em inteligência artificial de {{empresa}}. São 7 dimensões e cerca de 20 perguntas — tempo estimado de 30 minutos, em uma sessão única.',
  admin_password_changed: '',
}

export async function getSettings(db: D1Database): Promise<Settings> {
  const { results } = await db.prepare('SELECT key, value FROM settings').all<{ key: string; value: string }>()
  const out: Settings = { ...DEFAULTS }
  for (const row of results || []) {
    if (row.key !== 'seed_version') out[row.key] = row.value
  }
  return out
}

export async function getSetting(db: D1Database, key: string, fallback = ''): Promise<string> {
  const row = await db.prepare('SELECT value FROM settings WHERE key = ?').bind(key).first<{ value: string }>()
  return row?.value ?? fallback
}

export async function setSetting(db: D1Database, key: string, value: string, ator = 'sistema'): Promise<void> {
  const agora = new Date().toISOString()
  await db
    .prepare(
      `INSERT INTO settings (key, value, atualizado_em, atualizado_por) VALUES (?, ?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value,
         atualizado_em = excluded.atualizado_em, atualizado_por = excluded.atualizado_por`
    )
    .bind(key, value, agora, ator)
    .run()
}

/** Chave de e-mail: prioriza o que o administrador salvou na tela de configurações. */
export async function mailConfig(env: Env, db: D1Database) {
  const s = await getSettings(db)
  const key = s.mail_api_key || env.RESEND_API_KEY || ''
  const from = s.mail_from || env.MAIL_FROM || 'Unified Technologies <onboarding@resend.dev>'
  return {
    provider: s.mail_provider || 'resend',
    apiKey: key,
    from,
    subject: s.mail_subject || DEFAULTS.mail_subject,
    intro: s.mail_intro || DEFAULTS.mail_intro,
    configured: !!key,
    ttlDays: Number(s.link_ttl_days || env.LINK_TTL_DAYS || 30),
  }
}

export async function linkTtlDays(env: Env, db: D1Database): Promise<number> {
  const cfg = await mailConfig(env, db)
  const n = Number(cfg.ttlDays)
  return Number.isFinite(n) && n > 0 ? Math.min(365, Math.round(n)) : 30
}

/** Verdadeiro enquanto o administrador ainda usa a senha padrão de primeiro acesso. */
export async function defaultCredsActive(db: D1Database): Promise<{ active: boolean; email: string | null }> {
  const changed = await getSetting(db, 'admin_password_changed', '')
  if (changed === '1') return { active: false, email: null }
  const admin = await db.prepare('SELECT email FROM admin_users ORDER BY id ASC LIMIT 1').first<{ email: string }>()
  return { active: !!admin, email: admin?.email ?? null }
}

export function renderTemplate(tpl: string, vars: Record<string, string>): string {
  return tpl.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => vars[k] ?? '')
}
