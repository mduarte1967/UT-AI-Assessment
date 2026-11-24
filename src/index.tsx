import { Hono } from 'hono'
import { secureHeaders } from 'hono/secure-headers'

import { SCHEMA_SQL, COLUMN_MIGRATIONS } from './lib/schema'
import {
  ensureSeed,
  questionsFor,
  assessmentByToken,
  responsesMap,
  targetsMap,
  initiativesFor,
  reportsFor,
  audit,
  linkExpired,
  type Env,
} from './lib/db'
import {
  getAdminFromRequest,
  verifyPassword,
  hashPassword,
  createSession,
  destroySession,
  sessionCookie,
  clearSessionCookie,
} from './lib/auth'
import { DIMENSIONS, QUESTION_BANK_VERSION } from './lib/questions'
import { computeScorecard, computeIndex, isAnswered, PRIORITY_LABEL, type QRow } from './lib/scoring'
import { buildReportData, renderReport, normalizeReportData, type ReportData } from './lib/report'
import { buildXlsx, buildCsv } from './lib/xlsx'
import { sendMail, inviteEmail, testEmail } from './lib/mailer'
import { getSettings, setSetting, mailConfig, linkTtlDays, defaultCredsActive } from './lib/settings'
import { addDays, esc, formatIndex, num, randomToken, nowIso, fmtDate } from './lib/util'

import { loginPage } from './lib/views/login'
import { settingsPage } from './lib/views/settings'
import { helpPage } from './lib/views/help'
import { dashboardPage, type DashRow } from './lib/views/dashboard'
import { clientFormPage, clientDetailPage } from './lib/views/client'
import { renderFormPage } from './lib/views/form'
import { renderAnswersPage } from './lib/views/answers'
import { signupPage, signupDonePage } from './lib/views/signup'
import { landingPage } from './lib/views/landing'
import { adminShell, publicShell, doc, alertBox, badge } from './lib/views/layout'

const app = new Hono<{ Bindings: Env; Variables: { admin: any } }>()

app.use(secureHeaders())

/* ── bootstrap: schema + seed (idempotente, 1x por isolate) ─────────────── */
let bootPromise: Promise<void> | null = null
async function bootstrap(env: Env) {
  if (!bootPromise) {
    bootPromise = (async () => {
      const stmts = SCHEMA_SQL.split(';')
        .map((s) => s.trim())
        .filter(Boolean)
      for (const sql of stmts) {
        await env.DB.prepare(sql).run().catch(() => undefined)
      }
      // Additive column upgrades for databases created before they existed.
      // Duplicated-column errors are expected on an up-to-date schema.
      for (const sql of COLUMN_MIGRATIONS.split(';').map((s) => s.trim()).filter(Boolean)) {
        await env.DB.prepare(sql).run().catch(() => undefined)
      }
      await ensureSeed(env)
    })()
  }
  return bootPromise
}

app.use('*', async (c, next) => {
  if (c.req.path.startsWith('/static')) return next()
  await bootstrap(c.env)
  return next()
})

/* ── helpers ───────────────────────────────────────────────────────────── */
function baseUrl(c: any): string {
  const url = new URL(c.req.url)
  return `${url.protocol}//${url.host}`
}

function requireAdmin() {
  return async (c: any, next: any) => {
    const admin = await getAdminFromRequest(c.env.DB, c.req.raw)
    if (!admin) {
      if (c.req.method === 'GET') return c.redirect('/admin/login')
      return c.json({ error: 'unauthorized' }, 401)
    }
    c.set('admin', admin)
    await next()
  }
}

async function latestReport(db: D1Database, assessmentId: number | null) {
  if (!assessmentId) return null
  return db
    .prepare('SELECT * FROM reports WHERE assessment_id = ? ORDER BY versao DESC LIMIT 1')
    .bind(assessmentId)
    .first<any>()
}

/* ── autenticação ──────────────────────────────────────────────────────── */
app.get('/admin/login', async (c) => {
  const admin = await getAdminFromRequest(c.env.DB, c.req.raw)
  if (admin) return c.redirect('/admin')

  const fa = await defaultCredsActive(c.env.DB)
  return c.html(
    loginPage({
      firstAccess: fa.active && fa.email ? { email: fa.email, senha: c.env.ADMIN_PASSWORD || 'Unified@2026' } : null,
      notice: String(c.req.query('ok') || ''),
    })
  )
})

app.post('/admin/login', async (c) => {
  const body = await c.req.parseBody()
  const email = String(body.email || '').trim().toLowerCase()
  const senha = String(body.senha || '')

  const admin = await c.env.DB.prepare('SELECT * FROM admin_users WHERE lower(email) = ?')
    .bind(email)
    .first<any>()

  if (!admin || !(await verifyPassword(senha, admin.senha_hash))) {
    await audit(c.env.DB, email || 'desconhecido', 'login_falha', 'admin_users', admin?.id ?? null, 'invalid credentials')
    const fa = await defaultCredsActive(c.env.DB)
    return c.html(
      loginPage({
        error: 'Incorrect e-mail or password.',
        email,
        firstAccess: fa.active && fa.email ? { email: fa.email, senha: c.env.ADMIN_PASSWORD || 'Unified@2026' } : null,
      }),
      401
    )
  }

  const token = await createSession(c.env.DB, admin.id)
  await audit(c.env.DB, admin.email, 'login_ok', 'admin_users', admin.id)

  return new Response(null, {
    status: 303,
    headers: { Location: '/admin', 'Set-Cookie': sessionCookie(token) },
  })
})

app.post('/admin/logout', async (c) => {
  const cookie = c.req.header('Cookie') || ''
  const match = cookie.match(/utr_sid=([^;]+)/)
  if (match) await destroySession(c.env.DB, match[1])
  return new Response(null, {
    status: 303,
    headers: { Location: '/admin/login', 'Set-Cookie': clearSessionCookie() },
  })
})

app.get('/', async (c) => {
  const { enabled, contactEmail } = await signupConfig(c.env)
  return c.html(landingPage({ open: enabled, contactEmail }))
})

/* ── configurações ─────────────────────────────────────────────────────── */
app.get('/admin/settings', requireAdmin(), async (c) => {
  const admin = c.get('admin')
  const s = await getSettings(c.env.DB)
  const cfg = await mailConfig(c.env, c.env.DB)
  const fa = await defaultCredsActive(c.env.DB)
  const flashRaw = String(c.req.query('ok') || '')
  const errRaw = String(c.req.query('erro') || '')
  const base = baseUrl(c)

  return c.html(
    settingsPage(s, admin, {
      flash: errRaw
        ? { kind: 'danger', text: errRaw }
        : flashRaw
          ? { kind: 'ok', text: flashRaw }
          : null,
      mailConfigured: cfg.configured,
      defaultPasswordActive: fa.active,
      baseUrl: base,
      signupSnippet: buildSignupSnippet(base),
    })
  )
})

/** Embeddable button for the Unified Technologies website. */
function buildSignupSnippet(base: string): string {
  return `<!-- AI Maturity Assessment — self-registration button -->
<a href="${base}/start"
   style="display:inline-block;padding:14px 28px;background:#B0D000;color:#0B2545;
          font-family:Roboto,'Helvetica Neue',Arial,sans-serif;font-weight:700;font-size:16px;
          text-decoration:none;border-radius:4px;border:2px solid #B0D000">
  Start the AI readiness assessment
</a>`
}

app.post('/admin/settings/signup', requireAdmin(), async (c) => {
  const admin = c.get('admin')
  const body = await c.req.parseBody()
  const enabled = String(body.self_signup || '1') === '0' ? '0' : '1'
  const contact = String(body.signup_contact_email || '').trim()

  const db = c.env.DB
  await setSetting(db, 'self_signup', enabled, admin.email)
  await setSetting(db, 'signup_contact_email', contact, admin.email)
  await audit(db, admin.email, 'configuracoes_autocadastro', 'settings', 'self_signup', enabled === '1' ? 'enabled' : 'disabled')

  return c.redirect(`/admin/settings?ok=${encodeURIComponent('Self-registration settings saved.')}#signup`)
})

app.post('/admin/settings/access', requireAdmin(), async (c) => {
  const admin = c.get('admin')
  const body = await c.req.parseBody()
  const nome = String(body.nome || '').trim()
  const email = String(body.email || '').trim().toLowerCase()
  const senhaAtual = String(body.senha_atual || '')
  const senhaNova = String(body.senha_nova || '')
  const senhaConf = String(body.senha_conf || '')

  const ok = (msg: string) => c.redirect(`/admin/settings?ok=${encodeURIComponent(msg)}#access`)
  const fail = (msg: string) => c.redirect(`/admin/settings?erro=${encodeURIComponent(msg)}#access`)

  if (!nome || !email) return fail('Name and e-mail are required.')
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return fail('Invalid e-mail address.')

  const row = await c.env.DB.prepare('SELECT * FROM admin_users WHERE id = ?').bind(admin.id).first<any>()
  if (!row || !(await verifyPassword(senhaAtual, row.senha_hash))) {
    return fail('Current password is incorrect — no changes were saved.')
  }

  if (senhaNova || senhaConf) {
    if (senhaNova.length < 8) return fail('The new password must be at least 8 characters long.')
    if (senhaNova !== senhaConf) return fail('The confirmation does not match the new password.')
    const novoHash = await hashPassword(senhaNova)
    await c.env.DB.prepare('UPDATE admin_users SET nome = ?, email = ?, senha_hash = ? WHERE id = ?')
      .bind(nome, email, novoHash, admin.id)
      .run()
    await setSetting(c.env.DB, 'admin_password_changed', '1', email)
    await audit(c.env.DB, email, 'senha_alterada', 'admin_users', admin.id, 'administrator password updated')
    return ok('Access updated: name, e-mail and password saved.')
  }

  await c.env.DB.prepare('UPDATE admin_users SET nome = ?, email = ? WHERE id = ?')
    .bind(nome, email, admin.id)
    .run()
  await audit(c.env.DB, email, 'admin_atualizado', 'admin_users', admin.id)
  return ok('Administrator details updated.')
})

app.post('/admin/settings/email', requireAdmin(), async (c) => {
  const admin = c.get('admin')
  const body = await c.req.parseBody()
  const provider = String(body.mail_provider || 'resend')
  const key = String(body.mail_api_key || '').trim()
  const from = String(body.mail_from || '').trim()
  const subject = String(body.mail_subject || '').trim()
  const intro = String(body.mail_intro || '').trim()
  const ttl = String(body.link_ttl_days || '30')

  const db = c.env.DB
  await setSetting(db, 'mail_provider', provider === 'sendgrid' ? 'sendgrid' : 'resend', admin.email)
  if (key) await setSetting(db, 'mail_api_key', key, admin.email)
  if (from) await setSetting(db, 'mail_from', from, admin.email)
  if (subject) await setSetting(db, 'mail_subject', subject, admin.email)
  if (intro) await setSetting(db, 'mail_intro', intro, admin.email)
  const ttlNum = Number(ttl)
  if (Number.isFinite(ttlNum) && ttlNum >= 1) {
    await setSetting(db, 'link_ttl_days', String(Math.min(365, Math.round(ttlNum))), admin.email)
  }

  await audit(db, admin.email, 'configuracoes_email', 'settings', 'mail', `provider ${provider}${key ? ' · key updated' : ''}`)
  return c.redirect(`/admin/settings?ok=${encodeURIComponent('E-mail settings saved.')}#email`)
})

app.post('/admin/settings/test', requireAdmin(), async (c) => {
  const admin = c.get('admin')
  const body = await c.req.parseBody()
  const destino = String(body.teste_email || '').trim()
  if (!destino) return c.redirect(`/admin/settings?erro=${encodeURIComponent('Please provide a destination e-mail.')}#email`)

  const cfg = await mailConfig(c.env, c.env.DB)
  if (!cfg.configured) {
    return c.redirect(
      `/admin/settings?erro=${encodeURIComponent('No API key saved — fill it in and save before testing.')}#email`
    )
  }

  const result = await sendMail({ provider: cfg.provider, apiKey: cfg.apiKey, from: cfg.from }, testEmail(destino))
  await audit(c.env.DB, admin.email, 'email_teste', 'settings', 'mail', `${destino} · ${result.sent ? 'sent' : result.detail}`)

  return c.redirect(
    result.sent
      ? `/admin/settings?ok=${encodeURIComponent(`Test e-mail sent to ${destino}.`)}#email`
      : `/admin/settings?erro=${encodeURIComponent(`Delivery failed: ${result.detail}`)}#email`
  )
})

/* ── guia de uso ───────────────────────────────────────────────────────── */
app.get('/admin/help', requireAdmin(), async (c) => {
  const admin = c.get('admin')
  const cfg = await mailConfig(c.env, c.env.DB)
  const amostra = await c.env.DB.prepare(
    'SELECT link_token FROM assessments a JOIN clients cl ON cl.id = a.client_id AND cl.ativo = 1 ORDER BY a.id DESC LIMIT 1'
  ).first<{ link_token: string }>()

  return c.html(
    helpPage({
      admin,
      mailConfigured: cfg.configured,
      ttlDays: cfg.ttlDays,
      demoToken: amostra?.link_token ?? null,
      baseUrl: baseUrl(c),
    })
  )
})

/* ── dashboard ─────────────────────────────────────────────────────────── */
app.get('/admin', requireAdmin(), async (c) => {
  const admin = c.get('admin')
  const q = String(c.req.query('q') || '').trim()
  const estado = String(c.req.query('estado') || '')
  const vertical = String(c.req.query('vertical') || '')

  const where: string[] = ['c.ativo = 1']
  const binds: any[] = []
  if (q) {
    where.push('(lower(c.razao_social) LIKE ? OR lower(c.nome_fantasia) LIKE ? OR lower(c.responsavel_nome) LIKE ? OR lower(c.responsavel_email) LIKE ? OR lower(c.tax_id) LIKE ? OR lower(c.cidade) LIKE ?)')
    const like = `%${q.toLowerCase()}%`
    binds.push(like, like, like, like, like, like)
  }
  if (vertical) {
    where.push('c.vertical = ?')
    binds.push(vertical)
  }
  if (estado) {
    where.push('COALESCE(a.estado, \'\') = ?')
    binds.push(estado)
  }

  const sql = `
    SELECT c.id AS client_id, c.razao_social, c.nome_fantasia, c.tax_id, c.country, c.vertical, c.tamanho_faixa,
           c.responsavel_nome, c.responsavel_email, c.cidade, c.estado AS estado_uf, c.criado_em, c.ativo,
           a.id AS ass_id, a.estado AS ass_estado, a.link_token, a.expira_em, a.submetido_em, a.reaberto,
           r.indice_geral AS indice, r.id AS report_id, r.versao AS report_versao
      FROM clients c
      LEFT JOIN assessments a ON a.id = (SELECT MAX(id) FROM assessments WHERE client_id = c.id)
      LEFT JOIN reports r ON r.id = (SELECT id FROM reports WHERE assessment_id = a.id ORDER BY versao DESC LIMIT 1)
     WHERE ${where.join(' AND ')}
     ORDER BY c.criado_em DESC`

  const { results } = await c.env.DB.prepare(sql).bind(...binds).all<any>()
  const rows: DashRow[] = (results || []).map((r) => ({
    client_id: r.client_id,
    razao_social: r.razao_social,
    nome_fantasia: r.nome_fantasia,
    tax_id: r.tax_id,
    country: r.country,
    vertical: r.vertical,
    tamanho_faixa: r.tamanho_faixa,
    responsavel_nome: r.responsavel_nome,
    responsavel_email: r.responsavel_email,
    cidade: r.cidade,
    estado_uf: r.estado_uf,
    criado_em: r.criado_em,
    ativo: r.ativo,
    ass_id: r.ass_id,
    estado: r.ass_estado,
    link_token: r.link_token,
    expira_em: r.expira_em,
    submetido_em: r.submetido_em,
    reaberto: r.reaberto,
    indice: r.indice,
    report_id: r.report_id,
    report_versao: r.report_versao,
    conteudo: null,
  }))

  // KPIs e distribuição por dimensão (a partir dos relatórios mais recentes)
  const stats = await c.env.DB.prepare(
    `SELECT a.estado AS estado, COUNT(*) AS n FROM assessments a
       JOIN clients c ON c.id = a.client_id AND c.ativo = 1 GROUP BY a.estado`
  ).all<{ estado: string; n: number }>()
  const porEstado: Record<string, number> = { aguardando: 0, em_preenchimento: 0, submetido: 0, gerado: 0 }
  for (const s of stats.results || []) porEstado[s.estado] = Number(s.n)

  const totalClientes = await c.env.DB.prepare('SELECT COUNT(*) AS n FROM clients WHERE ativo = 1').first<{ n: number }>()

  const latestReports = await c.env.DB.prepare(
    `SELECT r.assessment_id, r.indice_geral, r.conteudo
       FROM reports r
       JOIN assessments a ON a.id = r.assessment_id
       JOIN clients c ON c.id = a.client_id AND c.ativo = 1
      WHERE r.versao = (SELECT MAX(versao) FROM reports WHERE assessment_id = r.assessment_id)`
  ).all<any>()

  let somaIndice = 0
  let nIndice = 0
  const dimAcc: Record<string, { soma: number; n: number }> = {}

  for (const rep of latestReports.results || []) {
    somaIndice += Number(rep.indice_geral)
    nIndice++
    try {
      const data = normalizeReportData(JSON.parse(rep.conteudo))
      for (const row of data.scorecard || []) {
        if (!dimAcc[row.dimensao]) dimAcc[row.dimensao] = { soma: 0, n: 0 }
        dimAcc[row.dimensao].soma += Number(row.atual)
        dimAcc[row.dimensao].n++
      }
    } catch {}
  }

  const dimensoes = DIMENSIONS.map((d) => {
    const a = dimAcc[d.key]
    return { key: d.key, short: d.short, nome: d.nome, media: a && a.n ? a.soma / a.n : 0, n: a?.n || 0 }
  })

  const vs = await c.env.DB.prepare(
    "SELECT DISTINCT vertical FROM clients WHERE ativo = 1 AND vertical IS NOT NULL AND vertical <> '' ORDER BY vertical"
  ).all<{ vertical: string }>()

  return c.html(
    dashboardPage(
      {
        totalClientes: Number(totalClientes?.n || 0),
        porEstado,
        indiceMedio: nIndice ? somaIndice / nIndice : null,
        dimensoes,
        rows,
        totalGeral: Number(totalClientes?.n || 0),
        filtros: { q, estado, vertical },
        verticais: (vs.results || []).map((v) => v.vertical),
      },
      admin
    )
  )
})

app.get('/admin/clients', (c) => c.redirect('/admin'))

/* ── exportações ───────────────────────────────────────────────────────── */
app.get('/admin/export/clients.csv', requireAdmin(), async (c) => {
  const rows = await exportRows(c.env.DB)
  const csv = buildCsv(rows)
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="readiness-base-${nowIso().slice(0, 10)}.csv"`,
    },
  })
})

app.get('/admin/export/workbook.xlsx', requireAdmin(), async (c) => {
  const sheets = await exportSheets(c.env.DB)
  const bytes = buildXlsx(sheets)
  return new Response(bytes as unknown as BodyInit, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="readiness-base-${nowIso().slice(0, 10)}.xlsx"`,
    },
  })
})

async function exportRows(db: D1Database) {
  const { results } = await db
    .prepare(
      `SELECT c.razao_social, c.nome_fantasia, c.tax_id, c.country, c.vertical, c.tamanho_faixa, c.responsavel_nome,
              c.responsavel_email, c.cidade, c.estado, c.postal_code, c.website, c.criado_em,
              a.estado AS ass_estado, a.submetido_em, r.versao AS rep_versao, r.indice_geral
         FROM clients c
         LEFT JOIN assessments a ON a.id = (SELECT MAX(id) FROM assessments WHERE client_id = c.id)
         LEFT JOIN reports r ON r.id = (SELECT id FROM reports WHERE assessment_id = a.id ORDER BY versao DESC LIMIT 1)
        WHERE c.ativo = 1 ORDER BY c.criado_em DESC`
    )
    .all<any>()

  const header = [
    'Legal name', 'Trading name', 'Tax ID', 'Industry', 'Company size', 'Contact', 'E-mail',
    'City', 'State / region', 'Country', 'ZIP', 'Registered', 'Assessment status', 'Submitted on',
    'Report version', 'Index',
  ]
  const body = (results || []).map((r) => [
    r.razao_social, r.nome_fantasia, r.tax_id, r.vertical, r.tamanho_faixa, r.responsavel_nome,
    r.responsavel_email, r.cidade, r.estado, r.country, r.postal_code, r.criado_em, r.ass_estado,
    r.submetido_em, r.rep_versao, r.indice_geral,
  ])
  return [header, ...body]
}

async function exportSheets(db: D1Database) {
  const clientes = await exportRows(db)

  const resp = await db
    .prepare(
      `SELECT c.razao_social, q.dimensao, q.ordem, q.texto, r.valor, a.id AS assessment_id
         FROM responses r
         JOIN assessments a ON a.id = r.assessment_id
         JOIN clients c ON c.id = a.client_id AND c.ativo = 1
         JOIN questions q ON q.id = r.question_id
        ORDER BY c.razao_social, q.ordem`
    )
    .all<any>()

  const respRows: any[][] = [['Client', 'Dimension', 'Order', 'Question', 'Answer (JSON)']]
  for (const r of resp.results || []) {
    respRows.push([r.razao_social, r.dimensao, r.ordem, r.texto, r.valor])
  }

  const reports = await db
    .prepare(
      `SELECT c.razao_social, r.versao, r.indice_geral, r.gerado_em, r.conteudo
         FROM reports r JOIN assessments a ON a.id = r.assessment_id
         JOIN clients c ON c.id = a.client_id AND c.ativo = 1 ORDER BY c.razao_social, r.versao`
    )
    .all<any>()

  const idxRows: any[][] = [['Client', 'Version', 'Index (0–5)', 'Generated on', 'Dimension', 'Current', 'Target', 'Gap', 'Priority']]
  for (const r of reports.results || []) {
    try {
      const data = normalizeReportData(JSON.parse(r.conteudo))
      for (const row of data.scorecard || []) {
        idxRows.push([
          r.razao_social, r.versao, Number(r.indice_geral), r.gerado_em,
          row.nome, row.atual, row.meta, row.gap, row.prioridade,
        ])
      }
    } catch {}
  }

  const inis = await db
    .prepare(
      `SELECT c.razao_social, i.ordem, i.nome, i.problema, i.beneficio, i.urgencia, i.dimensao,
              i.prioridade_calculada, i.proximo_passo
         FROM initiatives i JOIN assessments a ON a.id = i.assessment_id
         JOIN clients c ON c.id = a.client_id AND c.ativo = 1 ORDER BY c.razao_social, i.ordem`
    )
    .all<any>()

  const iniRows: any[][] = [['Client', 'Order', 'Initiative', 'Problem', 'Benefit', 'Urgency', 'Dimension', 'Priority', 'Next step']]
  for (const i of inis.results || []) {
    iniRows.push([i.razao_social, i.ordem, i.nome, i.problema, i.beneficio, i.urgencia, i.dimensao, i.prioridade_calculada, i.proximo_passo])
  }

  return [
    { name: 'Clients', rows: clientes, widths: [34, 26, 18, 18, 20, 24, 30, 20, 22, 22, 12, 20, 22, 20, 16, 10] },
    { name: 'Responses', rows: respRows, widths: [30, 24, 8, 60, 40] },
    { name: 'Indexes', rows: idxRows, widths: [30, 8, 14, 20, 32, 8, 8, 8, 12] },
    { name: 'Initiatives', rows: iniRows, widths: [30, 8, 34, 40, 40, 10, 24, 12, 40] },
  ]
}

/* ── cadastro de cliente ───────────────────────────────────────────────── */
type ClientInput = {
  razao_social: string
  nome_fantasia: string | null
  tax_id: string | null
  country: string | null
  estado: string | null
  cidade: string | null
  postal_code: string | null
  website: string | null
  vertical: string | null
  tamanho_faixa: string | null
  responsavel_nome: string
  responsavel_email: string
}

function clientFromBody(body: Record<string, unknown>): ClientInput {
  const str = (k: string) => String(body[k] ?? '').trim() || null
  return {
    razao_social: String(body.razao_social ?? '').trim(),
    nome_fantasia: str('nome_fantasia'),
    tax_id: str('tax_id'),
    country: str('country'),
    estado: str('estado'),
    cidade: str('cidade'),
    postal_code: str('postal_code'),
    website: str('website'),
    vertical: str('vertical'),
    tamanho_faixa: str('tamanho_faixa'),
    responsavel_nome: String(body.responsavel_nome ?? '').trim(),
    responsavel_email: String(body.responsavel_email ?? '').trim(),
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

/** Validates a client payload; returns an English error message or null. */
function validateClient(d: ClientInput): string | null {
  if (!d.razao_social || !d.responsavel_nome || !d.responsavel_email) {
    return 'Legal name, contact name and contact e-mail are required.'
  }
  if (!EMAIL_RE.test(d.responsavel_email)) return 'Invalid contact e-mail address.'
  return null
}

/**
 * Creates the client, its assessment, the unique token and the default
 * per-dimension targets, then sends the invitation. Shared by the admin
 * registration route and the public self-signup flow.
 */
async function createClientWithAssessment(
  env: Env,
  c: any,
  dados: ClientInput,
  createdBy: string
): Promise<{ clientId: number; token: string; link: string; expira: string; mail: { sent: boolean; detail: string } }> {
  const inserted = await env.DB.prepare(
    `INSERT INTO clients (razao_social, nome_fantasia, tax_id, country, estado, cidade, postal_code, website,
                          vertical, tamanho_faixa, responsavel_nome, responsavel_email, criado_por)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      dados.razao_social, dados.nome_fantasia, dados.tax_id, dados.country, dados.estado, dados.cidade,
      dados.postal_code, dados.website, dados.vertical, dados.tamanho_faixa,
      dados.responsavel_nome, dados.responsavel_email, createdBy
    )
    .run()

  const clientId = Number(inserted.meta.last_row_id)
  const token = randomToken(24)
  const ttl = await linkTtlDays(env, env.DB)
  const expira = addDays(ttl).toISOString()

  await env.DB.prepare(
    `INSERT INTO assessments (client_id, estado, link_token, expira_em, questionario_versao, criado_por, atualizado_em, atualizado_por)
     VALUES (?, 'aguardando', ?, ?, ?, ?, ?, ?)`
  )
    .bind(clientId, token, expira, QUESTION_BANK_VERSION, createdBy, nowIso(), createdBy)
    .run()

  const assRow = await env.DB.prepare('SELECT id FROM assessments WHERE link_token = ?').bind(token).first<{ id: number }>()
  if (assRow) {
    const stmt = env.DB.prepare('INSERT OR REPLACE INTO dimension_targets (assessment_id, dimensao, meta_nivel) VALUES (?, ?, 3)')
    for (const d of DIMENSIONS) await stmt.bind(assRow.id, d.key).run()
  }

  const link = `${baseUrl(c)}/a/${token}`
  const cfg = await mailConfig(env, env.DB)
  const mailBody = inviteEmail({
    empresa: dados.nome_fantasia || dados.razao_social,
    responsavel: dados.responsavel_nome,
    link,
    expiraEm: fmtDate(expira),
    vertical: dados.vertical,
    assunto: cfg.subject,
    intro: cfg.intro,
  })
  mailBody.to = dados.responsavel_email
  const result = await sendMail({ provider: cfg.provider, apiKey: cfg.apiKey, from: cfg.from }, mailBody)

  return { clientId, token, link, expira, mail: { sent: result.sent, detail: result.detail } }
}

app.get('/admin/clients/new', requireAdmin(), async (c) => {
  const admin = c.get('admin')
  return c.html(clientFormPage(admin, {}, { mode: 'novo' }))
})

app.post('/admin/clients/new', requireAdmin(), async (c) => {
  const admin = c.get('admin')
  const body = await c.req.parseBody()
  const dados = clientFromBody(body)

  const erro = validateClient(dados)
  if (erro) {
    return c.html(clientFormPage(admin, dados, { mode: 'novo', error: erro }), 400)
  }

  const { clientId, link, expira, mail } = await createClientWithAssessment(c.env, c, dados, admin.email)

  await audit(
    c.env.DB, admin.email, 'cliente_criado', 'clients', clientId,
    `assessment token created · e-mail ${mail.sent ? 'sent' : 'not sent (' + mail.detail + ')'}`
  )

  return c.html(
    clientFormPage(admin, { ...dados, id: clientId }, {
      mode: 'novo',
      link,
      expiraEm: expira,
      mailNote: mail.sent
        ? `Invitation sent to <strong>${esc(dados.responsavel_email)}</strong>. The link is also available to copy below.`
        : `Automatic delivery unavailable (${esc(mail.detail)}). Copy the link and send it manually to <strong>${esc(
            dados.responsavel_email
          )}</strong>.`,
    })
  )
})

app.get('/admin/clients/:id', requireAdmin(), async (c) => {
  const admin = c.get('admin')
  const id = Number(c.req.param('id'))
  const detail = await loadClientDetail(c.env, id, baseUrl(c))
  if (!detail) return c.notFound()
  return c.html(clientDetailPage(admin, detail, c.req.query('ok') || undefined))
})

async function loadClientDetail(env: Env, clientId: number, base: string) {
  const client = await env.DB.prepare('SELECT * FROM clients WHERE id = ? AND ativo = 1').bind(clientId).first<any>()
  if (!client) return null
  const assessment = await env.DB.prepare(
    'SELECT * FROM assessments WHERE client_id = ? ORDER BY id DESC LIMIT 1'
  )
    .bind(clientId)
    .first<any>()

  const reports = assessment ? await reportsFor(env, assessment.id) : []
  const questions = assessment ? await questionsFor(env, assessment.questionario_versao) : []
  const respostas = assessment ? await responsesMap(env, assessment.id) : {}
  const metas = assessment ? await targetsMap(env, assessment.id) : {}
  const initiatives = assessment ? await initiativesFor(env, assessment.id) : []

  let scorecard = null
  if (reports.length) {
    try {
      scorecard = normalizeReportData(JSON.parse(reports[reports.length - 1].conteudo)).scorecard
    } catch {
      scorecard = null
    }
  }

  const history = await env.DB.prepare(
    "SELECT * FROM audit_log WHERE entidade IN ('clients','assessments','reports') AND (entidade_id = ? OR entidade_id = ?) ORDER BY id DESC LIMIT 12"
  )
    .bind(String(clientId), String(assessment?.id ?? -1))
    .all<any>()

  return {
    client,
    assessment,
    reports,
    questions,
    respostas,
    metas,
    scorecard,
    initiatives,
    baseUrl: base,
    history: history.results || [],
  }
}

app.get('/admin/clients/:id/edit', requireAdmin(), async (c) => {
  const admin = c.get('admin')
  const id = Number(c.req.param('id'))
  const client = await c.env.DB.prepare('SELECT * FROM clients WHERE id = ? AND ativo = 1').bind(id).first<any>()
  if (!client) return c.notFound()
  return c.html(clientFormPage(admin, client, { mode: 'editar' }))
})

app.post('/admin/clients/:id/edit', requireAdmin(), async (c) => {
  const admin = c.get('admin')
  const id = Number(c.req.param('id'))
  const body = await c.req.parseBody()
  const dados = clientFromBody(body)

  const erro = validateClient(dados)
  if (erro) {
    return c.html(clientFormPage(admin, { ...dados, id }, { mode: 'editar', error: erro }), 400)
  }

  await c.env.DB.prepare(
    `UPDATE clients SET razao_social = ?, nome_fantasia = ?, tax_id = ?, country = ?, estado = ?,
            cidade = ?, postal_code = ?, website = ?, vertical = ?, tamanho_faixa = ?,
            responsavel_nome = ?, responsavel_email = ?, atualizado_em = ?, atualizado_por = ?
      WHERE id = ?`
  )
    .bind(
      dados.razao_social, dados.nome_fantasia, dados.tax_id, dados.country, dados.estado,
      dados.cidade, dados.postal_code, dados.website, dados.vertical, dados.tamanho_faixa,
      dados.responsavel_nome, dados.responsavel_email, nowIso(), admin.email, id
    )
    .run()

  await audit(c.env.DB, admin.email, 'cliente_editado', 'clients', id)
  return c.redirect(`/admin/clients/${id}?ok=${encodeURIComponent('Client details updated.')}`)
})

app.post('/admin/clients/:id/resend', requireAdmin(), async (c) => {
  const admin = c.get('admin')
  const id = Number(c.req.param('id'))
  const client = await c.env.DB.prepare('SELECT * FROM clients WHERE id = ? AND ativo = 1').bind(id).first<any>()
  if (!client) return c.notFound()
  const assessment = await c.env.DB.prepare('SELECT * FROM assessments WHERE client_id = ? ORDER BY id DESC LIMIT 1')
    .bind(id)
    .first<any>()
  if (!assessment) return c.notFound()

  const token = randomToken(24)
  const expira = addDays(await linkTtlDays(c.env, c.env.DB)).toISOString()
  await c.env.DB.prepare(
    'UPDATE assessments SET link_token = ?, expira_em = ?, atualizado_em = ?, atualizado_por = ? WHERE id = ?'
  )
    .bind(token, expira, nowIso(), admin.email, assessment.id)
    .run()

  const link = `${baseUrl(c)}/a/${token}`
  const cfg = await mailConfig(c.env, c.env.DB)
  const mailBody = inviteEmail({
    empresa: client.nome_fantasia || client.razao_social,
    responsavel: client.responsavel_nome,
    link,
    expiraEm: fmtDate(expira),
    reenvio: true,
    assunto: cfg.subject,
    intro: cfg.intro,
  })
  mailBody.to = client.responsavel_email
  const result = await sendMail({ provider: cfg.provider, apiKey: cfg.apiKey, from: cfg.from }, mailBody)

  await audit(
    c.env.DB, admin.email, 'link_reenviado', 'assessments', assessment.id,
    `token rotated · previous link invalidated · e-mail ${result.sent ? 'sent' : 'not sent'}`
  )

  return c.redirect(
    `/admin/clients/${id}?ok=${encodeURIComponent(
      result.sent
        ? 'New link generated and e-mailed. The previous link has been invalidated.'
        : `New link generated (automatic delivery unavailable: ${result.detail}). Copy the link from the client record.`
    )}`
  )
})

app.post('/admin/clients/:id/reopen', requireAdmin(), async (c) => {
  const admin = c.get('admin')
  const id = Number(c.req.param('id'))
  const assessment = await c.env.DB.prepare('SELECT * FROM assessments WHERE client_id = ? ORDER BY id DESC LIMIT 1')
    .bind(id)
    .first<any>()
  if (!assessment) return c.notFound()

  await c.env.DB.prepare(
    "UPDATE assessments SET estado = 'em_preenchimento', reaberto = 1, atualizado_em = ?, atualizado_por = ? WHERE id = ?"
  )
    .bind(nowIso(), admin.email, assessment.id)
    .run()

  await audit(c.env.DB, admin.email, 'formulario_reaberto', 'assessments', assessment.id, 'new response version enabled')
  return c.redirect(`/admin/clients/${id}?ok=${encodeURIComponent('Questionnaire reopened. The client can add to it and resubmit; a new report version will be generated.')}`)
})

app.post('/admin/clients/:id/delete', requireAdmin(), async (c) => {
  const admin = c.get('admin')
  const id = Number(c.req.param('id'))
  await c.env.DB.prepare(
    'UPDATE clients SET ativo = 0, excluido_em = ?, excluido_por = ? WHERE id = ?'
  )
    .bind(nowIso(), admin.email, id)
    .run()
  await audit(c.env.DB, admin.email, 'cliente_excluido', 'clients', id, 'logical deletion — data preserved')
  return c.redirect(`/admin?ok=${encodeURIComponent('Client deleted (logical deletion).')}`)
})

/* ── relatórios (admin) ────────────────────────────────────────────────── */
app.get('/admin/clients/:id/report', requireAdmin(), async (c) => {
  const admin = c.get('admin')
  const id = Number(c.req.param('id'))
  return renderAdminReport(c, admin, id, c.req.query('v'))
})

app.get('/admin/clients/:id/report.pdf', requireAdmin(), async (c) => {
  const admin = c.get('admin')
  const id = Number(c.req.param('id'))
  return renderAdminReport(c, admin, id, c.req.query('v'), true)
})

app.get('/admin/clients/:id/report.xlsx', requireAdmin(), async (c) => {
  const id = Number(c.req.param('id'))
  return reportXlsx(c, id, c.req.query('v'))
})

async function renderAdminReport(c: any, admin: any, clientId: number, vParam?: string, print = false) {
  const client = await (c.env.DB as D1Database).prepare('SELECT * FROM clients WHERE id = ?').bind(clientId).first<any>()
  if (!client) return c.notFound()
  const assessment = await (c.env.DB as D1Database).prepare('SELECT * FROM assessments WHERE client_id = ? ORDER BY id DESC LIMIT 1')
    .bind(clientId)
    .first<any>()
  if (!assessment) return c.notFound()
  const reports = await reportsFor(c.env, assessment.id)
  if (!reports.length) {
    return c.html(
      adminShell(
        { title: client.nome_fantasia || client.razao_social, subtitle: 'Report', active: '/admin/clients', admin },
        alertBox('warn', 'No report generated yet. The report is created automatically when the client submits the questionnaire.')
      )
    )
  }

  const chosen =
    (vParam && reports.find((r) => String(r.versao) === String(vParam))) || reports[reports.length - 1]

  const data: ReportData = normalizeReportData(JSON.parse(chosen.conteudo))
  const html = renderReport({
    input: {
      client: {
        razao_social: client.razao_social,
        nome_fantasia: client.nome_fantasia,
        tax_id: client.tax_id,
        vertical: client.vertical,
        tamanho_faixa: client.tamanho_faixa,
        responsavel_nome: client.responsavel_nome,
        responsavel_email: client.responsavel_email,
        cidade: client.cidade,
        estado_uf: client.estado,
        country: client.country,
      },
      assessment: { id: assessment.id, versao: chosen.versao, submetido_em: assessment.submetido_em, criado_em: assessment.criado_em },
      questions: [],
      respostas: {},
      metas: {},
      generatedAt: chosen.gerado_em,
    },
    data,
    reportId: chosen.id,
    versao: chosen.versao,
    mode: print ? 'print' : 'admin',
    versions: reports.map((r) => ({ versao: r.versao, gerado_em: r.gerado_em, id: r.id })),
  })

  const actions = print
    ? ''
    : `<a class="btn btn-sm" href="/admin/clients/${clientId}/report.pdf?v=${chosen.versao}" target="_blank" rel="noopener"><i class="fa-solid fa-file-pdf" aria-hidden="true"></i> PDF</a>
       <a class="btn btn-sm btn-ghost" href="/admin/clients/${clientId}/report.xlsx?v=${chosen.versao}"><i class="fa-solid fa-file-excel" aria-hidden="true"></i> XLSX</a>
       <a class="btn btn-sm btn-ghost" href="/admin/clients/${clientId}">Client record</a>`

  const meta = `<div class="card" style="margin-bottom:16px;padding:12px 16px">
    <div class="small muted">
      Completed by <strong>${esc(client.responsavel_nome)}</strong> (${esc(client.responsavel_email)}) ·
      submitted on ${esc(fmtDate(assessment.submetido_em))} · version v${chosen.versao} generated on ${esc(fmtDate(chosen.gerado_em))}
      ${assessment.reaberto ? ' · questionnaire already reopened by the consultant' : ''}
    </div>
  </div>`

  if (print) {
    return c.html(
      doc(
        {
          title: `Report · ${client.nome_fantasia || client.razao_social}`,
          bodyClass: 'public-shell',
          head: `<script>window.addEventListener('load', function(){ setTimeout(function(){ window.print(); }, 400); });</script>`,
        },
        `<div class="public-top no-print"><img src="/static/logo.png" alt="Unified Technologies">
          <span class="small muted">Use the print dialog to save as PDF · <a href="javascript:window.print()">print again</a></span>
        </div>
        <div class="public-body">${html}</div>`
      )
    )
  }

  return c.html(
    adminShell(
      {
        title: client.nome_fantasia || client.razao_social,
        subtitle: 'Maturity report',
        active: '/admin/clients',
        admin,
        actions,
      },
      meta,
      html
    )
  )
}

async function reportXlsx(c: any, clientId: number, vParam?: string) {
  const client = await (c.env.DB as D1Database).prepare('SELECT * FROM clients WHERE id = ?').bind(clientId).first<any>()
  if (!client) return c.notFound()
  const assessment = await (c.env.DB as D1Database).prepare('SELECT * FROM assessments WHERE client_id = ? ORDER BY id DESC LIMIT 1')
    .bind(clientId)
    .first<any>()
  const reports = assessment ? await reportsFor(c.env, assessment.id) : []
  if (!reports.length) return c.json({ error: 'sem relatório' }, 404)
  const chosen = (vParam && reports.find((r) => String(r.versao) === String(vParam))) || reports[reports.length - 1]
  const data: ReportData = normalizeReportData(JSON.parse(chosen.conteudo))
  const slug = (client.nome_fantasia || client.razao_social || 'cliente').replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase()

  const scoreRows: any[][] = [
    ['Client', client.nome_fantasia || client.razao_social],
    ['Report', `v${chosen.versao}`],
    ['Overall index (0–5)', Number(chosen.indice_geral)],
    [],
    ['Dimension', 'Current', '12m target', 'Gap', 'Priority', 'Confidence', 'Answered'],
    ...data.scorecard.map((r: any) => [r.nome, r.atual, r.meta, r.gap, r.prioridade, r.confianca, `${r.respondidas}/${r.total}`]),
  ]

  const iniRows: any[][] = [
    ['Initiative', 'Priority', 'Dimension', 'Problem', 'Benefit', 'Next step', 'Score'],
    ...data.iniciativas.map((i: any) => [
      `${i.id} · ${i.nome}`,
      PRIORITY_LABEL[i.prioridade as keyof typeof PRIORITY_LABEL] ?? i.prioridade,
      i.dimensaoLabel,
      i.problema,
      i.beneficio,
      i.proximo_passo,
      i.score,
    ]),
  ]

  const planoRows: any[][] = [['Horizon', 'Initiatives']]
  for (const h of data.plano) {
    planoRows.push([h.meta.label, h.itens.map((i: any) => i.nome).join(' | ') || '—'])
  }

  const bytes = buildXlsx([
    { name: 'Results', rows: scoreRows, widths: [34, 10, 12, 8, 12, 14, 12] },
    { name: 'Initiatives', rows: iniRows, widths: [36, 12, 10, 24, 40, 40, 44, 12] },
    { name: '90-day plan', rows: planoRows, widths: [26, 70] },
  ])

  return new Response(bytes as unknown as BodyInit, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="scorecard-${slug}-v${chosen.versao}.xlsx"`,
    },
  })
}

/* ── formulário público (cliente) ──────────────────────────────────────── */
app.get('/a/:token', async (c) => {
  const token = c.req.param('token')
  const a = await assessmentByToken(c.env, token)
  if (!a) return notFoundPage(c, 'Invalid link', 'This link does not match an active assessment. Please request a new link from your Unified Technologies consultant.')
  if (linkExpired(a)) {
    return expiredPage(c, a.client.nome_fantasia || a.client.razao_social, a.expira_em)
  }
  if (a.estado === 'submetido' || a.estado === 'gerado') {
    return c.redirect(`/a/${token}/report`)
  }

  const questions = await questionsFor(c.env, a.questionario_versao)
  const respostas = await responsesMap(c.env, a.id)
  const metas = await targetsMap(c.env, a.id)
  const initiatives = await initiativesFor(c.env, a.id)

  return c.html(
    renderFormPage({
      token,
      empresa: a.client.nome_fantasia || a.client.razao_social,
      razaoSocial: a.client.razao_social,
      responsavel: a.client.responsavel_nome,
      vertical: a.client.vertical,
      questions,
      respostas,
      metas,
      initiatives,
      estado: a.estado,
      expiraEm: a.expira_em,
      reaberto: !!a.reaberto,
    })
  )
})

app.post('/api/a/:token/save', async (c) => {
  const token = c.req.param('token')
  const a = await assessmentByToken(c.env, token)
  if (!a) return c.json({ ok: false, message: 'Invalid link.' }, 404)
  if (linkExpired(a)) return c.json({ ok: false, message: 'Link expired.' }, 410)
  if (a.estado === 'submetido' || (a.estado === 'gerado' && !a.reaberto)) {
    return c.json({ ok: false, message: 'Questionnaire already submitted.' }, 409)
  }

  const body: any = await c.req.json().catch(() => ({}))
  const questions = await questionsFor(c.env, a.questionario_versao)
  const byId = new Map(questions.map((q) => [q.id, q]))

  if (Array.isArray(body.respostas)) {
    for (const item of body.respostas) {
      const qid = Number(item?.question_id)
      const q = byId.get(qid)
      if (!q) continue
      const valor = item.valor === null || item.valor === undefined ? null : JSON.stringify(item.valor)
      await c.env.DB.prepare(
        `INSERT INTO responses (assessment_id, question_id, valor, respondido_em) VALUES (?, ?, ?, ?)
         ON CONFLICT(assessment_id, question_id) DO UPDATE SET valor = excluded.valor, respondido_em = excluded.respondido_em`
      )
        .bind(a.id, qid, valor, nowIso())
        .run()
    }
  }

  if (Array.isArray(body.targets)) {
    for (const t of body.targets) {
      const dim = String(t?.dimensao || '')
      if (!DIMENSIONS.some((d) => d.key === dim)) continue
      const meta = Math.max(1, Math.min(5, Math.round(Number(t.meta))))
      await c.env.DB.prepare(
        `INSERT INTO dimension_targets (assessment_id, dimensao, meta_nivel) VALUES (?, ?, ?)
         ON CONFLICT(assessment_id, dimensao) DO UPDATE SET meta_nivel = excluded.meta_nivel`
      )
        .bind(a.id, dim, meta)
        .run()
    }
  }

  if (Array.isArray(body.iniciativas)) {
    // Legacy clients may still post initiatives. They are ignored: the method
    // now owns the initiative set, generated at submit time from the library.
  }

  if (a.estado === 'aguardando') {
    await c.env.DB.prepare("UPDATE assessments SET estado = 'em_preenchimento', atualizado_em = ? WHERE id = ?")
      .bind(nowIso(), a.id)
      .run()
  }

  return c.json({ ok: true, saved_at: nowIso() })
})

app.post('/api/a/:token/submit', async (c) => {
  const token = c.req.param('token')
  const a = await assessmentByToken(c.env, token)
  if (!a) return c.json({ ok: false, message: 'Invalid link.' }, 404)
  if (linkExpired(a)) return c.json({ ok: false, message: 'Link expired.' }, 410)
  if (a.estado === 'gerado' && !a.reaberto) {
    return c.json({ ok: true, redirect: `/a/${token}/report` })
  }

  const body: any = await c.req.json().catch(() => ({}))

  // grava respostas pendentes que ainda estejam no cliente
  if (Array.isArray(body.respostas) && body.respostas.length) {
    const questions0 = await questionsFor(c.env, a.questionario_versao)
    const byId = new Map(questions0.map((q) => [q.id, q]))
    for (const item of body.respostas) {
      const qid = Number(item?.question_id)
      if (!byId.has(qid)) continue
      await c.env.DB.prepare(
        `INSERT INTO responses (assessment_id, question_id, valor, respondido_em) VALUES (?, ?, ?, ?)
         ON CONFLICT(assessment_id, question_id) DO UPDATE SET valor = excluded.valor, respondido_em = excluded.respondido_em`
      )
        .bind(a.id, qid, item.valor === null ? null : JSON.stringify(item.valor), nowIso())
        .run()
    }
  }

  const questions = await questionsFor(c.env, a.questionario_versao)
  const respostas = await responsesMap(c.env, a.id)
  const pendentes = questions.filter((q) => q.obrigatoria && !isAnswered(q, respostas[q.id]))

  if (pendentes.length) {
    return c.json(
      {
        ok: false,
        message: `${pendentes.length} required question(s) left blank.`,
        pendentes: pendentes.map((q) => ({ id: q.id, texto: q.texto })),
      },
      400
    )
  }

  const metas = await targetsMap(c.env, a.id)

  const data = buildReportData({
    client: a.client as any,
    assessment: { id: a.id, versao: 0, submetido_em: a.submetido_em, criado_em: a.criado_em },
    questions,
    respostas,
    metas,
    generatedAt: nowIso(),
  })

  const maxV = await c.env.DB.prepare('SELECT COALESCE(MAX(versao), 0) AS v FROM reports WHERE assessment_id = ?')
    .bind(a.id)
    .first<{ v: number }>()
  const versao = Number(maxV?.v || 0) + 1

  const inserted = await c.env.DB.prepare(
    'INSERT INTO reports (assessment_id, versao, indice_geral, conteudo, gerado_em) VALUES (?, ?, ?, ?, ?)'
  )
    .bind(a.id, versao, data.indice.escala5, JSON.stringify(data), nowIso())
    .run()

  await c.env.DB.prepare(
    "UPDATE assessments SET estado = 'gerado', submetido_em = ?, reaberto = 0, atualizado_em = ? WHERE id = ?"
  )
    .bind(nowIso(), nowIso(), a.id)
    .run()

  // Persist the method-generated initiative set for this assessment. The set is
  // deterministic for a given profile, so replacing the rows keeps the record in
  // sync with the report exactly (it is also fully embedded in reports.conteudo).
  await c.env.DB.prepare('DELETE FROM initiatives WHERE assessment_id = ?').bind(a.id).run()
  let ordemIni = 0
  for (const ini of data.iniciativas) {
    ordemIni += 1
    await c.env.DB.prepare(
      `INSERT INTO initiatives
         (assessment_id, ordem, dimensao, nome, problema, beneficio, urgencia,
          prioridade_calculada, proximo_passo, codigo, kpi, motivo, origem)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'metodo')`
    )
      .bind(
        a.id,
        ordemIni,
        ini.dimensao,
        ini.nome,
        ini.problema,
        ini.beneficio,
        ini.prioridade === 'P0' ? 3 : ini.prioridade === 'P1' ? 2 : 1,
        ini.prioridade,
        ini.proximo_passo,
        ini.id,
        ini.kpi || null,
        ini.motivo || null
      )
      .run()
  }

  await audit(c.env.DB, a.client.responsavel_email, 'assessment_submetido', 'assessments', a.id, `report v${versao} generated (id ${inserted.meta.last_row_id})`)

  return c.json({ ok: true, redirect: `/a/${token}/report`, versao, report_id: inserted.meta.last_row_id })
})

/* ── respostas em modo somente leitura (cliente) ───────────────────────── */
app.get('/a/:token/answers', async (c) => {
  const token = c.req.param('token')
  const a = await assessmentByToken(c.env, token)
  if (!a) return notFoundPage(c, 'Invalid link', 'This link does not match an active assessment.')

  const questions = await questionsFor(c.env, a.questionario_versao)
  const respostas = await responsesMap(c.env, a.id)
  const metas = await targetsMap(c.env, a.id)
  const reports = await reportsFor(c.env, a.id)
  const submetido = a.estado === 'submetido' || a.estado === 'gerado'

  return c.html(
    renderAnswersPage({
      token,
      empresa: a.client.nome_fantasia || a.client.razao_social,
      responsavel: a.client.responsavel_nome,
      submetidoEm: a.submetido_em,
      versaoRelatorio: reports.length ? reports[reports.length - 1].versao : null,
      questions,
      respostas,
      metas,
      readOnlyNote: submetido
        ? 'Questionnaire already submitted — the answers below are read-only. Changes require the Unified Technologies consultant to reopen it.'
        : 'This is your current draft. Answers are saved automatically as you fill the questionnaire in.',
    })
  )
})

/* ── relatório público (cliente) ───────────────────────────────────────── */
app.get('/a/:token/report', async (c) => {
  const token = c.req.param('token')
  return renderClientReport(c, token, c.req.query('v'), false)
})

app.get('/a/:token/report.pdf', async (c) => {
  const token = c.req.param('token')
  return renderClientReport(c, token, c.req.query('v'), true)
})

app.get('/a/:token/report.xlsx', async (c) => {
  const token = c.req.param('token')
  const a = await assessmentByToken(c.env, token)
  if (!a) return notFoundPage(c, 'Invalid link', 'Please request a new link from your Unified Technologies consultant.')
  const reports = await reportsFor(c.env, a.id)
  if (!reports.length) return c.redirect(`/a/${token}`)
  const chosen = (c.req.query('v') && reports.find((r) => String(r.versao) === String(c.req.query('v')))) || reports[reports.length - 1]
  const data: ReportData = normalizeReportData(JSON.parse(chosen.conteudo))
  const slug = (a.client.nome_fantasia || a.client.razao_social).replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase()
  const bytes = buildXlsx([
    {
      name: 'Results',
      rows: [
        ['Client', a.client.nome_fantasia || a.client.razao_social],
        ['Overall index (0–5)', Number(chosen.indice_geral)],
        [],
        ['Dimension', 'Current', '12m target', 'Gap', 'Priority'],
        ...data.scorecard.map((r: any) => [r.nome, r.atual, r.meta, r.gap, r.prioridade]),
      ],
      widths: [34, 10, 12, 8, 12],
    },
    {
      name: 'Initiatives',
      rows: [
        ['Initiative', 'Priority', 'Problem', 'Benefit', 'Next step'],
        ...data.iniciativas.map((i: any) => [
          `${i.id} · ${i.nome}`,
          PRIORITY_LABEL[i.prioridade as keyof typeof PRIORITY_LABEL] ?? i.prioridade,
          i.problema,
          i.beneficio,
          i.proximo_passo,
        ]),
      ],
      widths: [36, 12, 40, 40, 44],
    },
  ])
  return new Response(bytes as unknown as BodyInit, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="scorecard-${slug}-v${chosen.versao}.xlsx"`,
    },
  })
})

async function renderClientReport(c: any, token: string, vParam?: string, print = false) {
  const a = await assessmentByToken(c.env, token)
  if (!a) return notFoundPage(c, 'Invalid link', 'This link does not match an active assessment. Please request a new link from your Unified Technologies consultant.')
  const reports = await reportsFor(c.env, a.id)
  if (!reports.length) {
    if (a.estado === 'submetido') {
      return c.html(publicShell('Report in preparation', alertBox('info', 'Report in preparation. Please refresh the page in a moment.')))
    }
    return c.redirect(`/a/${token}`)
  }

  const chosen = (vParam && reports.find((r) => String(r.versao) === String(vParam))) || reports[reports.length - 1]
  const data: ReportData = normalizeReportData(JSON.parse(chosen.conteudo))

  await c.env.DB.prepare(
    'INSERT INTO report_access_log (report_id, assessment_id, origem, ip, user_agent) VALUES (?, ?, ?, ?, ?)'
  )
    .bind(chosen.id, a.id, print ? 'cliente_pdf' : 'cliente', c.req.header('CF-Connecting-IP') || null, (c.req.header('User-Agent') || '').slice(0, 200))
    .run()

  const html = renderReport({
    input: {
      client: a.client as any,
      assessment: { id: a.id, versao: chosen.versao, submetido_em: a.submetido_em, criado_em: a.criado_em },
      questions: [],
      respostas: {},
      metas: {},
      generatedAt: chosen.gerado_em,
    },
    data,
    reportId: chosen.id,
    versao: chosen.versao,
    mode: print ? 'print' : 'cliente',
    versions: reports.map((r) => ({ versao: r.versao, gerado_em: r.gerado_em, id: r.id })),
  })

  const actions = `<div class="card no-print" style="margin-bottom:18px;display:flex;gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap">
    <div>
      <strong style="color:var(--navy)">Report ready</strong>
      <div class="small muted">v${chosen.versao} · ${esc(fmtDate(chosen.gerado_em))} · ${esc(a.client.nome_fantasia || a.client.razao_social)}</div>
    </div>
    <div class="report-actions">
      <a class="btn btn-sm" href="/a/${token}/report.pdf?v=${chosen.versao}" target="_blank" rel="noopener"><i class="fa-solid fa-file-pdf" aria-hidden="true"></i> Export PDF</a>
      <a class="btn btn-sm btn-ghost" href="/a/${token}/report.xlsx?v=${chosen.versao}"><i class="fa-solid fa-file-excel" aria-hidden="true"></i> XLSX</a>
      <a class="btn btn-sm btn-ghost" href="/a/${token}/answers">View answers</a>
    </div>
  </div>`

  if (print) {
    return c.html(
      doc(
        {
          title: `Report · ${a.client.nome_fantasia || a.client.razao_social}`,
          bodyClass: 'public-shell',
          head: `<script>window.addEventListener('load', function(){ setTimeout(function(){ window.print(); }, 400); });</script>`,
        },
        `<div class="public-top no-print"><img src="/static/logo.png" alt="Unified Technologies">
          <span class="small muted">Use a caixa de impressão para salvar como PDF · <a href="javascript:window.print()">imprimir novamente</a></span>
        </div><div class="public-body">${html}</div>`
      )
    )
  }

  return c.html(publicShell(`Report · ${a.client.nome_fantasia || a.client.razao_social}`, actions + html))
}

/* ── public self-registration ───────────────────────────────────────────── */
async function signupConfig(env: Env): Promise<{ enabled: boolean; contactEmail: string }> {
  const s = await getSettings(env.DB)
  return { enabled: (s.self_signup ?? '1') !== '0', contactEmail: s.signup_contact_email || '' }
}

app.get('/start', async (c) => {
  const { enabled, contactEmail } = await signupConfig(c.env)
  return c.html(signupPage({ closed: !enabled, contactEmail }))
})

app.post('/start', async (c) => {
  const { enabled, contactEmail } = await signupConfig(c.env)
  if (!enabled) return c.html(signupPage({ closed: true, contactEmail }), 403)

  const body = await c.req.parseBody()
  const ip = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || 'unknown'

  // Honeypot: bots fill hidden fields, humans never see them.
  if (String(body.empresa_aux || '').trim()) {
    await audit(c.env.DB, 'self-signup', 'autocadastro_bloqueado', 'signup_log', null, `honeypot · ip ${ip}`)
    return c.html(signupPage({ error: 'We could not process this submission. Please try again.' }), 400)
  }

  const dados = clientFromBody(body)
  const erro = validateClient(dados)
  if (erro) return c.html(signupPage({ data: dados, error: erro }), 400)
  if (!body.consent) {
    return c.html(
      signupPage({ data: dados, error: 'Please accept the consent notice so we can send you the assessment link.' }),
      400
    )
  }

  // Rate limit: at most 5 self-registrations per IP per hour.
  const recent = await c.env.DB.prepare(
    "SELECT COUNT(*) AS n FROM signup_log WHERE ip = ? AND criado_em > datetime('now','-1 hour')"
  )
    .bind(ip)
    .first<{ n: number }>()
  if (Number(recent?.n || 0) >= 5) {
    await audit(c.env.DB, 'self-signup', 'autocadastro_bloqueado', 'signup_log', null, `rate limit · ip ${ip}`)
    return c.html(
      signupPage({ data: dados, error: 'Too many registrations from this network. Please try again in an hour.' }),
      429
    )
  }

  // One assessment per contact e-mail — avoids duplicate client records.
  const dup = await c.env.DB.prepare(
    'SELECT id FROM clients WHERE ativo = 1 AND lower(responsavel_email) = ? LIMIT 1'
  )
    .bind(dados.responsavel_email.toLowerCase())
    .first<{ id: number }>()
  if (dup) {
    return c.html(
      signupPage({
        data: dados,
        error:
          'An assessment is already registered for this e-mail. Use the link you received, or contact us and we will send a new one.',
      }),
      409
    )
  }

  const { clientId, link, expira, mail } = await createClientWithAssessment(c.env, c, dados, 'self-signup')

  await c.env.DB.prepare('INSERT INTO signup_log (ip, email, client_id) VALUES (?, ?, ?)')
    .bind(ip, dados.responsavel_email, clientId)
    .run()
  await audit(
    c.env.DB, 'self-signup', 'cliente_autocadastro', 'clients', clientId,
    `ip ${ip} · e-mail ${mail.sent ? 'sent' : 'not sent (' + mail.detail + ')'}`
  )

  return c.html(
    signupDonePage({
      empresa: dados.nome_fantasia || dados.razao_social,
      email: dados.responsavel_email,
      link,
      expiraEm: fmtDate(expira),
      sent: mail.sent,
      detail: mail.detail,
    })
  )
})

/* ── páginas de erro ───────────────────────────────────────────────────── */
function notFoundPage(c: any, title: string, message: string) {
  return c.html(
    publicShell(
      title,
      `<div class="card accent" style="max-width:620px;margin:8px auto;text-align:center">
        <i class="fa-solid fa-link-slash" style="font-size:26px;color:var(--muted)" aria-hidden="true"></i>
        <h2 style="font-size:1.4rem;margin:16px 0 8px">${esc(title)}</h2>
        <p class="muted">${esc(message)}</p>
        <a class="btn btn-ghost" href="/" style="margin-top:10px"><i class="fa-solid fa-arrow-left" aria-hidden="true"></i> Back to the overview</a>
      </div>`,
      { hero: { kicker: '3-Day AI Readiness Assessment', title, lede: message } }
    ),
    404
  )
}

function expiredPage(c: any, empresa: string, expira: string | null) {
  return c.html(
    publicShell(
      'Link expired',
      `<div class="card accent" style="max-width:620px;margin:8px auto;text-align:center">
        <i class="fa-regular fa-clock" style="font-size:26px;color:var(--warn)" aria-hidden="true"></i>
        <h2 style="font-size:1.4rem;margin:16px 0 8px">This link has expired</h2>
        <p class="muted">The assessment link for <strong>${esc(empresa)}</strong> ${expira ? `expired on ${esc(fmtDate(expira))}` : 'is no longer valid'}.
        Please request a new link from your Unified Technologies consultant — your previous answers are preserved.</p>
        <a class="btn btn-ghost" href="/" style="margin-top:10px"><i class="fa-solid fa-arrow-left" aria-hidden="true"></i> Back to the overview</a>
      </div>`,
      { hero: { kicker: '3-Day AI Readiness Assessment', title: 'Link expired' } }
    ),
    410
  )
}

app.notFound((c) => notFoundPage(c, 'Page not found', 'The address you accessed does not exist in this application.'))

export default app
