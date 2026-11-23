import { DIMENSIONS, DIM_MAP, LEVEL_LABELS, LEVEL_DESC, suggestionsFor } from './questions'
import type { ScoreRow } from './scoring'
import { computeIndex, computeScorecard, prioritizeInitiatives, defaultNextStep, sortByPriority } from './scoring'
import type { QRow } from './scoring'
import { esc, formatIndex, prioridadePt, formatPct, fmtDate, fmtDateTime } from './util'

export type ReportInput = {
  client: {
    razao_social: string
    nome_fantasia: string | null
    cnpj: string | null
    vertical: string | null
    tamanho_faixa: string | null
    responsavel_nome: string
    responsavel_email: string
    cidade: string | null
    estado_uf: string | null
  }
  assessment: { id: number; versao: number; submetido_em: string | null; criado_em: string }
  questions: QRow[]
  respostas: Record<number, unknown>
  metas: Record<string, number>
  initiatives: {
    id: number
    nome: string
    problema: string | null
    beneficio: string | null
    urgencia: number
    dimensao: string | null
    proximo_passo?: string | null
  }[]
  generatedAt?: string
  reportVersion?: number
}

export type ReportData = {
  indice: { escala5: number; media4: number }
  scorecard: ScoreRow[]
  iniciativas: ReturnType<typeof prioritizeInitiatives>
  plano: { horizon: '1-30' | '31-60' | '61-90'; label: string; sub: string; itens: ReturnType<typeof prioritizeInitiatives> }[]
  destaques: { forcas: ScoreRow[]; gaps: ScoreRow[]; criticas: ScoreRow[] }
  confiancaReduzida: ScoreRow[]
  objetivo: string
  geradoEm: string
  tipoIniciativas: 'cliente' | 'metodo'
}

export function buildReportData(input: ReportInput): ReportData {
  const urgencias: Record<string, number> = {}
  for (const ini of input.initiatives) {
    if (ini.dimensao) urgencias[ini.dimensao] = Math.max(urgencias[ini.dimensao] || 0, ini.urgencia)
  }
  const scorecard = computeScorecard(input.questions, input.respostas, input.metas, urgencias)
  const indice = computeIndex(scorecard)

  const qObjetivo = input.questions.find((q) => q.slug === 'contexto-objetivo')
  const objetivoRaw = qObjetivo ? input.respostas[qObjetivo.id] : ''
  const objetivo = String(
    typeof objetivoRaw === 'object' && objetivoRaw !== null ? (objetivoRaw as any).t ?? '' : objetivoRaw ?? ''
  ).trim()

  let base = input.initiatives
    .filter((i) => i.nome && i.nome.trim())
    .map((i) => ({
      ...i,
      proximo_passo: i.proximo_passo || '',
      origem: 'cliente' as const,
    }))

  let tipo: 'cliente' | 'metodo' = 'cliente'
  if (base.length === 0) {
    tipo = 'metodo'
    const sugeridas = suggestionsFor(input.client.vertical)
    base = sugeridas.slice(0, 4).map((s, idx) => ({
      id: -(idx + 1),
      nome: s.nome,
      problema: s.problema,
      beneficio: s.beneficio,
      urgencia: s.urgencia,
      dimensao: s.dimensao as string,
      proximo_passo: '',
      origem: 'cliente' as const,
    }))
  }

  const withNext = base.map((i) => ({
    ...i,
    proximo_passo: i.proximo_passo || defaultNextStep(i.dimensao, i.urgencia >= 3 ? 'Critical' : 'High'),
  }))

  const iniciativas = prioritizeInitiatives(scorecard, withNext)

  const plano: ReportData['plano'] = [
    {
      horizon: '1-30',
      label: 'Primeiros 30 dias',
      sub: 'Fundação: resolver bloqueios e provar valor',
      itens: iniciativas.filter((i) => i.horizonte === '1-30'),
    },
    {
      horizon: '31-60',
      label: 'Dias 31 a 60',
      sub: 'Escala controlada e formalização',
      itens: iniciativas.filter((i) => i.horizonte === '31-60'),
    },
    {
      horizon: '61-90',
      label: 'Dias 61 a 90',
      sub: 'Consolidação e medição de valor',
      itens: iniciativas.filter((i) => i.horizonte === '61-90'),
    },
  ]

  const ordered = sortByPriority(scorecard)
  const criticas = scorecard.filter((r) => r.prioridade === 'Critical')

  return {
    indice,
    scorecard,
    iniciativas,
    plano,
    destaques: {
      forcas: [...scorecard].sort((a, b) => b.atual - a.atual).slice(0, 2),
      gaps: [...scorecard].sort((a, b) => b.gap - a.gap).slice(0, 3),
      criticas,
    },
    confiancaReduzida: scorecard.filter((r) => r.confianca === 'reduzida'),
    objetivo,
    geradoEm: input.generatedAt || new Date().toISOString(),
    tipoIniciativas: tipo,
  }
}

/* ── SVG: radar atual × meta ─────────────────────────────────────────────── */
export function radarSvg(rows: ScoreRow[], size = 420): string {
  const cx = size / 2
  const cy = size / 2
  const R = size * 0.34
  const n = rows.length
  const angle = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2
  const pt = (i: number, level: number) => {
    const r = (Math.max(0, Math.min(4, level)) / 4) * R
    return [cx + r * Math.cos(angle(i)), cy + r * Math.sin(angle(i))]
  }

  const rings = [1, 2, 3, 4]
    .map((lvl) => {
      const points = rows.map((_, i) => pt(i, lvl)).map((p) => p.join(',')).join(' ')
      return `<polygon points="${points}" fill="none" stroke="#dfe7f2" stroke-width="1"/>`
    })
    .join('')

  const axes = rows
    .map((_, i) => {
      const [x, y] = pt(i, 4)
      return `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="#e6ecf5" stroke-width="1"/>`
    })
    .join('')

  const targetPoly = rows.map((r, i) => pt(i, r.meta)).map((p) => p.join(',')).join(' ')
  const currentPoly = rows.map((r, i) => pt(i, r.atual)).map((p) => p.join(',')).join(' ')

  const dots = rows
    .map((r, i) => {
      const [x, y] = pt(i, r.atual)
      return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.6" fill="#080048" stroke="#fff" stroke-width="1.6"/>`
    })
    .join('')

  const labels = rows
    .map((r, i) => {
      const a = angle(i)
      const lx = cx + (R + 30) * Math.cos(a)
      const ly = cy + (R + 30) * Math.sin(a)
      const anchor = Math.abs(Math.cos(a)) < 0.25 ? 'middle' : Math.cos(a) > 0 ? 'start' : 'end'
      return `<text x="${lx.toFixed(1)}" y="${(ly + 3).toFixed(1)}" text-anchor="${anchor}" font-size="10.5" font-weight="700" fill="#33415c" font-family="Inter, sans-serif">${esc(
        r.short
      )}</text>
      <text x="${lx.toFixed(1)}" y="${(ly + 15).toFixed(1)}" text-anchor="${anchor}" font-size="9.5" fill="#64748b" font-family="Inter, sans-serif">L${r.atual} → L${r.meta}</text>`
    })
    .join('')

  const scaleLabels = [1, 2, 3, 4]
    .map((lvl) => {
      const y = cy - (lvl / 4) * R
      return `<text x="${cx + 3}" y="${y - 3}" font-size="8" fill="#94a3b8" font-family="Inter, sans-serif">L${lvl}</text>`
    })
    .join('')

  return `<svg viewBox="0 0 ${size} ${size}" width="100%" style="max-width:${size}px" role="img" aria-label="Radar de maturidade por dimensão, atual versus meta">
  ${rings}${axes}${scaleLabels}
  <polygon points="${targetPoly}" fill="rgba(168,212,50,0.16)" stroke="#8ab520" stroke-width="2" stroke-dasharray="6 4"/>
  <polygon points="${currentPoly}" fill="rgba(8,0,72,0.22)" stroke="#080048" stroke-width="2"/>
  ${dots}${labels}
</svg>`
}

export function gaugeSvg(escala5: number, size = 190): string {
  const stroke = 14
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const pct = Math.max(0, Math.min(1, escala5 / 5))
  const dash = c * pct
  return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img" aria-label="Índice geral ${formatIndex(escala5)} de 5">
  <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="#e8eef7" stroke-width="${stroke}"/>
  <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="#080048" stroke-width="${stroke}"
    stroke-linecap="round" stroke-dasharray="${dash.toFixed(1)} ${(c - dash).toFixed(1)}"
    transform="rotate(-90 ${size / 2} ${size / 2})"/>
  <circle cx="${size / 2}" cy="${size / 2}" r="${r - stroke / 2 - 8}" fill="none" stroke="#a8d432" stroke-width="2" opacity="0.55"/>
</svg>`
}

function bar(atual: number, meta: number): string {
  const w = (atual / 4) * 100
  const m = (meta / 4) * 100
  return `<div class="mini-bar" role="img" aria-label="Atual L${atual} de meta L${meta}">
    <i style="width:${w}%"></i><b style="left:${Math.min(99, m)}%"></b>
  </div>`
}

export function scorecardTable(rows: ScoreRow[], opts: { admin?: boolean } = {}): string {
  const body = rows
    .map(
      (r) => `<tr>
      <td>
        <div class="dim">${esc(r.nome)}</div>
        ${r.confianca === 'reduzida' ? `<span class="badge warn" style="margin-top:3px">Confiança reduzida · ${r.respondidas}/${r.total}</span>` : ''}
      </td>
      <td style="min-width:120px">${bar(r.atual, r.meta)}</td>
      <td class="num">${r.atual === 0 ? '<span class="lvl-chip l0">L0</span>' : `<span class="lvl-chip l${r.atual}">L${r.atual}</span>`}</td>
      <td class="num"><strong>L${r.meta}</strong></td>
      <td class="num">${r.gap > 0 ? `+${r.gap}` : '0'}</td>
      <td><span class="badge ${r.prioridade === 'Critical' ? 'critical' : r.prioridade === 'High' ? 'high' : r.prioridade === 'Medium' ? 'medium' : 'low'}">${prioridadePt(
        r.prioridade
      )}</span></td>
    </tr>`
    )
    .join('')

  return `<div class="table-wrap" style="border:0">
  <table class="scorecard">
    <thead><tr>
      <th>Dimensão</th><th>Progresso (atual × meta)</th>
      <th class="num">Atual</th><th class="num">Meta 12m</th><th class="num">Gap</th><th>Prioridade</th>
    </tr></thead>
    <tbody>${body}</tbody>
  </table>
</div>`
}

/* ── Relatório completo (HTML) ──────────────────────────────────────────── */
export type ReportRender = {
  input: ReportInput
  data: ReportData
  reportId: number
  versao: number
  mode: 'cliente' | 'admin' | 'print'
  versions?: { versao: number; gerado_em: string; id: number }[]
}

export function renderReport(r: ReportRender): string {
  const { input, data } = r
  const c = input.client
  const empresa = c.nome_fantasia || c.razao_social

  const capa = `<header class="rp-cover" id="capa">
    <img src="/static/logo.png" alt="Unified Technologies">
    <div class="eyebrow">Assessment de Maturidade em IA</div>
    <h1>Relatório de prontidão para inteligência artificial</h1>
    <div class="who">${esc(empresa)} · ${esc(c.razao_social)}</div>
    <div class="cover-meta">
      <div><strong>${esc(formatIndex(data.indice.escala5))}/5</strong>Índice de maturidade</div>
      <div><strong>${esc(c.vertical || 'Não informado')}</strong>Vertical</div>
      <div><strong>${esc(c.tamanho_faixa || 'Não informado')}</strong>Porte</div>
      <div><strong>${esc(c.responsavel_nome)}</strong>Responsável</div>
      <div><strong>v${r.versao}</strong>Versão do relatório</div>
      <div><strong>${esc(fmtDate(data.geradoEm))}</strong>Emissão</div>
    </div>
  </header>`

  const resumo = `<section class="card" id="resumo" style="margin-bottom:18px">
    <div class="card-head"><div>
      <h2>Resumo executivo</h2>
      <div class="sub">Índice geral e leitura do estágio atual da organização</div>
    </div>
    <span class="badge lime">${data.indice.escala5 >= 3 ? 'Avançado' : data.indice.escala5 >= 2 ? 'Em consolidação' : 'Fase inicial'}</span></div>
    <div class="rp-index">
      <div class="gauge">
        ${gaugeSvg(data.indice.escala5)}
        <div class="center"><div class="v">${formatIndex(data.indice.escala5)}</div><div class="u">de 5,0</div></div>
      </div>
      <div>
        <p><strong>${esc(empresa)}</strong> apresenta índice de maturidade em IA de <strong>${formatIndex(
          data.indice.escala5
        )}/5</strong>, correspondente a um nível médio <strong>L${formatIndex(
          data.indice.media4
        )}</strong> na escala L0–L4 do método (média simples das sete dimensões).</p>
        ${
          data.objetivo
            ? `<p class="small muted" style="margin-top:-4px">Objetivo declarado para 12 meses: <em>“${esc(data.objetivo)}”</em></p>`
            : ''
        }
        <p class="small">
          ${
            data.destaques.criticas.length
              ? `<strong>${data.destaques.criticas.length}</strong> dimensão(ões) em prioridade crítica: ${data.destaques.criticas
                  .map((d) => esc(d.short))
                  .join(', ')}. Essas frentes condicionam as demais iniciativas do plano.`
              : 'Nenhuma dimensão em prioridade crítica — o foco deve ser fechar os gaps de maior amplitude.'
          }
          ${data.confiancaReduzida.length ? ` ${data.confiancaReduzida.length} dimensão(ões) com evidência parcial (selo de confiança reduzida).` : ''}
        </p>
        <div style="display:flex;gap:22px;flex-wrap:wrap;margin-top:12px">
          <div><div class="rp-score-head">Forças</div><div class="small">${data.destaques.forcas
            .map((d) => `${esc(d.short)} (L${d.atual})`)
            .join(' · ')}</div></div>
          <div><div class="rp-score-head">Maiores gaps</div><div class="small">${data.destaques.gaps
            .map((d) => `${esc(d.short)} (+${d.gap})`)
            .join(' · ')}</div></div>
        </div>
      </div>
    </div>
  </section>`

  const scorecard = `<section class="card" id="scorecard" style="margin-bottom:18px">
    <div class="card-head"><div>
      <h2>Scorecard das 7 dimensões</h2>
      <div class="sub">Nível atual, meta declarada para 12 meses, gap e prioridade</div>
    </div></div>
    ${scorecardTable(data.scorecard)}
    <div class="divider"></div>
    <div class="small muted">
      Escala L0–L4: ${LEVEL_LABELS.map((l, i) => `<strong>${esc(l)}</strong> — ${esc(LEVEL_DESC[i])}`).join(' · ')}
    </div>
    <div class="small muted" style="margin-top:8px">
      O nível da dimensão é o <strong>piso da média</strong> das perguntas (sem arredondar para cima), seguindo a evidência mais forte declarada.
    </div>
  </section>`

  const radar = `<section class="card" id="radar" style="margin-bottom:18px">
    <div class="card-head"><div>
      <h2>Radar atual × meta</h2>
      <div class="sub">Comparativo entre o nível atual e a meta declarada por dimensão</div>
    </div></div>
    <div class="radar-wrap">${radarSvg(data.scorecard)}</div>
    <div class="legend">
      <span class="k"><i style="background:#080048"></i> Nível atual</span>
      <span class="k"><i style="background:#8ab520;height:0;border-top:2px dashed #8ab520"></i> Meta 12 meses</span>
    </div>
  </section>`

  const iniCards = data.iniciativas
    .map(
      (i) => `<article class="ini-report ${i.prioridade_calculada.toLowerCase()}">
      <div class="ih">
        <strong>${esc(i.nome)}</strong>
        <span>
          <span class="badge ${i.prioridade_calculada === 'Critical' ? 'critical' : i.prioridade_calculada === 'High' ? 'high' : i.prioridade_calculada === 'Medium' ? 'medium' : 'low'}">${prioridadePt(
            i.prioridade_calculada
          )}</span>
          <span class="badge ${i.urgencia === 3 ? 'critical' : i.urgencia === 2 ? 'medium' : 'low'}">Urgência ${i.urgencia}/3</span>
          ${i.dimensao ? `<span class="badge accent">${esc(DIM_MAP[i.dimensao]?.short || i.dimensao)}</span>` : ''}
        </span>
      </div>
      <dl class="meta-grid">
        <div><dt>Problema que resolve</dt><dd>${esc(i.problema || '—')}</dd></div>
        <div><dt>Benefício esperado</dt><dd>${esc(i.beneficio || '—')}</dd></div>
        <div style="grid-column:1/-1"><dt>Próximo passo sugerido</dt><dd>${esc(i.proximo_passo)}</dd></div>
      </dl>
      ${i.bloqueio ? `<div class="blocked-note"><i class="fa-solid fa-lock" aria-hidden="true"></i> Executar após resolver ${esc(i.bloqueio)}</div>` : ''}
    </article>`
    )
    .join('')

  const iniciativas = `<section class="card" id="iniciativas" style="margin-bottom:18px">
    <div class="card-head"><div>
      <h2>Iniciativas recomendadas</h2>
      <div class="sub">${
        data.tipoIniciativas === 'metodo'
          ? `Cliente não declarou iniciativas — sugestões do método para o vertical ${esc(c.vertical || 'serviços')}`
          : `${data.iniciativas.length} iniciativa(s) declarada(s) pelo cliente, priorizada(s) por urgência × dimensões de suporte`
      }</div>
    </div></div>
    ${iniCards || '<p class="muted small">Sem iniciativas para exibir.</p>'}
  </section>`

  const horizontes = data.plano
    .map(
      (h) => `<div class="horizon">
      <header><span>${esc(h.label)}</span>${h.itens.length} iniciativa(s)</header>
      <div class="h-body">
        <p class="small muted" style="margin-bottom:8px">${esc(h.sub)}</p>
        ${
          h.itens.length
            ? h.itens
                .map(
                  (i) =>
                    `<div class="h-item"><i class="fa-solid fa-arrow-right" aria-hidden="true"></i><div><strong>${esc(
                      i.nome
                    )}</strong><em>${esc(i.proximo_passo)}</em></div></div>`
                )
                .join('')
            : '<div class="small muted">Seminiciativas alocadas — antecipar itens dos próximos horizontes.</div>'
        }
      </div>
    </div>`
    )
    .join('')

  const plano = `<section class="card page-break" id="plano" style="margin-bottom:18px">
    <div class="card-head"><div>
      <h2>Plano de 90 dias</h2>
      <div class="sub">Três horizontes com as iniciativas alocadas por prioridade</div>
    </div></div>
    <div class="horizons">${horizontes}</div>
  </section>`

  const aviso = `<div class="disclaimer">
    <i class="fa-solid fa-circle-info" aria-hidden="true"></i>
    <div><strong>Aviso metodológico.</strong> Este resultado é baseado em autoavaliação declarada pelo responsável da empresa, sem auditoria de evidências.
    O índice e as prioridades devem ser lidos como retrato do estágio percebido e ponto de partida para validação em campo.
    ${
      data.confiancaReduzida.length
        ? `Dimensões com preenchimento parcial (${data.confiancaReduzida
            .map((d) => esc(d.nome))
            .join(', ')}) recebem selo de confiança reduzida e merecem confirmação em entrevista.`
        : ''
    }
    Versão v${r.versao} gerada em ${esc(fmtDateTime(data.geradoEm))}.</div>
  </div>`

  const historico =
    r.mode !== 'print' && r.versions && r.versions.length > 1
      ? `<div class="card" style="margin-bottom:18px" id="historico">
        <div class="card-head"><h3>Histórico de versões</h3></div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          ${r.versions
            .map(
              (v) =>
                `<a class="btn btn-sm ${v.versao === r.versao ? '' : 'btn-ghost'}" href="?v=${v.versao}">v${v.versao} · ${esc(
                  fmtDate(v.gerado_em)
                )}</a>`
            )
            .join('')}
        </div>
      </div>`
      : ''

  return `<article class="report" id="relatorio">
    ${capa}
    ${resumo}
    ${scorecard}
    ${radar}
    ${iniciativas}
    ${plano}
    <div class="card" style="border:0;background:transparent;padding:0">${aviso}</div>
    ${historico}
  </article>`
}
