import { DIMENSIONS, LEVEL_DESC, LEVEL_LABELS } from '../questions'
import { esc, formatIndex, fmtDate, estadoLabel, estadoTone, prioridadePt } from '../util'
import { adminShell, badge } from './layout'

export type DashRow = {
  client_id: number
  razao_social: string
  nome_fantasia: string | null
  cnpj: string | null
  vertical: string | null
  tamanho_faixa: string | null
  responsavel_nome: string
  responsavel_email: string
  cidade: string | null
  estado_uf: string | null
  criado_em: string
  ativo: number
  ass_id: number | null
  estado: string | null
  link_token: string | null
  expira_em: string | null
  submetido_em: string | null
  reaberto: number | null
  indice: number | null
  report_id: number | null
  report_versao: number | null
  conteudo: string | null
}

export type DashData = {
  totalClientes: number
  porEstado: Record<string, number>
  indiceMedio: number | null
  dimensoes: { key: string; short: string; nome: string; media: number; n: number }[]
  rows: DashRow[]
  totalGeral: number
  filtros: { q: string; estado: string; vertical: string }
  verticais: string[]
}

export function dashboardPage(data: DashData, admin: { nome: string; email: string }): string {
  const kpi = (label: string, value: string, meta: string, cls = '') =>
    `<div class="kpi ${cls}"><div class="label">${label}</div><div class="value">${value}</div><div class="meta">${meta}</div></div>`

  const estados = ['aguardando', 'em_preenchimento', 'submetido', 'gerado']
  const totalAssess = estados.reduce((a, e) => a + (data.porEstado[e] || 0), 0)

  const kpis = `<div class="kpis">
    ${kpi('Clientes ativos', String(data.totalClientes), `${totalAssess} assessment(s) no total`, 'primary')}
    ${kpi(
      'Índice médio',
      data.indiceMedio === null ? '—' : `${formatIndex(data.indiceMedio)}`,
      data.indiceMedio === null ? 'nenhum relatório gerado' : 'média dos relatórios mais recentes · de 5,0',
      'lime'
    )}
    ${kpi(
      'Relatórios gerados',
      String(data.porEstado.gerado || 0),
      `${data.porEstado.submetido || 0} submetido(s) aguardando relatório`
    )}
    ${kpi(
      'Aguardando preenchimento',
      String((data.porEstado.aguardando || 0) + (data.porEstado.em_preenchimento || 0)),
      `${data.porEstado.em_preenchimento || 0} em andamento`
    )}
  </div>`

  const maxDim = Math.max(0.5, ...data.dimensoes.map((d) => d.media))
  const dimBars = data.dimensoes
    .map(
      (d) => `<div class="dim-row">
      <span class="nm" title="${esc(d.nome)}">${esc(d.short)}</span>
      <div class="mini-bar" style="height:9px"><i style="width:${((d.media / 4) * 100).toFixed(1)}%;background:${dimColor(
        d.key
      )}"></i></div>
      <span class="vv">${d.n === 0 ? '—' : formatIndex(d.media)}</span>
    </div>`
    )
    .join('')

  const distribution = Object.entries({ Critical: 0, High: 0, Medium: 0, Low: 0 })
    .map(([p]) => p)
    .map(() => '')
    .join('')

  const clientesCard = `<section class="card" style="margin-bottom:18px">
    <div class="card-head"><div>
      <h2>Distribuição das 7 dimensões</h2>
      <div class="sub">Média do nível atual (L0–L4) entre os relatórios mais recentes</div>
    </div>
    <span class="badge muted">${data.dimensoes.reduce((a, d) => a + d.n, 0)} medições</span></div>
    <div class="dim-list">${dimBars}</div>
    <div class="divider"></div>
    <div class="small muted">Escala: ${LEVEL_LABELS.map((l) => esc(l)).join(' · ')}</div>
  </section>`

  const chips = estados
    .map(
      (e) => `<a class="badge ${data.filtros.estado === e ? 'ok' : 'muted'}" href="?${qs({
        ...data.filtros,
        estado: data.filtros.estado === e ? '' : e,
      })}">${esc(estadoLabel(e))} · ${data.porEstado[e] || 0}</a>`
    )
    .join(' ')

  const rows = data.rows
    .map((r) => {
      const nome = r.nome_fantasia || r.razao_social
      return `<tr>
      <td>
        <div class="client-name"><a href="/clientes/${r.client_id}">${esc(nome)}</a></div>
        <div class="client-sub">${esc(r.razao_social)}${r.vertical ? ` · ${esc(r.vertical)}` : ''}</div>
      </td>
      <td>
        <div>${esc(r.responsavel_nome)}</div>
        <div class="client-sub">${esc(r.responsavel_email)}</div>
      </td>
      <td class="num" style="white-space:nowrap">${esc(fmtDate(r.criado_em))}</td>
      <td>${badge(estadoLabel(r.estado || 'aguardando'), estadoTone(r.estado || 'aguardando'))}</td>
      <td class="num"><strong>${r.indice === null ? '—' : formatIndex(r.indice)}</strong></td>
      <td>
        <div class="row-actions">
          <a class="btn btn-sm btn-ghost" href="/clientes/${r.client_id}" title="Abrir ficha do cliente"><i class="fa-solid fa-folder-open" aria-hidden="true"></i></a>
          ${
            r.report_id
              ? `<a class="btn btn-sm btn-ghost" href="/clientes/${r.client_id}/relatorio" title="Ver relatório"><i class="fa-solid fa-chart-simple" aria-hidden="true"></i></a>`
              : ''
          }
          ${
            r.estado !== 'submetido' && r.estado !== 'gerado'
              ? `<a class="btn btn-sm btn-ghost" href="/a/${esc(r.link_token)}" target="_blank" rel="noopener" title="Abrir link do cliente"><i class="fa-solid fa-link" aria-hidden="true"></i></a>`
              : ''
          }
          <a class="btn btn-sm btn-ghost" href="/clientes/${r.client_id}/editar" title="Editar"><i class="fa-solid fa-pen" aria-hidden="true"></i></a>
        </div>
      </td>
    </tr>`
    })
    .join('')

  const table = `<section class="card" id="clientes" style="padding:0;overflow:hidden">
    <div style="padding:18px 20px 0">
      <div class="card-head"><div>
        <h2>Clientes</h2>
        <div class="sub">${data.rows.length} de ${data.totalGeral} registro(s)</div>
      </div>
      <a class="btn btn-sm" href="/painel/export.xlsx"><i class="fa-solid fa-file-excel" aria-hidden="true"></i> Exportar XLSX</a></div>
      <div class="toolbar">
        <form method="get" action="/painel" class="toolbar" style="flex:1;margin:0">
          <div class="search">
            <i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
            <input type="search" name="q" value="${esc(data.filtros.q)}" placeholder="Buscar por empresa, responsável, CNPJ…" aria-label="Buscar clientes">
          </div>
          <select name="estado" aria-label="Filtrar por estado">
            <option value="">Todos os estados</option>
            ${estados
              .map(
                (e) =>
                  `<option value="${e}" ${data.filtros.estado === e ? 'selected' : ''}>${esc(estadoLabel(e))}</option>`
              )
              .join('')}
          </select>
          <select name="vertical" aria-label="Filtrar por vertical">
            <option value="">Todas as verticais</option>
            ${data.verticais
              .map(
                (v) => `<option value="${esc(v)}" ${data.filtros.vertical === v ? 'selected' : ''}>${esc(v)}</option>`
              )
              .join('')}
          </select>
          <button class="btn btn-ghost btn-sm" type="submit">Filtrar</button>
          ${data.filtros.q || data.filtros.estado || data.filtros.vertical ? `<a class="btn btn-ghost btn-sm" href="/painel">Limpar</a>` : ''}
        </form>
      </div>
      <div style="margin-bottom:10px;display:flex;gap:6px;flex-wrap:wrap">${chips}</div>
    </div>
    ${
      data.rows.length
        ? `<div class="table-wrap" style="border:0;border-top:1px solid var(--line);border-radius:0">
      <table class="data">
        <thead><tr>
          <th>Cliente</th><th>Responsável</th><th class="num">Cadastro</th><th>Estado</th><th class="num">Índice</th><th class="num">Ações</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table></div>`
        : `<div class="empty"><i class="fa-regular fa-building" aria-hidden="true"></i>
        Nenhum cliente encontrado. <a href="/clientes/novo">Cadastrar o primeiro cliente</a>.</div>`
    }
  </section>`

  return adminShell(
    {
      title: 'Painel da prática',
      subtitle: 'Unified Technologies · Assessment de maturidade em IA',
      active: '/painel',
      admin,
      actions: `<a class="btn" href="/clientes/novo"><i class="fa-solid fa-plus" aria-hidden="true"></i> Novo cliente</a>`,
    },
    kpis,
    `<div class="stack" style="margin-bottom:18px">${clientesCard}</div>`,
    table
  )
}

function dimColor(key: string): string {
  return DIMENSIONS.find((d) => d.key === key)?.cor || '#4878b0'
}

function qs(obj: Record<string, string>): string {
  return Object.entries(obj)
    .filter(([, v]) => v)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&')
}
