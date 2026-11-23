import { DIMENSIONS, LEVEL_LABELS, LEVEL_DESC } from '../questions'
import { esc, fmtDate, fmtDateTime, estadoLabel, estadoTone, formatIndex, prioridadePt } from '../util'
import { adminShell, badge, alertBox, levelChip } from './layout'
import type { QRow, ScoreRow } from '../scoring'
import { isAnswered, levelOf } from '../scoring'

const VERTICAIS = [
  'Saúde',
  'Financeiro',
  'Varejo',
  'Indústria',
  'Tecnologia',
  'Educação',
  'Logística',
  'Energia',
  'Serviços',
  'Setor público',
  'Outro',
]

const PORTES = [
  '1 a 50 funcionários',
  '51 a 200 funcionários',
  '201 a 500 funcionários',
  '501 a 1.000 funcionários',
  '1.001 a 5.000 funcionários',
  'Mais de 5.000 funcionários',
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
      <h2>${opts.mode === 'novo' ? 'Novo cliente' : 'Editar cliente'}</h2>
      <div class="sub">${opts.mode === 'novo' ? 'Ao salvar, o assessment é criado e o link é gerado automaticamente.' : 'Alterações são registradas na trilha de auditoria.'}</div>
    </div></div>

    ${opts.error ? alertBox('danger', esc(opts.error)) : ''}

    <div class="grid-2">
      <div class="field">
        <label for="razao_social">Razão social <span class="req">*</span></label>
        <input type="text" id="razao_social" name="razao_social" value="${esc(v.razao_social || '')}" required maxlength="180">
      </div>
      <div class="field">
        <label for="nome_fantasia">Nome fantasia</label>
        <input type="text" id="nome_fantasia" name="nome_fantasia" value="${esc(v.nome_fantasia || '')}" maxlength="120">
      </div>
      <div class="field">
        <label for="cnpj">CNPJ</label>
        <input type="text" id="cnpj" name="cnpj" value="${esc(v.cnpj || '')}" placeholder="00.000.000/0000-00" maxlength="20">
      </div>
      <div class="field">
        <label for="tamanho_faixa">Porte (funcionários)</label>
        <select id="tamanho_faixa" name="tamanho_faixa">
          <option value="">Selecione…</option>
          ${PORTES.map((p) => `<option value="${esc(p)}" ${v.tamanho_faixa === p ? 'selected' : ''}>${esc(p)}</option>`).join('')}
        </select>
      </div>
      <div class="field">
        <label for="vertical">Setor / vertical</label>
        <select id="vertical" name="vertical">
          <option value="">Selecione…</option>
          ${VERTICAIS.map((x) => `<option value="${esc(x)}" ${v.vertical === x ? 'selected' : ''}>${esc(x)}</option>`).join('')}
        </select>
        <span class="hint">Define as iniciativas sugeridas quando o cliente não declarar nenhuma.</span>
      </div>
      <div class="field">
        <label for="cidade">Cidade</label>
        <input type="text" id="cidade" name="cidade" value="${esc(v.cidade || '')}" maxlength="90">
      </div>
      <div class="field">
        <label for="estado_uf">Estado</label>
        <select id="estado_uf" name="estado_uf">
          <option value="">Selecione…</option>
          ${UFS.map((u) => `<option value="${u}" ${v.estado_uf === u ? 'selected' : ''}>${u}</option>`).join('')}
        </select>
      </div>
    </div>

    <div class="divider"></div>
    <h3 style="margin-bottom:12px">Responsável pelo preenchimento</h3>
    <div class="grid-2">
      <div class="field">
        <label for="responsavel_nome">Nome <span class="req">*</span></label>
        <input type="text" id="responsavel_nome" name="responsavel_nome" value="${esc(v.responsavel_nome || '')}" required maxlength="120">
      </div>
      <div class="field">
        <label for="responsavel_email">E-mail <span class="req">*</span></label>
        <input type="email" id="responsavel_email" name="responsavel_email" value="${esc(v.responsavel_email || '')}" required maxlength="160">
        <span class="hint">O link do assessment é enviado para este endereço.</span>
      </div>
    </div>

    <div class="divider"></div>
    <div style="display:flex;gap:10px;align-items:center">
      <button class="btn" type="submit"><i class="fa-solid fa-floppy-disk" aria-hidden="true"></i> ${
        opts.mode === 'novo' ? 'Cadastrar e gerar link' : 'Salvar alterações'
      }</button>
      <a class="btn btn-ghost" href="${opts.mode === 'novo' ? '/painel' : `/clientes/${v.id}`}">Cancelar</a>
    </div>
  </form>`

  const linkCard = opts.link
    ? `<section class="card" style="margin-bottom:18px">
        <div class="card-head"><div>
          <h2><i class="fa-solid fa-link" aria-hidden="true"></i> Link do assessment gerado</h2>
          <div class="sub">Enviado para ${esc(v.responsavel_email || '')}${opts.expiraEm ? ` · válido até ${esc(fmtDate(opts.expiraEm))}` : ''}</div>
        </div></div>
        ${opts.mailNote ? alertBox('info', opts.mailNote) : ''}
        <div class="link-box">
          <i class="fa-solid fa-lock" aria-hidden="true"></i>
          <input type="text" id="gen-link" value="${esc(opts.link)}" readonly aria-label="Link do assessment">
          <button class="btn btn-sm btn-ghost" type="button" data-copy="gen-link"><i class="fa-regular fa-copy" aria-hidden="true"></i> Copiar</button>
          <a class="btn btn-sm btn-ghost" href="${esc(opts.link)}" target="_blank" rel="noopener"><i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i> Abrir</a>
        </div>
      </section>`
    : ''

  return adminShell(
    {
      title: opts.mode === 'novo' ? 'Cadastro de cliente' : 'Editar cliente',
      subtitle: 'Clientes',
      active: opts.mode === 'novo' ? '/clientes/novo' : '/clientes',
      admin,
      actions: `<a class="btn btn-ghost" href="/painel">Voltar ao painel</a>`,
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
          var old = b.innerHTML; b.innerHTML = '<i class="fa-solid fa-check"></i> Copiado';
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
        ${a ? badge(estadoLabel(a.estado), estadoTone(a.estado)) : badge('Sem assessment', 'muted')}
        <a class="btn btn-sm btn-ghost" href="/clientes/${c.id}/editar"><i class="fa-solid fa-pen" aria-hidden="true"></i> Editar</a>
      </div>
    </div>
    <div class="grid-3 small">
      <div><strong>CNPJ</strong><div class="muted">${esc(c.cnpj || '—')}</div></div>
      <div><strong>Responsável</strong><div class="muted">${esc(c.responsavel_nome)}</div><div class="muted">${esc(c.responsavel_email)}</div></div>
      <div><strong>Localidade</strong><div class="muted">${esc([c.cidade, c.estado].filter(Boolean).join(' / ') || '—')}</div></div>
      <div><strong>Cadastrado em</strong><div class="muted">${esc(fmtDate(c.criado_em))}</div></div>
      <div><strong>Submetido em</strong><div class="muted">${esc(a?.submetido_em ? fmtDateTime(a.submetido_em) : '—')}</div></div>
      <div><strong>Versão do questionário</strong><div class="muted">v${esc(a?.questionario_versao || 1)}</div></div>
    </div>
    <div class="divider"></div>
    ${
      link
        ? `<div class="link-box">
            <i class="fa-solid fa-link" aria-hidden="true"></i>
            <input type="text" id="client-link" value="${esc(link)}" readonly aria-label="Link do assessment">
            <button class="btn btn-sm btn-ghost" type="button" data-copy="client-link"><i class="fa-regular fa-copy" aria-hidden="true"></i> Copiar</button>
            <a class="btn btn-sm btn-ghost" href="${esc(link)}" target="_blank" rel="noopener">Abrir</a>
          </div>
          <div class="small muted" style="margin-top:8px">
            ${a?.expira_em ? `Link válido até ${esc(fmtDate(a.expira_em))}.` : 'Link sem expiração definida.'}
            ${a?.estado === 'submetido' || a?.estado === 'gerado' ? ' O formulário está travado.' : ''}
          </div>`
        : '<p class="small muted">Nenhum assessment vinculado.</p>'
    }
    <div class="divider"></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <form method="post" action="/clientes/${c.id}/reenviar" onsubmit="return confirm('Gerar novo link? O link anterior será invalidado.')">
        <button class="btn btn-sm btn-ghost" type="submit"><i class="fa-solid fa-rotate" aria-hidden="true"></i> Reenviar link</button>
      </form>
      ${
        a && (a.estado === 'submetido' || a.estado === 'gerado')
          ? `<form method="post" action="/clientes/${c.id}/reabrir" onsubmit="return confirm('Reabrir o formulário para nova versão das respostas?')">
              <button class="btn btn-sm btn-ghost" type="submit"><i class="fa-solid fa-lock-open" aria-hidden="true"></i> Reabrir formulário</button>
            </form>`
          : ''
      }
      <form method="post" action="/clientes/${c.id}/excluir" onsubmit="return confirm('Excluir logicamente este cliente? Os dados permanecem armazenados para auditoria.')">
        <button class="btn btn-sm btn-danger" type="submit"><i class="fa-solid fa-trash-can" aria-hidden="true"></i> Excluir</button>
      </form>
    </div>
  </section>`

  const reportsCard = `<section class="card" style="margin-bottom:18px">
    <div class="card-head"><div>
      <h2>Relatórios</h2>
      <div class="sub">${d.reports.length} versão(ões) gerada(s) · versões anteriores permanecem acessíveis</div>
    </div>
    ${ultimo ? `<a class="btn btn-sm" href="/clientes/${c.id}/relatorio"><i class="fa-solid fa-chart-simple" aria-hidden="true"></i> Ver relatório v${ultimo.versao}</a>` : ''}
    </div>
    ${
      d.reports.length
        ? `<div class="table-wrap"><table class="data"><thead><tr><th>Versão</th><th>Índice</th><th>Gerado em</th><th class="num">Ações</th></tr></thead><tbody>
          ${d.reports
            .slice()
            .reverse()
            .map(
              (r) => `<tr>
              <td><strong>v${r.versao}</strong></td>
              <td>${formatIndex(r.indice_geral)} / 5</td>
              <td>${esc(fmtDateTime(r.gerado_em))}</td>
              <td class="num"><div class="row-actions">
                <a class="btn btn-sm btn-ghost" href="/clientes/${c.id}/relatorio?v=${r.versao}">Abrir</a>
                <a class="btn btn-sm btn-ghost" href="/clientes/${c.id}/relatorio.xlsx?v=${r.versao}">XLSX</a>
                <a class="btn btn-sm btn-ghost" href="/clientes/${c.id}/relatorio.pdf?v=${r.versao}" target="_blank" rel="noopener">PDF</a>
              </div></td>
            </tr>`
            )
            .join('')}
        </tbody></table></div>`
        : `<div class="empty"><i class="fa-regular fa-file-lines" aria-hidden="true"></i>
            Nenhum relatório ainda. ${a && a.estado !== 'submetido' && a.estado !== 'gerado' ? 'O relatório é gerado automaticamente quando o cliente enviar o formulário.' : ''}</div>`
    }
  </section>`

  const scorecardCard = d.scorecard
    ? `<section class="card" style="margin-bottom:18px">
        <div class="card-head"><div><h2>Resultado por dimensão (última versão)</h2><div class="sub">Nível atual, meta, lacuna e prioridade por dimensão</div></div></div>
        <div class="table-wrap" style="border:0"><table class="scorecard">
          <thead><tr><th>Dimensão</th><th class="num">Atual</th><th class="num">Meta</th><th class="num">Lacuna</th><th>Prioridade</th><th>Evidência</th></tr></thead>
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
              <td class="small muted">${r.respondidas}/${r.total} perguntas${r.confianca === 'reduzida' ? ' · confiança reduzida' : ''}</td>
            </tr>`
            )
            .join('')}</tbody></table></div>
      </section>`
    : ''

  const respostasCard = `<section class="card">
    <div class="card-head"><div>
      <h2>Respostas completas</h2>
      <div class="sub">${Object.keys(d.respostas).length} resposta(s) registrada(s) · questionário v${esc(a?.questionario_versao || 1)}</div>
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
          ? `<div class="divider"></div><h3 style="font-size:13px;margin-bottom:6px">Contexto declarado</h3><p class="small">${esc(txt)}</p>`
          : ''
      })
      .join('')}
  </section>`

  const metasCard = `<section class="card">
    <div class="card-head"><div><h2>Metas declaradas para 12 meses</h2><div class="sub">Base do comparativo atual × meta do radar</div></div></div>
    <div class="targets">${DIMENSIONS.map((dim) => {
      const m = Number(d.metas[dim.key] ?? 2)
      return `<div class="target-row"><div><span class="tname">${esc(dim.short)}</span>
        <span class="tnow">${LEVEL_LABELS[m] || ''}</span></div>${levelChip(m)}</div>`
    }).join('')}</div>
  </section>`

  return adminShell(
    {
      title: nome,
      subtitle: 'Cliente',
      active: '/clientes',
      admin,
      actions: `<a class="btn btn-ghost" href="/painel">Painel</a>`,
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
          var old = b.innerHTML; b.innerHTML = '<i class="fa-solid fa-check"></i> Copiado';
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
