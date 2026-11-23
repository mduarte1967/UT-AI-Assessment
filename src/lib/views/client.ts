import { DIMENSIONS, LEVEL_LABELS } from '../questions'
import { esc, fmtDate, fmtDateTime, estadoLabel, estadoTone, formatIndex, prioridadePt } from '../util'
import { adminShell, badge, alertBox, levelChip } from './layout'
import type { QRow, ScoreRow } from '../scoring'
import { isAnswered, levelOf } from '../scoring'

const VERTICAIS = [
  'Healthcare',
  'Financial services',
  'Retail',
  'Manufacturing',
  'Technology',
  'Education',
  'Logistics',
  'Energy',
  'Services',
  'Public sector',
  'Other',
]

const PORTES = [
  '1 to 50 employees',
  '51 to 200 employees',
  '201 to 500 employees',
  '501 to 1,000 employees',
  '1,001 to 5,000 employees',
  'More than 5,000 employees',
]

const UFS = [
  'AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO',
]

export type ClientFormData = {
  id?: number
  razao_social?: string | null
  nome_fantasia?: string | null
  cnpj?: string | null
  vertical?: string | null
  tamanho_faixa?: string | null
  responsavel_nome?: string | null
  responsavel_email?: string | null
  cidade?: string | null
  estado_uf?: string | null
}

export function clientFormPage(
  admin: { nome: string; email: string },
  data: ClientFormData,
  opts: { error?: string; mode: 'novo' | 'editar'; link?: string; mailNote?: string; expiraEm?: string }
): string {
  const v = data
  const action = opts.mode === 'novo' ? '/clientes/novo' : `/clientes/${v.id}/editar`

  const form = `<form method="post" action="${action}" class="card" novalidate>
    <div class="card-head"><div>
      <h2>${opts.mode === 'novo' ? 'New client' : 'Edit client'}</h2>
      <div class="sub">${opts.mode === 'novo' ? 'Saving creates the assessment and generates the link automatically.' : 'Changes are recorded in the audit trail.'}</div>
    </div></div>

    ${opts.error ? alertBox('danger', esc(opts.error)) : ''}

    <div class="grid-2">
      <div class="field">
        <label for="razao_social">Legal name <span class="req">*</span></label>
        <input type="text" id="razao_social" name="razao_social" value="${esc(v.razao_social || '')}" required maxlength="180">
      </div>
      <div class="field">
        <label for="nome_fantasia">Trading name</label>
        <input type="text" id="nome_fantasia" name="nome_fantasia" value="${esc(v.nome_fantasia || '')}" maxlength="120">
      </div>
      <div class="field">
        <label for="cnpj">Company registration (CNPJ)</label>
        <input type="text" id="cnpj" name="cnpj" value="${esc(v.cnpj || '')}" placeholder="00.000.000/0000-00" maxlength="20">
      </div>
      <div class="field">
        <label for="tamanho_faixa">Company size (employees)</label>
        <select id="tamanho_faixa" name="tamanho_faixa">
          <option value="">Select…</option>
          ${PORTES.map((p) => `<option value="${esc(p)}" ${v.tamanho_faixa === p ? 'selected' : ''}>${esc(p)}</option>`).join('')}
        </select>
      </div>
      <div class="field">
        <label for="vertical">Industry / vertical</label>
        <select id="vertical" name="vertical">
          <option value="">Select…</option>
          ${VERTICAIS.map((x) => `<option value="${esc(x)}" ${v.vertical === x ? 'selected' : ''}>${esc(x)}</option>`).join('')}
        </select>
        <span class="hint">Defines the suggested initiatives when the client does not declare any.</span>
      </div>
      <div class="field">
        <label for="cidade">City</label>
        <input type="text" id="cidade" name="cidade" value="${esc(v.cidade || '')}" maxlength="90">
      </div>
      <div class="field">
        <label for="estado_uf">State</label>
        <select id="estado_uf" name="estado_uf">
          <option value="">Select…</option>
          ${UFS.map((u) => `<option value="${u}" ${v.estado_uf === u ? 'selected' : ''}>${u}</option>`).join('')}
        </select>
      </div>
    </div>

    <div class="divider"></div>
    <h3 style="margin-bottom:12px">Contact responsible for completing it</h3>
    <div class="grid-2">
      <div class="field">
        <label for="responsavel_nome">Name <span class="req">*</span></label>
        <input type="text" id="responsavel_nome" name="responsavel_nome" value="${esc(v.responsavel_nome || '')}" required maxlength="120">
      </div>
      <div class="field">
        <label for="responsavel_email">E-mail <span class="req">*</span></label>
        <input type="email" id="responsavel_email" name="responsavel_email" value="${esc(v.responsavel_email || '')}" required maxlength="160">
        <span class="hint">The assessment link is sent to this address.</span>
      </div>
    </div>

    <div class="divider"></div>
    <div style="display:flex;gap:10px;align-items:center">
      <button class="btn" type="submit"><i class="fa-solid fa-floppy-disk" aria-hidden="true"></i> ${
        opts.mode === 'novo' ? 'Register and generate link' : 'Save changes'
      }</button>
      <a class="btn btn-ghost" href="${opts.mode === 'novo' ? '/painel' : `/clientes/${v.id}`}">Cancel</a>
    </div>
  </form>`

  const linkCard = opts.link
    ? `<section class="card" style="margin-bottom:18px">
        <div class="card-head"><div>
          <h2><i class="fa-solid fa-link" aria-hidden="true"></i> Assessment link generated</h2>
          <div class="sub">Sent to ${esc(v.responsavel_email || '')}${opts.expiraEm ? ` · valid until ${esc(fmtDate(opts.expiraEm))}` : ''}</div>
        </div></div>
        ${opts.mailNote ? alertBox('info', opts.mailNote) : ''}
        <div class="link-box">
          <i class="fa-solid fa-lock" aria-hidden="true"></i>
          <input type="text" id="gen-link" value="${esc(opts.link)}" readonly aria-label="Assessment link">
          <button class="btn btn-sm btn-ghost" type="button" data-copy="gen-link"><i class="fa-regular fa-copy" aria-hidden="true"></i> Copy</button>
          <a class="btn btn-sm btn-ghost" href="${esc(opts.link)}" target="_blank" rel="noopener"><i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i> Open</a>
        </div>
      </section>`
    : ''

  return adminShell(
    {
      title: opts.mode === 'novo' ? 'Register client' : 'Edit client',
      subtitle: 'Clients',
      active: opts.mode === 'novo' ? '/clientes/novo' : '/clientes',
      admin,
      actions: `<a class="btn btn-ghost" href="/painel">Back to dashboard</a>`,
    },
    linkCard,
    form,
    `<script>
      document.addEventListener('click', function(e){
        var b = e.target.closest('[data-copy]');
        if (!b) return;
        var el = document.getElementById(b.getAttribute('data-copy'));
        if (!el) return;
        el.select();
        navigator.clipboard.writeText(el.value).then(function(){
          var old = b.innerHTML; b.innerHTML = '<i class="fa-solid fa-check"></i> Copied';
          setTimeout(function(){ b.innerHTML = old; }, 1600);
        });
      });
    </script>`
  )
}

export type ClientDetail = {
  client: any
  assessment: any | null
  reports: any[]
  questions: QRow[]
  respostas: Record<number, unknown>
  metas: Record<string, number>
  scorecard: ScoreRow[] | null
  initiatives: any[]
  baseUrl: string
  history: any[]
}

export function clientDetailPage(admin: { nome: string; email: string }, d: ClientDetail, flash?: string): string {
  const c = d.client
  const a = d.assessment
  const nome = c.nome_fantasia || c.razao_social
  const link = a ? `${d.baseUrl}/a/${a.link_token}` : ''
  const ultimo = d.reports.length ? d.reports[d.reports.length - 1] : null

  const infoCard = `<section class="card" style="margin-bottom:18px">
    <div class="card-head">
      <div>
        <h2>${esc(nome)}</h2>
        <div class="sub">${esc(c.razao_social)}${c.vertical ? ` · ${esc(c.vertical)}` : ''}${c.tamanho_faixa ? ` · ${esc(c.tamanho_faixa)}` : ''}</div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        ${a ? badge(estadoLabel(a.estado), estadoTone(a.estado)) : badge('No assessment', 'muted')}
        <a class="btn btn-sm btn-ghost" href="/clientes/${c.id}/editar"><i class="fa-solid fa-pen" aria-hidden="true"></i> Edit</a>
      </div>
    </div>
    <div class="grid-3 small">
      <div><strong>Company registration</strong><div class="muted">${esc(c.cnpj || '—')}</div></div>
      <div><strong>Contact</strong><div class="muted">${esc(c.responsavel_nome)}</div><div class="muted">${esc(c.responsavel_email)}</div></div>
      <div><strong>Location</strong><div class="muted">${esc([c.cidade, c.estado].filter(Boolean).join(' / ') || '—')}</div></div>
      <div><strong>Registered on</strong><div class="muted">${esc(fmtDate(c.criado_em))}</div></div>
      <div><strong>Submitted on</strong><div class="muted">${esc(a?.submetido_em ? fmtDateTime(a.submetido_em) : '—')}</div></div>
      <div><strong>Questionnaire version</strong><div class="muted">v${esc(a?.questionario_versao || 1)}</div></div>
    </div>
    <div class="divider"></div>
    ${
      link
        ? `<div class="link-box">
            <i class="fa-solid fa-link" aria-hidden="true"></i>
            <input type="text" id="client-link" value="${esc(link)}" readonly aria-label="Assessment link">
            <button class="btn btn-sm btn-ghost" type="button" data-copy="client-link"><i class="fa-regular fa-copy" aria-hidden="true"></i> Copy</button>
            <a class="btn btn-sm btn-ghost" href="${esc(link)}" target="_blank" rel="noopener">Open</a>
          </div>
          <div class="small muted" style="margin-top:8px">
            ${a?.expira_em ? `Link valid until ${esc(fmtDate(a.expira_em))}.` : 'No expiry defined for this link.'}
            ${a?.estado === 'submetido' || a?.estado === 'gerado' ? ' The questionnaire is locked.' : ''}
          </div>`
        : '<p class="small muted">No assessment linked.</p>'
    }
    <div class="divider"></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <form method="post" action="/clientes/${c.id}/reenviar" onsubmit="return confirm('Generate a new link? The previous link will be invalidated.')">
        <button class="btn btn-sm btn-ghost" type="submit"><i class="fa-solid fa-rotate" aria-hidden="true"></i> Resend link</button>
      </form>
      ${
        a && (a.estado === 'submetido' || a.estado === 'gerado')
          ? `<form method="post" action="/clientes/${c.id}/reabrir" onsubmit="return confirm('Reopen the questionnaire for a new response version?')">
              <button class="btn btn-sm btn-ghost" type="submit"><i class="fa-solid fa-lock-open" aria-hidden="true"></i> Reopen questionnaire</button>
            </form>`
          : ''
      }
      <form method="post" action="/clientes/${c.id}/excluir" onsubmit="return confirm('Logically delete this client? The data remains stored for audit purposes.')">
        <button class="btn btn-sm btn-danger" type="submit"><i class="fa-solid fa-trash-can" aria-hidden="true"></i> Delete</button>
      </form>
    </div>
  </section>`

  const reportsCard = `<section class="card" style="margin-bottom:18px">
    <div class="card-head"><div>
      <h2>Reports</h2>
      <div class="sub">${d.reports.length} version(s) generated · previous versions remain accessible</div>
    </div>
    ${ultimo ? `<a class="btn btn-sm" href="/clientes/${c.id}/relatorio"><i class="fa-solid fa-chart-simple" aria-hidden="true"></i> View report v${ultimo.versao}</a>` : ''}
    </div>
    ${
      d.reports.length
        ? `<div class="table-wrap"><table class="data"><thead><tr><th>Version</th><th>Index</th><th>Generated on</th><th class="num">Actions</th></tr></thead><tbody>
          ${d.reports
            .slice()
            .reverse()
            .map(
              (r) => `<tr>
              <td><strong>v${r.versao}</strong></td>
              <td>${formatIndex(r.indice_geral)} / 5</td>
              <td>${esc(fmtDateTime(r.gerado_em))}</td>
              <td class="num"><div class="row-actions">
                <a class="btn btn-sm btn-ghost" href="/clientes/${c.id}/relatorio?v=${r.versao}">Open</a>
                <a class="btn btn-sm btn-ghost" href="/clientes/${c.id}/relatorio.xlsx?v=${r.versao}">XLSX</a>
                <a class="btn btn-sm btn-ghost" href="/clientes/${c.id}/relatorio.pdf?v=${r.versao}" target="_blank" rel="noopener">PDF</a>
              </div></td>
            </tr>`
            )
            .join('')}
        </tbody></table></div>`
        : `<div class="empty"><i class="fa-regular fa-file-lines" aria-hidden="true"></i>
            No report yet. ${a && a.estado !== 'submetido' && a.estado !== 'gerado' ? 'The report is generated automatically when the client submits the questionnaire.' : ''}</div>`
    }
  </section>`

  const scorecardCard = d.scorecard
    ? `<section class="card" style="margin-bottom:18px">
        <div class="card-head"><div><h2>Result by dimension (latest version)</h2><div class="sub">Current level, target, gap and priority per dimension</div></div></div>
        <div class="table-wrap" style="border:0"><table class="scorecard">
          <thead><tr><th>Dimension</th><th class="num">Current</th><th class="num">Target</th><th class="num">Gap</th><th>Priority</th><th>Evidence</th></tr></thead>
          <tbody>${d.scorecard
            .map(
              (r) => `<tr>
              <td class="dim">${esc(r.nome)}</td>
              <td class="num">${levelChip(r.atual)}</td>
              <td class="num">L${r.meta}</td>
              <td class="num">${r.gap > 0 ? `+${r.gap}` : '0'}</td>
              <td><span class="badge ${
                r.prioridade === 'Critical' ? 'critical' : r.prioridade === 'High' ? 'high' : r.prioridade === 'Medium' ? 'medium' : 'low'
              }">${prioridadePt(r.prioridade)}</span></td>
              <td class="small muted">${r.respondidas}/${r.total} questions${r.confianca === 'reduzida' ? ' · reduced confidence' : ''}</td>
            </tr>`
            )
            .join('')}</tbody></table></div>
      </section>`
    : ''

  const respostasCard = `<section class="card">
    <div class="card-head"><div>
      <h2>Full responses</h2>
      <div class="sub">${Object.keys(d.respostas).length} response(s) recorded · questionnaire v${esc(a?.questionario_versao || 1)}</div>
    </div></div>
    ${d.questions
      .filter((q) => q.tipo !== 'texto')
      .reduce((acc, q) => {
        const dim = DIMENSIONS.find((x) => x.key === q.dimensao)!
        if (!acc.includes(dim.key)) acc.push(dim.key)
        return acc
      }, [] as string[])
      .map((key) => {
        const dim = DIMENSIONS.find((x) => x.key === key)!
        const qs = d.questions.filter((q) => q.dimensao === key && q.tipo !== 'texto')
        return `<div style="margin-bottom:14px">
          <h3 style="font-size:13px;margin-bottom:6px;color:var(--blue-600)">${esc(dim.nome)}</h3>
          <table class="data" style="font-size:12.5px">
            <tbody>${qs
              .map((q) => {
                const val = d.respostas[q.id]
                const lvl = levelOf(q, val)
                return `<tr>
                  <td style="width:60%">${esc(q.texto)}</td>
                  <td>${esc(answerLabel(q, val))}</td>
                  <td class="num" style="width:60px">${lvl === null ? '<span class="muted">—</span>' : `L${lvl}`}</td>
                </tr>`
              })
              .join('')}</tbody>
          </table>
        </div>`
      })
      .join('')}
    ${d.questions
      .filter((q) => q.tipo === 'texto')
      .map((q) => {
        const raw = d.respostas[q.id] as any
        const txt = String(raw?.t ?? raw ?? '')
        return txt
          ? `<div class="divider"></div><h3 style="font-size:13px;margin-bottom:6px">Declared context</h3><p class="small">${esc(txt)}</p>`
          : ''
      })
      .join('')}
  </section>`

  const metasCard = `<section class="card">
    <div class="card-head"><div><h2>Targets declared for 12 months</h2><div class="sub">Basis of the current × target comparison in the radar</div></div></div>
    <div class="targets">${DIMENSIONS.map((dim) => {
      const m = Number(d.metas[dim.key] ?? 2)
      return `<div class="target-row"><div><span class="tname">${esc(dim.short)}</span>
        <span class="tnow">${LEVEL_LABELS[m] || ''}</span></div>${levelChip(m)}</div>`
    }).join('')}</div>
  </section>`

  return adminShell(
    {
      title: nome,
      subtitle: 'Client',
      active: '/clientes',
      admin,
      actions: `<a class="btn btn-ghost" href="/painel">Dashboard</a>`,
    },
    flash ? alertBox('ok', esc(flash)) : '',
    infoCard,
    reportsCard,
    scorecardCard,
    `<div class="grid-2" style="align-items:start">${respostasCard}${metasCard}</div>`,
    `<script>
      document.addEventListener('click', function(e){
        var b = e.target.closest('[data-copy]');
        if (!b) return;
        var el = document.getElementById(b.getAttribute('data-copy'));
        if (!el) return;
        el.select();
        navigator.clipboard.writeText(el.value).then(function(){
          var old = b.innerHTML; b.innerHTML = '<i class="fa-solid fa-check"></i> Copied';
          setTimeout(function(){ b.innerHTML = old; }, 1600);
        });
      });
    </script>`
  )
}

function answerLabel(q: QRow, val: unknown): string {
  if (val === null || val === undefined) return '—'
  if (q.tipo === 'escala') {
    const v = Number((val as any)?.v ?? val)
    const idx = v - 1
    const label = q.rubrica?.labels?.[idx] || ''
    return label ? `L${idx} — ${label}` : `L${idx}`
  }
  if (q.tipo === 'escolha') {
    const i = Number((val as any)?.i ?? val)
    return q.opcoes?.[i]?.label || '—'
  }
  if (q.tipo === 'multipla') {
    const arr: number[] = Array.isArray(val) ? val.map(Number) : (val as any)?.sel?.map(Number) || []
    if (!arr.length) return '—'
    return arr.map((i) => q.opcoes?.[i]?.label).filter(Boolean).join(' · ')
  }
  return String((val as any)?.t ?? val ?? '—')
}
