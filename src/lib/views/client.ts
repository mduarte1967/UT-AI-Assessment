import { DIMENSIONS, LEVEL_LABELS, TARGET_BENCHMARK } from '../questions'
import { esc, fmtDate, fmtDateTime, estadoLabel, estadoTone, formatIndex } from '../util'
import { adminShell, badge, alertBox } from './layout'
import { priorityBadge } from '../report'
import type { QRow, ScoreRow } from '../scoring'
import { isAnswered, levelOf, optionLabels } from '../scoring'
import { COUNTRY_NAMES, DEFAULT_COUNTRY, REGION_SUGGESTIONS, CLIENT_VERTICALS, CLIENT_SIZES } from '../geo'

export const VERTICAIS = CLIENT_VERTICALS
export const PORTES = CLIENT_SIZES

export type ClientFormData = {
  id?: number
  razao_social?: string | null
  nome_fantasia?: string | null
  tax_id?: string | null
  country?: string | null
  estado?: string | null
  cidade?: string | null
  postal_code?: string | null
  website?: string | null
  vertical?: string | null
  tamanho_faixa?: string | null
  responsavel_nome?: string | null
  responsavel_email?: string | null
}

const REGION_OPTIONS = REGION_SUGGESTIONS.map((r) => `<option value="${esc(r)}"></option>`).join('')

export function clientFormPage(
  admin: { nome: string; email: string },
  data: ClientFormData,
  opts: { error?: string; mode: 'novo' | 'editar'; link?: string; mailNote?: string; expiraEm?: string }
): string {
  const v = data
  const action = opts.mode === 'novo' ? '/admin/clients/new' : `/admin/clients/${v.id}/edit`
  const country = v.country || DEFAULT_COUNTRY

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
        <label for="nome_fantasia">Trading name (DBA)</label>
        <input type="text" id="nome_fantasia" name="nome_fantasia" value="${esc(v.nome_fantasia || '')}" maxlength="120">
      </div>
      <div class="field">
        <label for="tax_id">Tax ID (EIN / registration)</label>
        <input type="text" id="tax_id" name="tax_id" value="${esc(v.tax_id || '')}" placeholder="12-3456789" maxlength="30">
        <span class="hint">Optional. US EIN, or the local company registration number.</span>
      </div>
      <div class="field">
        <label for="website">Website</label>
        <input type="text" id="website" name="website" value="${esc(v.website || '')}" placeholder="https://" maxlength="160">
      </div>
      <div class="field">
        <label for="vertical">Industry / vertical</label>
        <select id="vertical" name="vertical">
          <option value="">Select…</option>
          ${VERTICAIS.map((x) => `<option value="${esc(x)}" ${v.vertical === x ? 'selected' : ''}>${esc(x)}</option>`).join('')}
        </select>
        <span class="hint">Used for the industry affinity nudge when the method selects the initiatives.</span>
      </div>
      <div class="field">
        <label for="tamanho_faixa">Company size (employees)</label>
        <select id="tamanho_faixa" name="tamanho_faixa">
          <option value="">Select…</option>
          ${PORTES.map((p) => `<option value="${esc(p)}" ${v.tamanho_faixa === p ? 'selected' : ''}>${esc(p)}</option>`).join('')}
        </select>
      </div>
    </div>

    <div class="divider"></div>
    <h3 style="margin-bottom:12px">Location</h3>
    <div class="grid-3">
      <div class="field">
        <label for="country">Country / territory</label>
        <select id="country" name="country">
          ${COUNTRY_NAMES.map((n) => `<option value="${esc(n)}" ${country === n ? 'selected' : ''}>${esc(n)}</option>`).join('')}
        </select>
      </div>
      <div class="field">
        <label for="estado">State / region</label>
        <input type="text" id="estado" name="estado" value="${esc(v.estado || '')}" list="region-list" maxlength="60" placeholder="Florida (FL)">
        <datalist id="region-list">${REGION_OPTIONS}</datalist>
        <span class="hint">Pick from the list or type any region.</span>
      </div>
      <div class="field">
        <label for="cidade">City</label>
        <input type="text" id="cidade" name="cidade" value="${esc(v.cidade || '')}" maxlength="90">
      </div>
      <div class="field">
        <label for="postal_code">ZIP / postal code</label>
        <input type="text" id="postal_code" name="postal_code" value="${esc(v.postal_code || '')}" maxlength="20">
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
      <a class="btn btn-ghost" href="${opts.mode === 'novo' ? '/admin' : `/admin/clients/${v.id}`}">Cancel</a>
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
      active: opts.mode === 'novo' ? '/admin/clients/new' : '/admin/clients',
      admin,
      actions: `<a class="btn btn-ghost" href="/admin">Back to dashboard</a>`,
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
  const location = [c.cidade, c.estado, c.country].filter(Boolean).join(' · ')

  const infoCard = `<section class="card" style="margin-bottom:18px">
    <div class="card-head">
      <div>
        <h2>${esc(nome)}</h2>
        <div class="sub">${esc(c.razao_social)}${c.vertical ? ` · ${esc(c.vertical)}` : ''}${c.tamanho_faixa ? ` · ${esc(c.tamanho_faixa)}` : ''}</div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        ${a ? badge(estadoLabel(a.estado), estadoTone(a.estado)) : badge('No assessment', 'muted')}
        <a class="btn btn-sm btn-ghost" href="/admin/clients/${c.id}/edit"><i class="fa-solid fa-pen" aria-hidden="true"></i> Edit</a>
      </div>
    </div>
    <div class="grid-3 small">
      <div><strong>Tax ID</strong><div class="muted">${esc(c.tax_id || '—')}</div></div>
      <div><strong>Contact</strong><div class="muted">${esc(c.responsavel_nome)}</div><div class="muted">${esc(c.responsavel_email)}</div></div>
      <div><strong>Location</strong><div class="muted">${esc(location || '—')}${c.postal_code ? ` · ${esc(c.postal_code)}` : ''}</div></div>
      <div><strong>Website</strong><div class="muted">${
        c.website ? `<a href="${esc(/^https?:\/\//i.test(c.website) ? c.website : 'https://' + c.website)}" target="_blank" rel="noopener">${esc(c.website)}</a>` : '—'
      }</div></div>
      <div><strong>Registered on</strong><div class="muted">${esc(fmtDate(c.criado_em))}</div></div>
      <div><strong>Submitted on</strong><div class="muted">${esc(a?.submetido_em ? fmtDateTime(a.submetido_em) : '—')}</div></div>
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
      <form method="post" action="/admin/clients/${c.id}/resend" onsubmit="return confirm('Generate a new link? The previous link will be invalidated.')">
        <button class="btn btn-sm btn-ghost" type="submit"><i class="fa-solid fa-rotate" aria-hidden="true"></i> Resend link</button>
      </form>
      ${
        a && (a.estado === 'submetido' || a.estado === 'gerado')
          ? `<form method="post" action="/admin/clients/${c.id}/reopen" onsubmit="return confirm('Reopen the questionnaire for a new response version?')">
              <button class="btn btn-sm btn-ghost" type="submit"><i class="fa-solid fa-lock-open" aria-hidden="true"></i> Reopen questionnaire</button>
            </form>`
          : ''
      }
      <form method="post" action="/admin/clients/${c.id}/delete" onsubmit="return confirm('Logically delete this client? The data remains stored for audit purposes.')">
        <button class="btn btn-sm btn-danger" type="submit"><i class="fa-solid fa-trash-can" aria-hidden="true"></i> Delete</button>
      </form>
    </div>
  </section>`

  const reportsCard = `<section class="card" style="margin-bottom:18px">
    <div class="card-head"><div>
      <h2>Reports</h2>
      <div class="sub">${d.reports.length} version(s) generated · previous versions remain accessible</div>
    </div>
    ${ultimo ? `<a class="btn btn-sm" href="/admin/clients/${c.id}/report"><i class="fa-solid fa-chart-simple" aria-hidden="true"></i> View report v${ultimo.versao}</a>` : ''}
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
                <a class="btn btn-sm btn-ghost" href="/admin/clients/${c.id}/report?v=${r.versao}">Open</a>
                <a class="btn btn-sm btn-ghost" href="/admin/clients/${c.id}/report.xlsx?v=${r.versao}">XLSX</a>
                <a class="btn btn-sm btn-ghost" href="/admin/clients/${c.id}/report.pdf?v=${r.versao}" target="_blank" rel="noopener">PDF</a>
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
        <div class="card-head"><div><h2>Result by dimension (latest version)</h2><div class="sub">Current maturity, target, gap and priority per dimension — 1 to 5 scale</div></div></div>
        <div class="table-wrap" style="border:0"><table class="scorecard">
          <thead><tr><th>Dimension</th><th class="num">Current</th><th class="num">Target</th><th class="num">Gap</th><th>Priority</th><th>Evidence</th></tr></thead>
          <tbody>${d.scorecard
            .map(
              (r) => `<tr>
              <td class="dim">${esc(r.nome)}<div class="small muted">${Math.round(r.peso * 100)}% weight</div></td>
              <td class="num"><strong>${r.atual.toFixed(1)}</strong></td>
              <td class="num">${r.meta.toFixed(1)}</td>
              <td class="num">${r.gap > 0 ? `+${r.gap.toFixed(1)}` : '0.0'}</td>
              <td>${priorityBadge(r.prioridade)}</td>
              <td class="small muted">${r.respondidas}/${r.total} scored${r.confianca === 'reduzida' ? ' · reduced confidence' : ''}</td>
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
    <div class="card-head"><div><h2>Framework benchmark by dimension</h2><div class="sub">Fixed reference of the method — the basis of the current × benchmark comparison</div></div></div>
    <div class="targets">${DIMENSIONS.map((dim) => {
      const m = Math.max(1, Math.min(5, TARGET_BENCHMARK[dim.key] ?? 3))
      return `<div class="target-row"><div><span class="tname">${esc(dim.short)}</span>
        <span class="tnow">${LEVEL_LABELS[m - 1] || ''} · ${Math.round(dim.peso * 100)}% weight</span></div><span class="lvl-chip l${m}">${m}</span></div>`
    }).join('')}</div>
    <div class="small muted" style="margin-top:12px">
      The benchmark is not declared by the client: every assessment is compared against the same
      reference, so gaps stay comparable across clients and across cycles.
    </div>
  </section>`

  return adminShell(
    {
      title: nome,
      subtitle: 'Client',
      active: '/admin/clients',
      admin,
      actions: `<a class="btn btn-ghost" href="/admin">Dashboard</a>`,
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
  if (q.tipo === 'escala' || q.tipo === 'hibrido') {
    const v = Number((val as any)?.v ?? val)
    if (!v) return '—'
    const label = q.rubrica?.labels?.[v - 1] || ''
    const base = label ? `L${v} — ${label}` : `L${v}`
    const items = optionLabels(q, val)
    return items.length ? `${base}<div class="small muted" style="margin-top:4px">${items.join(' · ')}</div>` : base
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
  return String((val as any)?.t ?? val ?? '')
}
