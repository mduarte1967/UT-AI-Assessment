import { DIMENSIONS, DIM_MAP, DIM_WEIGHTS, MATURITY_LABELS, MATURITY_DESC, MATURITY_MATRIX, MATURITY_TO_INITIATIVE } from './questions'
import type { QRow, ScoreRow, IndexResult, Priority, PriorityFactors, Wave } from './scoring'
import { computeIndex, computeScorecard, classifyPriority, priorityScore, WAVE_META, PRIORITY_LABEL, PRIORITY_ACTION, CRITERIA_LABEL, gapScore, optionLabels } from './scoring'
import type { Category, RecommendedInitiative } from './initiatives'
import { selectInitiatives, splitByCategory, selectionNote, CATEGORY_META } from './initiatives'
import { esc, formatIndex, fmtDate, fmtDateTime } from './util'

/* ── Input / output shapes ──────────────────────────────────────────────── */

export type ReportInput = {
  client: {
    razao_social: string
    nome_fantasia: string | null
    tax_id: string | null
    vertical: string | null
    tamanho_faixa: string | null
    responsavel_nome: string
    responsavel_email: string
    cidade: string | null
    estado_uf: string | null
    country?: string | null
  }
  assessment: { id: number; versao: number; submetido_em: string | null; criado_em: string }
  questions: QRow[]
  respostas: Record<number, unknown>
  metas: Record<string, number>
  generatedAt?: string
}

export type OutcomeEntry = {
  ref: string
  dimensao: string
  dimLabel: string
  question: string
  /** Selected closed options. */
  items: string[]
  /** Free-text answer of a legacy bank, when present. */
  answer: string
}

export type EvidenceEntry = {
  ref: string
  dimLabel: string
  level: number
  /** Labels of the closed evidence options selected. */
  items: string[]
}

export type ReportData = {
  /** Marker so legacy stored versions can be detected. */
  method: 'v2-outcome-driven'
  indice: IndexResult
  scorecard: ScoreRow[]
  outcomes: OutcomeEntry[]
  evidencia: EvidenceEntry[]
  iniciativas: RecommendedInitiative[]
  grupos: { transformation: RecommendedInitiative[]; enabling: RecommendedInitiative[] }
  plano: { wave: Wave; meta: { label: string; sub: string; window: string }; itens: RecommendedInitiative[] }[]
  destaques: { forcas: ScoreRow[]; gaps: ScoreRow[]; criticas: ScoreRow[] }
  confiancaReduzida: ScoreRow[]
  objetivo: string
  geradoEm: string
  bankVersion: number
}

/* ── Build ──────────────────────────────────────────────────────────────── */

function textOf(v: unknown): string {
  if (v === null || v === undefined) return ''
  if (typeof v === 'object' && v !== null && 't' in (v as any)) return String((v as any).t ?? '').trim()
  if (typeof v === 'object') return ''
  return String(v).trim()
}

export function buildReportData(input: ReportInput): ReportData {
  const scorecard = computeScorecard(input.questions, input.respostas, input.metas)
  const indice = computeIndex(scorecard)

  // Maturity level per question ref — the evidence map used by the selector.
  const levelsByRef: Record<string, number | null> = {}
  const outcomes: OutcomeEntry[] = []
  const evidencia: EvidenceEntry[] = []

  for (const q of input.questions) {
    const valor = input.respostas[q.id]
    const dimLabel = DIM_MAP[q.dimensao]?.short || q.dimensao

    if (q.persona === 'O') {
      const items = optionLabels(q, valor)
      const answer = textOf(valor)
      if (items.length || answer) {
        outcomes.push({ ref: q.ref, dimensao: q.dimensao, dimLabel, question: q.texto, items, answer })
      }
      levelsByRef[q.ref] = null
      continue
    }

    const level = levelValue(q, valor)
    levelsByRef[q.ref] = level

    if (q.persona === 'H' && level !== null) {
      const items = optionLabels(q, valor)
      const answer = textOf(valor)
      if (items.length || answer) evidencia.push({ ref: q.ref, dimLabel, level, items, answer } as any)
    }
  }

  // Strategy objectives are captured by STR01 — used in the executive summary.
  const str01 = input.questions.find((q) => q.ref === 'STR01')
  const objetivo = str01
    ? optionLabels(str01, input.respostas[str01.id]).join(' · ') || textOf(input.respostas[str01.id])
    : ''

  const iniciativas = selectInitiatives({ scorecard, levelsByRef })
  const grupos = splitByCategory(iniciativas)

  // Three-wave roadmap: foundations first, then quick wins, then strategic.
  const waveOf = (i: RecommendedInitiative): Wave => {
    if (i.prioridade === 'P0') return 'foundations'
    if (i.prioridade === 'P1') return 'quickwins'
    if (i.prioridade === 'P2') return 'strategic'
    return 'later'
  }

  const plano = (['foundations', 'quickwins', 'strategic', 'later'] as Wave[]).map((wave) => ({
    wave,
    meta: WAVE_META[wave],
    itens: iniciativas.filter((i) => waveOf(i) === wave),
  }))

  // The scorecard priority follows the best-ranked initiative of its dimension.
  for (const row of scorecard) {
    const own = iniciativas.filter((i) => i.dimensao === row.dimensao)
    if (own.length) row.prioridade = own[0].prioridade
    row.bloqueada = row.prioridade === 'P0'
  }

  return {
    method: 'v2-outcome-driven',
    indice,
    scorecard,
    outcomes,
    evidencia,
    iniciativas,
    grupos,
    plano,
    destaques: {
      forcas: [...scorecard].sort((a, b) => b.atual - a.atual).slice(0, 2),
      gaps: [...scorecard].sort((a, b) => b.gap - a.gap).slice(0, 3),
      criticas: scorecard.filter((r) => r.prioridade === 'P0'),
    },
    confiancaReduzida: scorecard.filter((r) => r.confianca === 'reduzida'),
    objetivo,
    geradoEm: input.generatedAt || new Date().toISOString(),
    bankVersion: 2,
  }
}

/** Local level helper mirroring scoring.levelOf without importing internals. */
function levelValue(q: QRow, valor: unknown): number | null {
  if (valor === null || valor === undefined || valor === '') return null
  if (q.tipo === 'texto') return null
  const raw =
    typeof valor === 'object' && valor !== null
      ? Number((valor as any).v ?? (valor as any).i)
      : Number(valor)
  if (!Number.isFinite(raw) || raw < 1) return null
  return Math.max(1, Math.min(5, Math.round(raw)))
}

/* ── Legacy compatibility ────────────────────────────────────────────────── */

/**
 * Reports are stored as an immutable JSON snapshot at the moment of submission.
 * Snapshots written before the outcome-driven framework (v1) have a different
 * shape: initiatives carry no `factors`, the roadmap uses `label/sub/horizon`
 * instead of `meta`, priorities are worded Critical/High/Medium/Low and the
 * scorecard has no `peso`. Rendering those snapshots directly crashes, so every
 * read goes through this adapter, which only fills structural gaps and never
 * recomputes a historical score.
 */

const LEGACY_PRIORITY: Record<string, Priority> = {
  P0: 'P0', P1: 'P1', P2: 'P2', P3: 'P3', P4: 'P4',
  Critical: 'P0', High: 'P1', Medium: 'P2', Low: 'P3',
}

const ENABLING_DIMS = new Set<string>(['data', 'tech', 'security', 'people'])

const clamp15 = (n: unknown): number => {
  const v = Number(n)
  return Number.isFinite(v) ? Math.max(1, Math.min(5, v)) : 3
}

function normPriority(value: unknown): Priority {
  return LEGACY_PRIORITY[String(value ?? '').trim()] ?? 'P3'
}

const WAVE_FROM_HORIZON: Record<string, Wave> = {
  '1-30': 'foundations',
  '31-60': 'quickwins',
  '61-90': 'strategic',
}

function normalizeScoreRows(raw: any): ScoreRow[] {
  const rows: any[] = Array.isArray(raw?.scorecard) ? raw.scorecard : []
  if (!rows.length) return []
  return rows.map((r) => {
    const key = (r?.dimensao ?? 'strategy') as ScoreRow['dimensao']
    const dim = DIM_MAP[key]
    const atual = Number(r?.atual ?? 0)
    const meta = Number(r?.meta ?? 0)
    return {
      dimensao: key,
      nome: String(r?.nome ?? dim?.nome ?? key),
      short: String(r?.short ?? dim?.short ?? key),
      atual: Number.isFinite(atual) ? atual : 0,
      meta: Number.isFinite(meta) ? meta : 0,
      gap: Number(r?.gap ?? 0) || 0,
      peso: Number.isFinite(Number(r?.peso)) ? Number(r.peso) : (DIM_WEIGHTS[key] ?? 0),
      prioridade: normPriority(r?.prioridade),
      confianca: r?.confianca === 'reduzida' ? 'reduzida' : 'alta',
      respondidas: Number(r?.respondidas ?? 0) || 0,
      total: Number(r?.total ?? 0) || 0,
      descobertas: Number(r?.descobertas ?? 0) || 0,
      bloqueada: !!r?.bloqueada,
    } as ScoreRow
  })
}

/** A catalog code (IN01…) or a positive database id is displayable as-is. */
const isDisplayableCode = (value: unknown): boolean =>
  typeof value === 'string' && /^(IN\d{2,3}|\d+)$/.test(value.trim())

function normalizeInitiative(raw: any, rows: ScoreRow[], fallbackCode?: string): RecommendedInitiative {
  const dimensao = (raw?.dimensao ?? 'strategy') as RecommendedInitiative['dimensao']
  const dim = DIM_MAP[dimensao] ?? DIMENSIONS[0]
  const row = rows.find((r) => r.dimensao === dimensao)
  const urgencia = clamp15(raw?.urgencia)

  // Snapshots from the previous method carried a single urgency score instead of
  // the seven criteria. Rebuilding the factors from it keeps the table internally
  // consistent without inventing criteria that were never recorded.
  const factors: PriorityFactors & { gap: number } = raw?.factors
    ? { ...raw.factors, gap: Number(raw.factors.gap ?? row?.gap ?? 0) }
    : {
        impacto: urgencia,
        alinhamento: urgencia,
        valor: urgencia,
        viabilidade: urgencia,
        tempo: urgencia,
        criticidade: urgencia,
        gap: row?.gap ?? 0,
      }

  const recordedScore = Number(raw?.score)
  const score = Number.isFinite(recordedScore) && recordedScore > 0
    ? recordedScore
    : priorityScore(factors, factors.gap)

  const categoria: Category =
    raw?.categoria === 'transformation' || raw?.categoria === 'enabling'
      ? raw.categoria
      : ENABLING_DIMS.has(dimensao)
        ? 'enabling'
        : 'transformation'

  const rawCode = raw?.codigo ?? (isDisplayableCode(raw?.id) ? raw.id : undefined)

  return {
    id: String(rawCode ?? fallbackCode ?? '—'),
    nome: String(raw?.nome ?? ''),
    categoria,
    dimensao,
    dimensaoLabel: String(raw?.dimensaoLabel ?? dim.short),
    refs: Array.isArray(raw?.refs) ? raw.refs.map(String) : [],
    trigger: String(raw?.trigger ?? raw?.motivo ?? ''),
    problema: String(raw?.problema ?? ''),
    beneficio: String(raw?.beneficio ?? ''),
    outcome: String(raw?.outcome ?? ''),
    kpi: String(raw?.kpi ?? ''),
    proximo_passo: String(raw?.proximo_passo ?? ''),
    score,
    prioridade: normPriority(raw?.prioridade ?? raw?.prioridade_calculada),
    motivo: String(raw?.motivo ?? raw?.problema ?? ''),
    factors,
    bloqueio: raw?.bloqueio ? String(raw.bloqueio) : null,
  }
}

/**
 * Coerces any stored snapshot — current or legacy — into the shape the
 * renderer expects. Idempotent for current snapshots.
 */
export function normalizeReportData(raw: any): ReportData {
  const scorecard = normalizeScoreRows(raw)
  const iniciativas = (Array.isArray(raw?.iniciativas) ? raw.iniciativas : []).map((i: any, n: number) =>
    normalizeInitiative(i, scorecard, `IN${String(n + 1).padStart(2, '0')}`)
  )

  const indice: IndexResult =
    raw?.indice && Number.isFinite(Number(raw.indice.target))
      ? { ...computeIndex(scorecard), ...raw.indice }
      : computeIndex(scorecard)

  const planoRaw: any[] = Array.isArray(raw?.plano) ? raw.plano : []
  const plano = planoRaw.map((h, n) => {
    const horizon = String(h?.horizon ?? '')
    const wave = (h?.wave ?? WAVE_FROM_HORIZON[horizon] ?? 'foundations') as Wave
    // Legacy waves were labelled in Portuguese with a bare horizon window; the
    // current copy uses the wave metadata, which is also in English.
    const meta = h?.meta ?? {
      label: WAVE_META[wave].label,
      sub: String(h?.sub ?? WAVE_META[wave].sub),
      window: WAVE_META[wave].window,
    }
    return {
      wave,
      meta,
      itens: (Array.isArray(h?.itens) ? h.itens : []).map((i: any, k: number) =>
        normalizeInitiative(i, scorecard, `IN${String(n * 10 + k + 1).padStart(2, '0')}`)
      ),
    }
  })

  const grupos =
    raw?.grupos?.transformation || raw?.grupos?.enabling
      ? {
          transformation: (raw.grupos.transformation || []).map((i: any, n: number) =>
            normalizeInitiative(i, scorecard, `IN${String(n + 1).padStart(2, '0')}`)
          ),
          enabling: (raw.grupos.enabling || []).map((i: any, n: number) =>
            normalizeInitiative(i, scorecard, `IN${String(n + 1).padStart(2, '0')}`)
          ),
        }
      : splitByCategory(iniciativas)

  return {
    ...raw,
    // Kept only to flag the snapshot as historical; the renderer shows the
    // "previous scoring method" notice when this is not 'v2-outcome-driven'.
    method: raw?.method === 'v2-outcome-driven' ? 'v2-outcome-driven' : 'legacy',
    indice,
    scorecard,
    outcomes: Array.isArray(raw?.outcomes) ? raw.outcomes : [],
    evidencia: Array.isArray(raw?.evidencia) ? raw.evidencia : [],
    iniciativas,
    grupos,
    plano,
    destaques: {
      forcas: [...scorecard].sort((a, b) => b.atual - a.atual).slice(0, 2),
      gaps: [...scorecard].sort((a, b) => b.gap - a.gap).slice(0, 3),
      criticas: scorecard.filter((r) => r.prioridade === 'P0'),
    },
    confiancaReduzida: scorecard.filter((r) => r.confianca === 'reduzida'),
    objetivo: String(raw?.objetivo ?? ''),
    geradoEm: String(raw?.geradoEm ?? new Date().toISOString()),
    bankVersion: Number(raw?.bankVersion ?? 1) || 1,
  } as ReportData
}

/* ── SVG ────────────────────────────────────────────────────────────────── */

/** Current × target radar on the 1–5 maturity scale. */
export function radarSvg(rows: ScoreRow[], size = 420): string {
  const cx = size / 2
  const cy = size / 2
  const R = size * 0.33
  const n = rows.length
  const angle = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2
  const pt = (i: number, level: number) => {
    const r = (Math.max(0, Math.min(5, level)) / 5) * R
    return [cx + r * Math.cos(angle(i)), cy + r * Math.sin(angle(i))]
  }

  const rings = [1, 2, 3, 4, 5]
    .map((lvl) => {
      const points = rows.map((_, i) => pt(i, lvl)).map((p) => p.join(',')).join(' ')
      return `<polygon points="${points}" fill="none" stroke="#dfe7f2" stroke-width="${lvl === 5 ? 1.4 : 1}"/>`
    })
    .join('')

  const axes = rows
    .map((_, i) => {
      const [x, y] = pt(i, 5)
      return `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="#e6ecf5" stroke-width="1"/>`
    })
    .join('')

  const targetPoly = rows.map((r, i) => pt(i, r.meta)).map((p) => p.join(',')).join(' ')
  const currentPoly = rows.map((r, i) => pt(i, r.atual)).map((p) => p.join(',')).join(' ')

  const dots = rows
    .map((r, i) => {
      const [x, y] = pt(i, r.atual)
      return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.6" fill="#0B2545" stroke="#fff" stroke-width="1.6"/>`
    })
    .join('')

  const labels = rows
    .map((r, i) => {
      const a = angle(i)
      const lx = cx + (R + 32) * Math.cos(a)
      const ly = cy + (R + 32) * Math.sin(a)
      const anchor = Math.abs(Math.cos(a)) < 0.25 ? 'middle' : Math.cos(a) > 0 ? 'start' : 'end'
      return `<text x="${lx.toFixed(1)}" y="${(ly + 3).toFixed(1)}" text-anchor="${anchor}" font-size="10.5" font-weight="700" fill="#33415c" font-family="Roboto, sans-serif">${esc(
        r.short
      )}</text>
      <text x="${lx.toFixed(1)}" y="${(ly + 15).toFixed(1)}" text-anchor="${anchor}" font-size="9.5" fill="#5B6B80" font-family="Roboto, sans-serif">${r.atual.toFixed(
        1
      )} → ${r.meta.toFixed(1)}</text>`
    })
    .join('')

  const scaleLabels = [1, 2, 3, 4, 5]
    .map((lvl) => {
      const y = cy - (lvl / 5) * R
      return `<text x="${cx + 3}" y="${y - 3}" font-size="8" fill="#94a3b8" font-family="Roboto, sans-serif">${lvl}</text>`
    })
    .join('')

  return `<svg viewBox="0 0 ${size} ${size}" width="100%" style="max-width:${size}px" role="img" aria-label="Maturity radar by dimension, current versus target on a 1 to 5 scale">
  ${rings}${axes}${scaleLabels}
  <polygon points="${targetPoly}" fill="rgba(200,230,58,0.18)" stroke="#8FAE00" stroke-width="2" stroke-dasharray="6 4"/>
  <polygon points="${currentPoly}" fill="rgba(11,37,69,0.20)" stroke="#0B2545" stroke-width="2"/>
  ${dots}${labels}
</svg>`
}

/** Weighted index gauge on the 1–5 scale. */
export function gaugeSvg(value: number, size = 190): string {
  const stroke = 14
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const pct = Math.max(0, Math.min(1, value / 5))
  const dash = c * pct
  return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img" aria-label="Weighted maturity index ${formatIndex(
    value
  )} out of 5">
  <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="#e8eef7" stroke-width="${stroke}"/>
  <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="#0B2545" stroke-width="${stroke}"
    stroke-linecap="round" stroke-dasharray="${dash.toFixed(1)} ${(c - dash).toFixed(1)}"
    transform="rotate(-90 ${size / 2} ${size / 2})"/>
  <circle cx="${size / 2}" cy="${size / 2}" r="${r - stroke / 2 - 8}" fill="none" stroke="#B0D000" stroke-width="2" opacity="0.55"/>
</svg>`
}

function bar(atual: number, meta: number): string {
  const w = (atual / 5) * 100
  const m = (meta / 5) * 100
  return `<div class="mini-bar" role="img" aria-label="Current ${atual.toFixed(1)} against target ${meta.toFixed(1)}">
    <i style="width:${w}%"></i><b style="left:${Math.min(99, m)}%"></b>
  </div>`
}

const PRIORITY_TONE: Record<Priority, string> = {
  P0: 'critical',
  P1: 'high',
  P2: 'medium',
  P3: 'low',
  P4: 'muted',
}

export function priorityBadge(p: Priority): string {
  return `<span class="badge ${PRIORITY_TONE[p]}" title="${esc(PRIORITY_ACTION[p])}">${esc(PRIORITY_LABEL[p])}</span>`
}

/* ── Scorecard table (shared with the admin client page) ────────────────── */

export function scorecardTable(rows: ScoreRow[]): string {
  const body = rows
    .map(
      (r) => `<tr>
      <td>
        <div class="dim">${esc(r.nome)}</div>
        <div class="small muted">${Math.round(r.peso * 100)}% weight${
          r.confianca === 'reduzida' ? ` · reduced confidence ${r.respondidas}/${r.total}` : ''
        }</div>
      </td>
      <td style="min-width:120px">${bar(r.atual, r.meta)}</td>
      <td class="num"><strong>${r.atual.toFixed(1)}</strong></td>
      <td class="num">${r.meta.toFixed(1)}</td>
      <td class="num">${r.gap > 0 ? `+${r.gap.toFixed(1)}` : '0.0'}</td>
      <td class="num">${(r.gap * r.peso).toFixed(2)}</td>
      <td>${priorityBadge(r.prioridade)}</td>
    </tr>`
    )
    .join('')

  return `<div class="table-wrap" style="border:0">
  <table class="scorecard">
    <thead><tr>
      <th>Dimension</th><th>Progress (current × target)</th>
      <th class="num">Current</th><th class="num">Target</th><th class="num">Gap</th>
      <th class="num">Weighted gap</th><th>Priority</th>
    </tr></thead>
    <tbody>${body}</tbody>
  </table>
</div>`
}

/* ── Initiative card ────────────────────────────────────────────────────── */

function initiativeCard(i: RecommendedInitiative): string {
  return `<article class="ini-report ${PRIORITY_TONE[i.prioridade]}" id="ini-${esc(i.id)}">
    <div class="ih">
      <strong><span class="ini-code">${esc(i.id)}</span> ${esc(i.nome)}</strong>
      <span>
        ${priorityBadge(i.prioridade)}
        <span class="badge accent">${esc(i.dimensaoLabel)}</span>
        <span class="badge muted">${i.categoria === 'transformation' ? 'Transformation' : 'Enabling'}</span>
      </span>
    </div>
    <p class="ini-why"><i class="fa-solid fa-crosshairs" aria-hidden="true"></i> ${esc(i.motivo)}</p>
    <dl class="meta-grid">
      <div><dt>Business outcome</dt><dd>${esc(i.outcome)}</dd></div>
      <div><dt>Success measure</dt><dd>${esc(i.kpi)}</dd></div>
      <div><dt>Problem it solves</dt><dd>${esc(i.problema)}</dd></div>
      <div><dt>Expected benefit</dt><dd>${esc(i.beneficio)}</dd></div>
      <div style="grid-column:1/-1"><dt>Next step</dt><dd>${esc(i.proximo_passo)}</dd></div>
      <div style="grid-column:1/-1"><dt>Traceability</dt><dd class="small muted">${esc(
        i.refs.join(', ')
      )} · priority score ${i.score}/100</dd></div>
    </dl>
    ${i.bloqueio ? `<div class="blocked-note"><i class="fa-solid fa-lock" aria-hidden="true"></i> Execute after resolving ${esc(i.bloqueio)}</div>` : ''}
  </article>`
}

/* ── Full report ────────────────────────────────────────────────────────── */

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
  const legacy = (data as any).method !== 'v2-outcome-driven'

  const capa = `<header class="rp-cover" id="capa">
    <img src="/static/logo.png" alt="Unified Technologies">
    <div class="eyebrow">AI Maturity Assessment</div>
    <h1>AI readiness &amp; transformation report</h1>
    <div class="who">${esc(empresa)} · ${esc(c.razao_social)}</div>
    <div class="cover-meta">
      <div><strong>${formatIndex(data.indice?.escala5)}/5</strong>Current maturity</div>
      <div><strong>${formatIndex(data.indice?.target)}/5</strong>Benchmark target</div>
      <div><strong>${(data.indice?.weightedGap ?? 0).toFixed(2)}</strong>Weighted gap</div>
      <div><strong>${esc(c.vertical || 'Not provided')}</strong>Industry</div>
      <div><strong>${esc(c.tamanho_faixa || 'Not provided')}</strong>Company size</div>
      <div><strong>${esc([c.cidade, c.estado_uf, c.country].filter(Boolean).join(', ') || 'Not provided')}</strong>Location</div>
      <div><strong>${esc(c.responsavel_nome)}</strong>Contact</div>
      <div><strong>v${r.versao}</strong>Report version</div>
      <div><strong>${esc(fmtDate(data.geradoEm))}</strong>Issued</div>
    </div>
  </header>`

  const band =
    (data.indice?.escala5 ?? 0) >= 4
      ? 'Managed'
      : (data.indice?.escala5 ?? 0) >= 3
        ? 'Defined'
        : (data.indice?.escala5 ?? 0) >= 2
          ? 'Emerging'
          : 'Initial'

  const resumo = `<section class="card" id="resumo" style="margin-bottom:18px">
    <div class="card-head"><div>
      <h2>Executive summary</h2>
      <div class="sub">Weighted AI Maturity Index, target and the fronts that gate the plan</div>
    </div>
    <span class="badge lime">${band}</span></div>
    <div class="rp-index">
      <div class="gauge">
        ${gaugeSvg(data.indice?.escala5 ?? 0)}
        <div class="center"><div class="v">${formatIndex(data.indice?.escala5)}</div><div class="u">out of 5.0</div></div>
      </div>
      <div>
        <p><strong>${esc(empresa)}</strong> has a weighted AI maturity index of <strong>${formatIndex(
          data.indice?.escala5
        )}/5</strong> against the framework benchmark of <strong>${formatIndex(
          data.indice?.target
        )}/5</strong> — a weighted gap of <strong>${(data.indice?.weightedGap ?? 0).toFixed(
          2
        )}</strong>. Use Cases carries the largest weight (20%), because the assessment is oriented to identifying and realising business value.</p>
        ${
          data.objetivo
            ? `<p class="small muted" style="margin-top:-4px">Declared business outcome: <em>“${esc(data.objetivo)}”</em></p>`
            : ''
        }
        <p class="small">
          ${
            (data.destaques?.criticas?.length ?? 0)
              ? `<strong>${data.destaques.criticas.length}</strong> dimension(s) carry a P0 critical foundation: ${data.destaques.criticas
                  .map((d) => esc(d.short))
                  .join(', ')}. These are resolved before the initiatives that depend on them.`
              : 'No dimension requires a P0 foundation — the plan can be sequenced by value.'
          }
          ${
            data.confiancaReduzida?.length
              ? ` ${data.confiancaReduzida.length} dimension(s) have partial evidence and deserve confirmation in an interview.`
              : ''
          }
        </p>
        <div style="display:flex;gap:22px;flex-wrap:wrap;margin-top:12px">
          <div><div class="rp-score-head">Strengths</div><div class="small">${(data.destaques?.forcas || [])
            .map((d) => `${esc(d.short)} (${d.atual.toFixed(1)})`)
            .join(' · ')}</div></div>
          <div><div class="rp-score-head">Largest gaps</div><div class="small">${(data.destaques?.gaps || [])
            .map((d) => `${esc(d.short)} (+${d.gap.toFixed(1)})`)
            .join(' · ')}</div></div>
        </div>
      </div>
    </div>
  </section>`

  const itemsHtml = (items: string[], fallback: string) =>
    items.length
      ? items.map((i) => `<span class="pick-chip">${esc(i)}</span>`).join(' ')
      : esc(fallback || '—')

  const outcomeRows = (data.outcomes || [])
    .map(
      (o) => `<tr>
      <td class="num"><code>${esc(o.ref)}</code></td>
      <td><span class="badge accent">${esc(o.dimLabel)}</span></td>
      <td class="small">${esc(o.question)}</td>
      <td>${itemsHtml(o.items || [], o.answer || '')}</td>
    </tr>`
    )
    .join('')

  const outcomeMap = `<section class="card" id="outcomes" style="margin-bottom:18px">
    <div class="card-head"><div>
      <h2>Business outcome map</h2>
      <div class="sub">Objectives, KPI gaps, constraints and opportunities captured in the outcome-discovery questions</div>
    </div></div>
    ${
      outcomeRows
        ? `<div class="table-wrap" style="border:0"><table class="data" style="font-size:13px">
            <thead><tr><th>Ref</th><th>Dimension</th><th style="width:34%">Question</th><th>Declared answer</th></tr></thead>
            <tbody>${outcomeRows}</tbody></table></div>`
        : '<p class="muted small">No outcome-discovery answers were captured.</p>'
    }
    <div class="small muted" style="margin-top:10px">
      These answers are <strong>not scored</strong>. They feed the business outcome map and the initiative portfolio.
    </div>
  </section>`

  const scorecard = `<section class="card" id="scorecard" style="margin-bottom:18px">
    <div class="card-head"><div>
      <h2>AI maturity scorecard</h2>
      <div class="sub">Current level, benchmark target, gap and weighted contribution — 1 to 5 scale</div>
    </div></div>
    ${scorecardTable(data.scorecard || [])}
    <div class="divider"></div>
    <div class="small muted">
      ${MATURITY_LABELS.map((l, i) => `<strong>${esc(l)}</strong> — ${esc(MATURITY_DESC[i])}`).join(' · ')}
    </div>
    <div class="small muted" style="margin-top:8px">
      Each dimension level is the mean of its maturity (M) and hybrid (H) answers, to one decimal. Outcome-discovery (O)
      answers are excluded from the index. The overall index is the <strong>weighted</strong> mean of the seven dimensions.
    </div>
    <div class="bench-note">
      <i class="fa-solid fa-ruler-combined" aria-hidden="true"></i>
      <div>
        <strong>Targets are the framework benchmark, not a self-declared ambition.</strong>
        Every client is measured against the same reference — Strategy 3.0, Use Cases 4.0, Data 3.0, Technology 4.0,
        Security 3.0, People 3.0 and Economics 3.0 — which weighted by the index gives
        <strong>${formatIndex(data.indice?.target)}/5</strong>. That keeps the gap comparable across clients and across cycles.
      </div>
    </div>
  </section>`

  const radar = `<section class="card" id="radar" style="margin-bottom:18px">
    <div class="card-head"><div>
      <h2>Current × target radar</h2>
      <div class="sub">Comparison between the current level and the framework benchmark per dimension</div>
    </div></div>
    <div class="radar-wrap">${radarSvg(data.scorecard || [])}</div>
    <div class="legend">
      <span class="k"><i style="background:#0B2545"></i> Current level</span>
      <span class="k"><i style="background:#8FAE00;height:0;border-top:2px dashed #8FAE00"></i> Benchmark target</span>
    </div>
  </section>`

  const matrixRows = DIMENSIONS.map((d) => {
    const row = (data.scorecard || []).find((r) => r.dimensao === d.key)
    const needLevel = Math.max(1, Math.min(5, Math.round(row?.meta || 1)))
    const anchor = MATURITY_TO_INITIATIVE[d.key][needLevel - 1]
    return `<tr>
      <td><strong>${esc(d.nome)}</strong><div class="small muted">${Math.round(d.peso * 100)}% weight</div></td>
      <td class="num">${(row?.atual ?? 0).toFixed(1)}</td>
      <td class="num">${(row?.meta ?? 0).toFixed(1)}</td>
      <td class="num">${(row?.gap ?? 0).toFixed(1)}</td>
      <td>${esc(anchor)}</td>
    </tr>`
  }).join('')

  const matrix = `<section class="card page-break" id="matriz" style="margin-bottom:18px">
    <div class="card-head"><div>
      <h2>Maturity-to-initiative matrix</h2>
      <div class="sub">Anchor recommendation per dimension at the benchmark target level — a catalogue, not a prescription</div>
    </div></div>
    <div class="table-wrap" style="border:0"><table class="data" style="font-size:13px">
      <thead><tr><th>Dimension</th><th class="num">Current</th><th class="num">Target</th><th class="num">Gap</th><th>Anchor recommendation</th></tr></thead>
      <tbody>${matrixRows}</tbody>
    </table></div>
    <div class="small muted" style="margin-top:10px">
      A dimension at level 2 does not automatically require the level-2 infrastructure recommendation. The specific
      initiative depends on the validated use cases, constraints and risk appetite, which is why the catalogue below is
      scored and sequenced instead of applied verbatim.
    </div>
  </section>`

  const groupBlock = (
    key: 'transformation' | 'enabling',
    items: RecommendedInitiative[]
  ): string => {
    if (!items.length) return ''
    const meta = CATEGORY_META[key]
    return `<div style="margin-top:18px">
      <div class="flex-between" style="margin-bottom:8px">
        <div>
          <h3 style="margin:0;font-size:.95rem">${esc(meta.label)}</h3>
          <div class="small muted">${esc(meta.sub)}</div>
        </div>
        <span class="badge ${meta.tone}">${items.length}</span>
      </div>
      ${items.map(initiativeCard).join('')}
    </div>`
  }

  const iniciativas = `<section class="card" id="iniciativas" style="margin-bottom:18px">
    <div class="card-head"><div>
      <h2>Recommended initiative catalogue</h2>
      <div class="sub">${esc(
        selectionNote(
          (data.iniciativas || []).length,
          data.indice?.escala5 ?? 0,
          data.indice?.target ?? 0
        )
      )}</div>
    </div></div>
    ${groupBlock('transformation', data.grupos?.transformation || [])}
    ${groupBlock('enabling', data.grupos?.enabling || [])}
    ${
      (data.iniciativas || []).length
        ? ''
        : '<p class="muted small">No initiatives matched the current profile.</p>'
    }
    <div class="small muted" style="margin-top:14px">
      The set is produced by the method from the UT catalogue (IN01–IN28) — it is not a client declaration, and it is
      reproducible: the same answers and targets always yield the same plan.
    </div>
  </section>`

  const prioRows = (data.iniciativas || [])
    .map(
      (i) => `<tr>
      <td class="num"><code>${esc(i.id)}</code></td>
      <td>${esc(i.nome)}<div class="small muted">${esc(i.dimensaoLabel)} · ${esc(i.outcome)}</div></td>
      <td class="num">${i.factors.impacto}</td>
      <td class="num">${i.factors.alinhamento}</td>
      <td class="num">${gapScore(i.factors.gap)}</td>
      <td class="num">${i.factors.valor}</td>
      <td class="num">${i.factors.viabilidade}</td>
      <td class="num">${i.factors.tempo}</td>
      <td class="num">${i.factors.criticidade}</td>
      <td class="num"><strong>${i.score}</strong></td>
      <td>${priorityBadge(i.prioridade)}</td>
    </tr>`
    )
    .join('')

  const priorizacao = `<section class="card page-break" id="priorizacao" style="margin-bottom:18px">
    <div class="card-head"><div>
      <h2>Prioritisation</h2>
      <div class="sub">Seven weighted criteria, each scored 1–5, producing a 0–100 score and a P0–P4 class</div>
    </div></div>
    ${
      prioRows
        ? `<div class="table-wrap" style="border:0"><table class="data" style="font-size:12.5px">
            <thead><tr>
              <th>ID</th><th>Initiative</th>
              <th class="num" title="Business outcome impact (25%)">Imp</th>
              <th class="num" title="Strategic alignment (15%)">Ali</th>
              <th class="num" title="Maturity gap (15%)">Gap</th>
              <th class="num" title="Economic value (15%)">Val</th>
              <th class="num" title="Implementation feasibility (10%)">Fea</th>
              <th class="num" title="Time to value (10%)">TTV</th>
              <th class="num" title="Risk & dependency criticality (10%)">Cri</th>
              <th class="num">Score</th><th>Priority</th>
            </tr></thead>
            <tbody>${prioRows}</tbody>
          </table></div>
          <div class="small muted" style="margin-top:10px">
            Weights: ${Object.entries(CRITERIA_LABEL)
              .map(([, label]) => esc(label))
              .join(' · ')}.
            A P0 initiative does not need the highest individual ROI — it may be required to enable others or to meet a
            security or compliance obligation.
          </div>`
        : '<p class="muted small">No initiatives to prioritise.</p>'
    }
  </section>`

  const roadmap = (data.plano || [])
    .map(
      (h) => `<div class="horizon">
      <header><span>${esc(h.meta.label)} · ${esc(h.meta.window)}</span>${h.itens.length} initiative(s)</header>
      <div class="h-body">
        <p class="small muted" style="margin-bottom:8px">${esc(h.meta.sub)}</p>
        ${
          h.itens.length
            ? h.itens
                .map(
                  (i) =>
                    `<div class="h-item"><i class="fa-solid fa-arrow-right" aria-hidden="true"></i><div>
                      <strong><code>${esc(i.id)}</code> ${esc(i.nome)}</strong>
                      <em>${esc(i.proximo_passo)}</em>
                      <div class="small muted">${priorityBadge(i.prioridade)} ${esc(i.outcome)}</div>
                    </div></div>`
                )
                .join('')
            : '<div class="small muted">Nothing assigned to this wave.</div>'
        }
      </div>
    </div>`
    )
    .join('')

  const plano = `<section class="card page-break" id="plano" style="margin-bottom:18px">
    <div class="card-head"><div>
      <h2>AI transformation roadmap</h2>
      <div class="sub">Mandatory foundations, quick wins and strategic initiatives</div>
    </div></div>
    <div class="horizons">${roadmap}</div>
  </section>`

  const evidenciaBlock = (data.evidencia || []).length
    ? `<section class="card" id="evidencia" style="margin-bottom:18px">
        <div class="card-head"><div>
          <h2>Evidence recorded</h2>
          <div class="sub">Evidence options selected in the hybrid questions — read alongside the score, never instead of it</div>
        </div></div>
        <dl class="meta-grid">
          ${(data.evidencia || [])
            .map(
              (e) => `<div style="grid-column:1/-1">
              <dt><code>${esc(e.ref)}</code> · ${esc(e.dimLabel)} · scored ${e.level}/5</dt>
              <dd>${(e.items || []).length
                ? (e.items || []).map((i) => `<span class="pick-chip">${esc(i)}</span>`).join(' ')
                : '<span class="muted">No evidence option selected.</span>'}</dd>
            </div>`
            )
            .join('')}
        </dl>
      </section>`
    : ''

  const aviso = `<div class="disclaimer">
    <i class="fa-solid fa-circle-info" aria-hidden="true"></i>
    <div><strong>Methodological notice.</strong> This assessment is based on the answers declared by the company's
    representative, without documentary audit. Maturity is inferred from the evidence captured in the maturity and
    hybrid questions, not from a single perception score — and still deserves confirmation in a field interview.
    The initiative catalogue is a recommendation of the method, not a commercial proposal.
    ${
      legacy
        ? ' <strong>Note:</strong> this is a version produced under the previous scoring method; the values are historical.'
        : ''
    }
    ${
      (data.confiancaReduzida || []).length
        ? ` Dimensions with partial evidence (${(data.confiancaReduzida || [])
            .map((d) => esc(d.nome))
            .join(', ')}) carry a reduced-confidence flag.`
        : ''
    }
    Version v${r.versao} generated on ${esc(fmtDateTime(data.geradoEm))}.</div>
  </div>`

  const historico =
    r.mode !== 'print' && r.versions && r.versions.length > 1
      ? `<div class="card" style="margin-bottom:18px" id="historico">
        <div class="card-head"><h3>Version history</h3></div>
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
    ${outcomeMap}
    ${scorecard}
    ${radar}
    ${matrix}
    ${iniciativas}
    ${priorizacao}
    ${plano}
    ${evidenciaBlock}
    <div class="card" style="border:0;background:transparent;padding:0">${aviso}</div>
    ${historico}
  </article>`
}

/* Re-exports kept for existing call sites. */
export { MATURITY_MATRIX, PRIORITY_LABEL, PRIORITY_ACTION, computeIndex, computeScorecard, classifyPriority, priorityScore }
