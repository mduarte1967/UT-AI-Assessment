import { Hono } from 'hono'
import { secureHeaders } from 'hono/secure-headers'

import { SCHEMA_SQL } from './lib/schema'
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
  createSession,
  destroySession,
  sessionCookie,
  clearSessionCookie,
} from './lib/auth'
import { DIMENSIONS } from './lib/questions'
import { computeScorecard, computeIndex, isAnswered, type QRow } from './lib/scoring'
import { buildReportData, renderReport, type ReportData } from './lib/report'
import { buildXlsx, buildCsv } from './lib/xlsx'
import { sendMail, inviteEmail } from './lib/mailer'
import { addDays, esc, formatIndex, num, randomToken, nowIso, fmtDate } from './lib/util'

import { loginPage } from './lib/views/login'
import { dashboardPage, type DashRow } from './lib/views/dashboard'
import { clientFormPage, clientDetailPage } from './lib/views/client'
import { renderFormPage } from './lib/views/form'
import { renderAnswersPage } from './lib/views/answers'
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
      if (c.req.method === 'GET') return c.redirect('/login')
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
app.get('/login', async (c) => {
  const admin = await getAdminFromRequest(c.env.DB, c.req.raw)
  if (admin) return c.redirect('/painel')
  return c.html(loginPage())
})

app.post('/login', async (c) => {
  const body = await c.req.parseBody()
  const email = String(body.email || '').trim().toLowerCase()
  const senha = String(body.senha || '')

  const admin = await c.env.DB.prepare('SELECT * FROM admin_users WHERE lower(email) = ?')
    .bind(email)
    .first<any>()

  if (!admin || !(await verifyPassword(senha, admin.senha_hash))) {
    await audit(c.env.DB, email || 'desconhecido', 'login_falha', 'admin_users', admin?.id ?? null, 'credenciais inválidas')
    return c.html(loginPage('E-mail ou senha incorretos.', email), 401)
  }

  const token = await createSession(c.env.DB, admin.id)
  await audit(c.env.DB, admin.email, 'login_ok', 'admin_users', admin.id)

  return new Response(null, {
    status: 303,
    headers: { Location: '/painel', 'Set-Cookie': sessionCookie(token) },
  })
})

app.post('/logout', async (c) => {
  const cookie = c.req.header('Cookie') || ''
  const match = cookie.match(/utr_sid=([^;]+)/)
  if (match) await destroySession(c.env.DB, match[1])
  return new Response(null, {
    status: 303,
    headers: { Location: '/login', 'Set-Cookie': clearSessionCookie() },
  })
})

app.get('/', (c) => c.redirect('/painel'))

/* ── dashboard ─────────────────────────────────────────────────────────── */
app.get('/painel', requireAdmin(), async (c) => {
  const admin = c.get('admin')
  const q = String(c.req.query('q') || '').trim()
  const estado = String(c.req.query('estado') || '')
  const vertical = String(c.req.query('vertical') || '')

  const where: string[] = ['c.ativo = 1']
  const binds: any[] = []
  if (q) {
    where.push('(lower(c.razao_social) LIKE ? OR lower(c.nome_fantasia) LIKE ? OR lower(c.responsavel_nome) LIKE ? OR lower(c.responsavel_email) LIKE ? OR c.cnpj LIKE ?)')
    const like = `%${q.toLowerCase()}%`
    binds.push(like, like, like, like, `%${q}%`)
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
    SELECT c.id AS client_id, c.razao_social, c.nome_fantasia, c.cnpj, c.vertical, c.tamanho_faixa,
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
    cnpj: r.cnpj,
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
      const data = JSON.parse(rep.conteudo)
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

app.get('/clientes', (c) => c.redirect('/painel'))

/* ── exportações ───────────────────────────────────────────────────────── */
app.get('/painel/export.csv', requireAdmin(), async (c) => {
  const rows = await exportRows(c.env.DB)
  const csv = buildCsv(rows)
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="readiness-base-${nowIso().slice(0, 10)}.csv"`,
    },
  })
})

app.get('/painel/export.xlsx', requireAdmin(), async (c) => {
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
      `SELECT c.razao_social, c.nome_fantasia, c.cnpj, c.vertical, c.tamanho_faixa, c.responsavel_nome,
              c.responsavel_email, c.cidade, c.estado, c.criado_em,
              a.estado AS ass_estado, a.submetido_em, r.versao AS rep_versao, r.indice_geral
         FROM clients c
         LEFT JOIN assessments a ON a.id = (SELECT MAX(id) FROM assessments WHERE client_id = c.id)
         LEFT JOIN reports r ON r.id = (SELECT id FROM reports WHERE assessment_id = a.id ORDER BY versao DESC LIMIT 1)
        WHERE c.ativo = 1 ORDER BY c.criado_em DESC`
    )
    .all<any>()

  const header = [
    'Razão social', 'Nome fantasia', 'CNPJ', 'Vertical', 'Porte', 'Responsável', 'E-mail',
    'Cidade', 'UF', 'Cadastro', 'Estado do assessment', 'Submetido em', 'Versão relatório', 'Índice',
  ]
  const body = (results || []).map((r) => [
    r.razao_social, r.nome_fantasia, r.cnpj, r.vertical, r.tamanho_faixa, r.responsavel_nome, r.responsavel_email,
    r.cidade, r.estado, r.criado_em, r.ass_estado, r.submetido_em, r.rep_versao, r.indice_geral,
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

  const respRows: any[][] = [['Cliente', 'Dimensão', 'Ordem', 'Pergunta', 'Resposta (JSON)']]
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

  const idxRows: any[][] = [['Cliente', 'Versão', 'Índice (0–5)', 'Gerado em', 'Dimensão', 'Atual', 'Meta', 'Gap', 'Prioridade']]
  for (const r of reports.results || []) {
    try {
      const data = JSON.parse(r.conteudo)
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

  const iniRows: any[][] = [['Cliente', 'Ordem', 'Iniciativa', 'Problema', 'Benefício', 'Urgência', 'Dimensão', 'Prioridade', 'Próximo passo']]
  for (const i of inis.results || []) {
    iniRows.push([i.razao_social, i.ordem, i.nome, i.problema, i.beneficio, i.urgencia, i.dimensao, i.prioridade_calculada, i.proximo_passo])
  }

  return [
    { name: 'Clientes', rows: clientes, widths: [34, 26, 20, 16, 20, 24, 30, 18, 6, 20, 22, 20, 16, 10] },
    { name: 'Respostas', rows: respRows, widths: [30, 24, 8, 60, 40] },
    { name: 'Índices', rows: idxRows, widths: [30, 8, 14, 20, 32, 8, 8, 8, 12] },
    { name: 'Iniciativas', rows: iniRows, widths: [30, 8, 34, 40, 40, 10, 24, 12, 40] },
  ]
}

/* ── cadastro de cliente ───────────────────────────────────────────────── */
app.get('/clientes/novo', requireAdmin(), async (c) => {
  const admin = c.get('admin')
  return c.html(clientFormPage(admin, {}, { mode: 'novo' }))
})

app.post('/clientes/novo', requireAdmin(), async (c) => {
  const admin = c.get('admin')
  const body = await c.req.parseBody()

  const dados = {
    razao_social: String(body.razao_social || '').trim(),
    nome_fantasia: String(body.nome_fantasia || '').trim() || null,
    cnpj: String(body.cnpj || '').trim() || null,
    vertical: String(body.vertical || '').trim() || null,
    tamanho_faixa: String(body.tamanho_faixa || '').trim() || null,
    responsavel_nome: String(body.responsavel_nome || '').trim(),
    responsavel_email: String(body.responsavel_email || '').trim(),
    cidade: String(body.cidade || '').trim() || null,
    estado_uf: String(body.estado_uf || '').trim() || null,
  }

  if (!dados.razao_social || !dados.responsavel_nome || !dados.responsavel_email) {
    return c.html(
      clientFormPage(admin, dados, { mode: 'novo', error: 'Razão social, nome e e-mail do responsável são obrigatórios.' }),
      400
    )
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(dados.responsavel_email)) {
    return c.html(clientFormPage(admin, dados, { mode: 'novo', error: 'E-mail do responsável inválido.' }), 400)
  }

  const inserted = await c.env.DB.prepare(
    `INSERT INTO clients (razao_social, nome_fantasia, cnpj, vertical, tamanho_faixa, responsavel_nome,
                          responsavel_email, cidade, estado, criado_por)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      dados.razao_social, dados.nome_fantasia, dados.cnpj, dados.vertical, dados.tamanho_faixa,
      dados.responsavel_nome, dados.responsavel_email, dados.cidade, dados.estado_uf, admin.email
    )
    .run()

  const clientId = Number(inserted.meta.last_row_id)
  const token = randomToken(24)
  const ttl = num(c.env.LINK_TTL_DAYS, 30)
  const expira = addDays(ttl).toISOString()

  await c.env.DB.prepare(
    `INSERT INTO assessments (client_id, estado, link_token, expira_em, questionario_versao, criado_por, atualizado_em, atualizado_por)
     VALUES (?, 'aguardando', ?, ?, 1, ?, ?, ?)`
  )
    .bind(clientId, token, expira, admin.email, nowIso(), admin.email)
    .run()

  // metas default = 2 em todas as dimensões
  const assRow = await c.env.DB.prepare('SELECT id FROM assessments WHERE link_token = ?').bind(token).first<{ id: number }>()
  if (assRow) {
    const stmt = c.env.DB.prepare('INSERT OR REPLACE INTO dimension_targets (assessment_id, dimensao, meta_nivel) VALUES (?, ?, 2)')
    for (const d of DIMENSIONS) await stmt.bind(assRow.id, d.key).run()
  }

  const link = `${baseUrl(c)}/a/${token}`
  const mail = inviteEmail({
    empresa: dados.nome_fantasia || dados.razao_social,
    responsavel: dados.responsavel_nome,
    link,
    expiraEm: fmtDate(expira),
  })
  mail.to = dados.responsavel_email
  const result = await sendMail(c.env, mail)

  await audit(
    c.env.DB, admin.email, 'cliente_criado', 'clients', clientId,
    `assessment token criado · e-mail ${result.sent ? 'enviado' : 'não enviado (' + result.detail + ')'}`
  )

  return c.html(
    clientFormPage(admin, { ...dados, id: clientId }, {
      mode: 'novo',
      link,
      expiraEm: expira,
      mailNote: result.sent
        ? `Convite enviado para <strong>${esc(dados.responsavel_email)}</strong>. O link também está disponível para cópia abaixo.`
        : `Envio automático indisponível (${esc(result.detail)}). Copie o link e envie manualmente para <strong>${esc(
            dados.responsavel_email
          )}</strong>.`,
    })
  )
})

app.get('/clientes/:id', requireAdmin(), async (c) => {
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
      scorecard = JSON.parse(reports[reports.length - 1].conteudo).scorecard
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

app.get('/clientes/:id/editar', requireAdmin(), async (c) => {
  const admin = c.get('admin')
  const id = Number(c.req.param('id'))
  const client = await c.env.DB.prepare('SELECT * FROM clients WHERE id = ? AND ativo = 1').bind(id).first<any>()
  if (!client) return c.notFound()
  return c.html(
    clientFormPage(admin, { ...client, estado_uf: client.estado }, { mode: 'editar' })
  )
})

app.post('/clientes/:id/editar', requireAdmin(), async (c) => {
  const admin = c.get('admin')
  const id = Number(c.req.param('id'))
  const body = await c.req.parseBody()

  const dados = {
    id,
    razao_social: String(body.razao_social || '').trim(),
    nome_fantasia: String(body.nome_fantasia || '').trim() || null,
    cnpj: String(body.cnpj || '').trim() || null,
    vertical: String(body.vertical || '').trim() || null,
    tamanho_faixa: String(body.tamanho_faixa || '').trim() || null,
    responsavel_nome: String(body.responsavel_nome || '').trim(),
    responsavel_email: String(body.responsavel_email || '').trim(),
    cidade: String(body.cidade || '').trim() || null,
    estado_uf: String(body.estado_uf || '').trim() || null,
  }

  if (!dados.razao_social || !dados.responsavel_nome || !dados.responsavel_email) {
    return c.html(clientFormPage(admin, dados, { mode: 'editar', error: 'Razão social, nome e e-mail do responsável são obrigatórios.' }), 400)
  }

  await c.env.DB.prepare(
    `UPDATE clients SET razao_social = ?, nome_fantasia = ?, cnpj = ?, vertical = ?, tamanho_faixa = ?,
            responsavel_nome = ?, responsavel_email = ?, cidade = ?, estado = ?, atualizado_em = ?, atualizado_por = ?
      WHERE id = ?`
  )
    .bind(
      dados.razao_social, dados.nome_fantasia, dados.cnpj, dados.vertical, dados.tamanho_faixa,
      dados.responsavel_nome, dados.responsavel_email, dados.cidade, dados.estado_uf, nowIso(), admin.email, id
    )
    .run()

  await audit(c.env.DB, admin.email, 'cliente_editado', 'clients', id)
  return c.redirect(`/clientes/${id}?ok=${encodeURIComponent('Dados do cliente atualizados.')}`)
})

app.post('/clientes/:id/reenviar', requireAdmin(), async (c) => {
  const admin = c.get('admin')
  const id = Number(c.req.param('id'))
  const client = await c.env.DB.prepare('SELECT * FROM clients WHERE id = ? AND ativo = 1').bind(id).first<any>()
  if (!client) return c.notFound()
  const assessment = await c.env.DB.prepare('SELECT * FROM assessments WHERE client_id = ? ORDER BY id DESC LIMIT 1')
    .bind(id)
    .first<any>()
  if (!assessment) return c.notFound()

  const token = randomToken(24)
  const expira = addDays(num(c.env.LINK_TTL_DAYS, 30)).toISOString()
  await c.env.DB.prepare(
    'UPDATE assessments SET link_token = ?, expira_em = ?, atualizado_em = ?, atualizado_por = ? WHERE id = ?'
  )
    .bind(token, expira, nowIso(), admin.email, assessment.id)
    .run()

  const link = `${baseUrl(c)}/a/${token}`
  const mail = inviteEmail({
    empresa: client.nome_fantasia || client.razao_social,
    responsavel: client.responsavel_nome,
    link,
    expiraEm: fmtDate(expira),
    reenvio: true,
  })
  mail.to = client.responsavel_email
  const result = await sendMail(c.env, mail)

  await audit(
    c.env.DB, admin.email, 'link_reenviado', 'assessments', assessment.id,
    `token rotacionado · link anterior invalidado · e-mail ${result.sent ? 'enviado' : 'não enviado'}`
  )

  return c.redirect(
    `/clientes/${id}?ok=${encodeURIComponent(
      result.sent
        ? 'Novo link gerado e enviado por e-mail. O link anterior foi invalidado.'
        : `Novo link gerado (envio automático indisponível: ${result.detail}). Copie o link na ficha do cliente.`
    )}`
  )
})

app.post('/clientes/:id/reabrir', requireAdmin(), async (c) => {
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

  await audit(c.env.DB, admin.email, 'formulario_reaberto', 'assessments', assessment.id, 'nova versão das respostas habilitada')
  return c.redirect(`/clientes/${id}?ok=${encodeURIComponent('Formulário reaberto. O cliente pode complementar e reenviar; uma nova versão do relatório será gerada.')}`)
})

app.post('/clientes/:id/excluir', requireAdmin(), async (c) => {
  const admin = c.get('admin')
  const id = Number(c.req.param('id'))
  await c.env.DB.prepare(
    'UPDATE clients SET ativo = 0, excluido_em = ?, excluido_por = ? WHERE id = ?'
  )
    .bind(nowIso(), admin.email, id)
    .run()
  await audit(c.env.DB, admin.email, 'cliente_excluido', 'clients', id, 'exclusão lógica — dados preservados')
  return c.redirect(`/painel?ok=${encodeURIComponent('Cliente excluído (exclusão lógica).')}`)
})

/* ── relatórios (admin) ────────────────────────────────────────────────── */
app.get('/clientes/:id/relatorio', requireAdmin(), async (c) => {
  const admin = c.get('admin')
  const id = Number(c.req.param('id'))
  return renderAdminReport(c, admin, id, c.req.query('v'))
})

app.get('/clientes/:id/relatorio.pdf', requireAdmin(), async (c) => {
  const admin = c.get('admin')
  const id = Number(c.req.param('id'))
  return renderAdminReport(c, admin, id, c.req.query('v'), true)
})

app.get('/clientes/:id/relatorio.xlsx', requireAdmin(), async (c) => {
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
        { title: client.nome_fantasia || client.razao_social, subtitle: 'Relatório', active: '/clientes', admin },
        alertBox('warn', 'Nenhum relatório gerado. O relatório é criado automaticamente quando o cliente envia o formulário.')
      )
    )
  }

  const chosen =
    (vParam && reports.find((r) => String(r.versao) === String(vParam))) || reports[reports.length - 1]

  const data: ReportData = JSON.parse(chosen.conteudo)
  const html = renderReport({
    input: {
      client: {
        razao_social: client.razao_social,
        nome_fantasia: client.nome_fantasia,
        cnpj: client.cnpj,
        vertical: client.vertical,
        tamanho_faixa: client.tamanho_faixa,
        responsavel_nome: client.responsavel_nome,
        responsavel_email: client.responsavel_email,
        cidade: client.cidade,
        estado_uf: client.estado,
      },
      assessment: { id: assessment.id, versao: chosen.versao, submetido_em: assessment.submetido_em, criado_em: assessment.criado_em },
      questions: [],
      respostas: {},
      metas: {},
      initiatives: [],
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
    : `<a class="btn btn-sm" href="/clientes/${clientId}/relatorio.pdf?v=${chosen.versao}" target="_blank" rel="noopener"><i class="fa-solid fa-file-pdf" aria-hidden="true"></i> PDF</a>
       <a class="btn btn-sm btn-ghost" href="/clientes/${clientId}/relatorio.xlsx?v=${chosen.versao}"><i class="fa-solid fa-file-excel" aria-hidden="true"></i> XLSX</a>
       <a class="btn btn-sm btn-ghost" href="/clientes/${clientId}">Ficha do cliente</a>`

  const meta = `<div class="card" style="margin-bottom:16px;padding:12px 16px">
    <div class="small muted">
      Preenchido por <strong>${esc(client.responsavel_nome)}</strong> (${esc(client.responsavel_email)}) ·
      submetido em ${esc(fmtDate(assessment.submetido_em))} · versão v${chosen.versao} gerada em ${esc(fmtDate(chosen.gerado_em))}
      ${assessment.reaberto ? ' · formulário já reaberto pelo consultor' : ''}
    </div>
  </div>`

  if (print) {
    return c.html(
      doc(
        {
          title: `Relatório · ${client.nome_fantasia || client.razao_social}`,
          bodyClass: 'public-shell',
          head: `<script>window.addEventListener('load', function(){ setTimeout(function(){ window.print(); }, 400); });</script>`,
        },
        `<div class="public-top no-print"><img src="/static/logo.png" alt="Unified Technologies">
          <span class="small muted">Use a caixa de impressão para salvar como PDF · <a href="javascript:window.print()">imprimir novamente</a></span>
        </div>
        <div class="public-body">${html}</div>`
      )
    )
  }

  return c.html(
    adminShell(
      {
        title: client.nome_fantasia || client.razao_social,
        subtitle: 'Relatório de maturidade',
        active: '/clientes',
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
  const data: ReportData = JSON.parse(chosen.conteudo)
  const slug = (client.nome_fantasia || client.razao_social || 'cliente').replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase()

  const scoreRows: any[][] = [
    ['Cliente', client.nome_fantasia || client.razao_social],
    ['Relatório', `v${chosen.versao}`],
    ['Índice geral (0–5)', Number(chosen.indice_geral)],
    [],
    ['Dimensão', 'Atual', 'Meta 12m', 'Gap', 'Prioridade', 'Confiança', 'Respondidas'],
    ...data.scorecard.map((r: any) => [r.nome, r.atual, r.meta, r.gap, r.prioridade, r.confianca, `${r.respondidas}/${r.total}`]),
  ]

  const iniRows: any[][] = [
    ['Iniciativa', 'Prioridade', 'Urgência', 'Dimensão', 'Problema', 'Benefício', 'Próximo passo', 'Horizonte'],
    ...data.iniciativas.map((i: any) => [i.nome, i.prioridade_calculada, i.urgencia, i.dimensao, i.problema, i.beneficio, i.proximo_passo, i.horizonte]),
  ]

  const planoRows: any[][] = [['Horizonte', 'Iniciativas']]
  for (const h of data.plano) {
    planoRows.push([h.label, h.itens.map((i: any) => i.nome).join(' | ') || '—'])
  }

  const bytes = buildXlsx([
    { name: 'Scorecard', rows: scoreRows, widths: [34, 10, 12, 8, 12, 14, 12] },
    { name: 'Iniciativas', rows: iniRows, widths: [36, 12, 10, 24, 40, 40, 44, 12] },
    { name: 'Plano 90 dias', rows: planoRows, widths: [26, 70] },
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
  if (!a) return notFoundPage(c, 'Link inválido', 'Este link não corresponde a um assessment ativo. Solicite um novo link ao consultor da Unified Technologies.')
  if (linkExpired(a)) {
    return expiredPage(c, a.client.nome_fantasia || a.client.razao_social, a.expira_em)
  }
  if (a.estado === 'submetido' || a.estado === 'gerado') {
    return c.redirect(`/a/${token}/relatorio`)
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
  if (!a) return c.json({ ok: false, message: 'Link inválido.' }, 404)
  if (linkExpired(a)) return c.json({ ok: false, message: 'Link expirado.' }, 410)
  if (a.estado === 'submetido' || (a.estado === 'gerado' && !a.reaberto)) {
    return c.json({ ok: false, message: 'Formulário já submetido.' }, 409)
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
      const meta = Math.max(0, Math.min(4, Number(t.meta)))
      await c.env.DB.prepare(
        `INSERT INTO dimension_targets (assessment_id, dimensao, meta_nivel) VALUES (?, ?, ?)
         ON CONFLICT(assessment_id, dimensao) DO UPDATE SET meta_nivel = excluded.meta_nivel`
      )
        .bind(a.id, dim, meta)
        .run()
    }
  }

  if (Array.isArray(body.iniciativas)) {
    for (const ini of body.iniciativas) {
      const idx = Number(ini?.idx ?? 0)
      const nome = String(ini?.nome || '').trim()
      if (!nome) continue
      const dim = DIMENSIONS.some((d) => d.key === ini?.dimensao) ? ini.dimensao : null
      const urgencia = Math.max(1, Math.min(3, Number(ini?.urgencia) || 2))
      const existing = await c.env.DB.prepare('SELECT id FROM initiatives WHERE assessment_id = ? AND ordem = ?')
        .bind(a.id, idx + 1)
        .first<{ id: number }>()
      if (existing) {
        await c.env.DB.prepare(
          'UPDATE initiatives SET nome = ?, problema = ?, beneficio = ?, urgencia = ?, dimensao = ? WHERE id = ?'
        )
          .bind(nome, String(ini?.problema || ''), String(ini?.beneficio || ''), urgencia, dim, existing.id)
          .run()
      } else {
        await c.env.DB.prepare(
          'INSERT INTO initiatives (assessment_id, ordem, nome, problema, beneficio, urgencia, dimensao) VALUES (?, ?, ?, ?, ?, ?, ?)'
        )
          .bind(a.id, idx + 1, nome, String(ini?.problema || ''), String(ini?.beneficio || ''), urgencia, dim)
          .run()
      }
    }
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
  if (!a) return c.json({ ok: false, message: 'Link inválido.' }, 404)
  if (linkExpired(a)) return c.json({ ok: false, message: 'Link expirado.' }, 410)
  if (a.estado === 'gerado' && !a.reaberto) {
    return c.json({ ok: true, redirect: `/a/${token}/relatorio` })
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
        message: `${pendentes.length} pergunta(s) obrigatória(s) em branco.`,
        pendentes: pendentes.map((q) => ({ id: q.id, texto: q.texto })),
      },
      400
    )
  }

  const metas = await targetsMap(c.env, a.id)
  const initiatives = await initiativesFor(c.env, a.id)

  const data = buildReportData({
    client: a.client as any,
    assessment: { id: a.id, versao: 0, submetido_em: a.submetido_em, criado_em: a.criado_em },
    questions,
    respostas,
    metas,
    initiatives,
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

  // persiste prioridade calculada das iniciativas
  for (const ini of data.iniciativas) {
    if (ini.id > 0) {
      await c.env.DB.prepare('UPDATE initiatives SET prioridade_calculada = ?, proximo_passo = ? WHERE id = ?')
        .bind(ini.prioridade_calculada, ini.proximo_passo, ini.id)
        .run()
    }
  }

  await audit(c.env.DB, a.client.responsavel_email, 'assessment_submetido', 'assessments', a.id, `relatório v${versao} gerado (id ${inserted.meta.last_row_id})`)

  return c.json({ ok: true, redirect: `/a/${token}/relatorio`, versao, report_id: inserted.meta.last_row_id })
})

/* ── respostas em modo somente leitura (cliente) ───────────────────────── */
app.get('/a/:token/respostas', async (c) => {
  const token = c.req.param('token')
  const a = await assessmentByToken(c.env, token)
  if (!a) return notFoundPage(c, 'Link inválido', 'Este link não corresponde a um assessment ativo.')

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
        ? 'Formulário já submetido — as respostas abaixo estão em modo somente leitura. Alterações exigem reabertura pelo consultor da Unified Technologies.'
        : 'Este é o seu rascunho atual. As respostas são salvas automaticamente enquanto você preenche.',
    })
  )
})

/* ── relatório público (cliente) ───────────────────────────────────────── */
app.get('/a/:token/relatorio', async (c) => {
  const token = c.req.param('token')
  return renderClientReport(c, token, c.req.query('v'), false)
})

app.get('/a/:token/relatorio.pdf', async (c) => {
  const token = c.req.param('token')
  return renderClientReport(c, token, c.req.query('v'), true)
})

app.get('/a/:token/relatorio.xlsx', async (c) => {
  const token = c.req.param('token')
  const a = await assessmentByToken(c.env, token)
  if (!a) return notFoundPage(c, 'Link inválido', 'Solicite um novo link ao consultor da Unified Technologies.')
  const reports = await reportsFor(c.env, a.id)
  if (!reports.length) return c.redirect(`/a/${token}`)
  const chosen = (c.req.query('v') && reports.find((r) => String(r.versao) === String(c.req.query('v')))) || reports[reports.length - 1]
  const data: ReportData = JSON.parse(chosen.conteudo)
  const slug = (a.client.nome_fantasia || a.client.razao_social).replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase()
  const bytes = buildXlsx([
    {
      name: 'Scorecard',
      rows: [
        ['Cliente', a.client.nome_fantasia || a.client.razao_social],
        ['Índice geral (0–5)', Number(chosen.indice_geral)],
        [],
        ['Dimensão', 'Atual', 'Meta 12m', 'Gap', 'Prioridade'],
        ...data.scorecard.map((r: any) => [r.nome, r.atual, r.meta, r.gap, r.prioridade]),
      ],
      widths: [34, 10, 12, 8, 12],
    },
    {
      name: 'Iniciativas',
      rows: [
        ['Iniciativa', 'Prioridade', 'Problema', 'Benefício', 'Próximo passo'],
        ...data.iniciativas.map((i: any) => [i.nome, i.prioridade_calculada, i.problema, i.beneficio, i.proximo_passo]),
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
  if (!a) return notFoundPage(c, 'Link inválido', 'Este link não corresponde a um assessment ativo.')
  const reports = await reportsFor(c.env, a.id)
  if (!reports.length) {
    if (a.estado === 'submetido') {
      return c.html(publicShell('Relatório em preparação', alertBox('info', 'Relatório em preparação. Atualize a página em instantes.')))
    }
    return c.redirect(`/a/${token}`)
  }

  const chosen = (vParam && reports.find((r) => String(r.versao) === String(vParam))) || reports[reports.length - 1]
  const data: ReportData = JSON.parse(chosen.conteudo)

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
      initiatives: [],
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
      <strong style="color:var(--navy)">Relatório pronto</strong>
      <div class="small muted">v${chosen.versao} · ${esc(fmtDate(chosen.gerado_em))} · ${esc(a.client.nome_fantasia || a.client.razao_social)}</div>
    </div>
    <div class="report-actions">
      <a class="btn btn-sm" href="/a/${token}/relatorio.pdf?v=${chosen.versao}" target="_blank" rel="noopener"><i class="fa-solid fa-file-pdf" aria-hidden="true"></i> Exportar PDF</a>
      <a class="btn btn-sm btn-ghost" href="/a/${token}/relatorio.xlsx?v=${chosen.versao}"><i class="fa-solid fa-file-excel" aria-hidden="true"></i> XLSX</a>
      <a class="btn btn-sm btn-ghost" href="/a/${token}/respostas">Ver respostas</a>
    </div>
  </div>`

  if (print) {
    return c.html(
      doc(
        {
          title: `Relatório · ${a.client.nome_fantasia || a.client.razao_social}`,
          bodyClass: 'public-shell',
          head: `<script>window.addEventListener('load', function(){ setTimeout(function(){ window.print(); }, 400); });</script>`,
        },
        `<div class="public-top no-print"><img src="/static/logo.png" alt="Unified Technologies">
          <span class="small muted">Use a caixa de impressão para salvar como PDF · <a href="javascript:window.print()">imprimir novamente</a></span>
        </div><div class="public-body">${html}</div>`
      )
    )
  }

  return c.html(publicShell(`Relatório · ${a.client.nome_fantasia || a.client.razao_social}`, actions + html))
}

/* ── páginas de erro ───────────────────────────────────────────────────── */
function notFoundPage(c: any, title: string, message: string) {
  return c.html(
    publicShell(
      title,
      `<div class="card" style="max-width:560px;margin:60px auto;text-align:center">
        <i class="fa-solid fa-link-slash" style="font-size:30px;color:var(--blue-200)" aria-hidden="true"></i>
        <h1 style="font-size:22px;margin:14px 0 8px">${esc(title)}</h1>
        <p class="muted">${esc(message)}</p>
        <p class="small muted" style="margin-top:18px">Unified Technologies · Assessment de Maturidade em IA</p>
      </div>`,
      { backHref: '/', backLabel: 'Início' }
    ),
    404
  )
}

function expiredPage(c: any, empresa: string, expira: string | null) {
  return c.html(
    publicShell(
      'Link expirado',
      `<div class="card" style="max-width:560px;margin:60px auto;text-align:center">
        <i class="fa-regular fa-clock" style="font-size:30px;color:var(--warn)" aria-hidden="true"></i>
        <h1 style="font-size:22px;margin:14px 0 8px">Este link expirou</h1>
        <p class="muted">O link do assessment de <strong>${esc(empresa)}</strong> ${expira ? `venceu em ${esc(fmtDate(expira))}` : 'não está mais válido'}.
        Solicite um novo link ao consultor da Unified Technologies — suas respostas anteriores são preservadas.</p>
      </div>`,
      { backHref: '/', backLabel: 'Início' }
    ),
    410
  )
}

app.notFound((c) => notFoundPage(c, 'Página não encontrada', 'O endereço acessado não existe nesta aplicação.'))

export default app
