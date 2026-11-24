// ─────────────────────────────────────────────────────────────────────────────
// Scoring engine — UT Outcome-Driven AI Assessment Framework
//
// • Every M / H question is scored on the maturity scale 1–5.
// • A dimension's level is the mean of its scored answers (1 decimal), never
//   derived from the outcome-discovery questions.
// • The AI Maturity Index is the WEIGHTED mean of the seven dimensions
//   (Use Cases 20%, Strategy/Data/Tech/Security 15% each, People/Economics 10%).
// • The weighted gap is weighted target − weighted current.
// • Initiatives are scored on the seven prioritisation criteria and classified
//   P0–P4, with P0 as a mandatory override for critical foundations.
// ─────────────────────────────────────────────────────────────────────────────

import type { DimKey, QuestionSeed } from './questions'
import { DIMENSIONS, DIM_WEIGHTS } from './questions'

export type QRow = QuestionSeed & { id: number; versao: number }

export type RespostaMap = Record<number, unknown>

export type Priority = 'P0' | 'P1' | 'P2' | 'P3' | 'P4'

export type ScoreRow = {
  dimensao: DimKey
  nome: string
  short: string
  /** Current maturity level, 1–5, one decimal. */
  atual: number
  /** Declared target maturity level, 1–5. */
  meta: number
  gap: number
  /** Dimension weight in the index (0–1). */
  peso: number
  prioridade: Priority
  confianca: 'alta' | 'reduzida'
  respondidas: number
  total: number
  /** Number of outcome-discovery answers captured for the dimension. */
  descobertas: number
  bloqueada: boolean
}

export const PRIORITY_LABEL: Record<Priority, string> = {
  P0: 'P0 · Critical foundation',
  P1: 'P1 · High priority',
  P2: 'P2 · Strategic priority',
  P3: 'P3 · Future opportunity',
  P4: 'P4 · Deferred',
}

export const PRIORITY_ACTION: Record<Priority, string> = {
  P0: 'Resolve before dependent initiatives',
  P1: 'Initiate within 90 days',
  P2: 'Include in the next implementation wave',
  P3: 'Reassess within 6–12 months',
  P4: 'Reassess when conditions improve',
}

const PRIORITY_WEIGHT: Record<Priority, number> = { P0: 0, P1: 1, P2: 2, P3: 3, P4: 4 }

export function sortByPriority<T extends { prioridade: Priority }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => PRIORITY_WEIGHT[a.prioridade] - PRIORITY_WEIGHT[b.prioridade])
}

/**
 * Converts one answer into a 1–5 maturity level, or null when the answer carries
 * no maturity evidence (outcome-discovery questions always return null).
 */
export function levelOf(q: QRow, valor: unknown): number | null {
  if (valor === null || valor === undefined || valor === '') return null
  if (q.tipo === 'texto' || q.persona === 'O') return null
  if (!Number.isFinite(Number(valor)) && typeof valor !== 'object') return null

  if (q.tipo === 'escala' || q.tipo === 'hibrido') {
    const raw =
      typeof valor === 'object' && valor !== null
        ? Number((valor as any).v)
        : Number(valor)
    if (!Number.isFinite(raw) || raw < 1) return null
    return Math.max(1, Math.min(5, Math.round(raw)))
  }

  if (q.tipo === 'escolha') {
    const idx = typeof valor === 'object' && valor !== null ? Number((valor as any).i) : Number(valor)
    if (!Number.isFinite(idx)) return null
    const opt = q.opcoes?.[idx]
    if (!opt) return null
    return Math.max(1, Math.min(5, opt.level))
  }

  if (q.tipo === 'multipla') {
    const arr = Array.isArray(valor)
      ? valor.map(Number)
      : typeof valor === 'object' && valor !== null && Array.isArray((valor as any).sel)
        ? (valor as any).sel.map(Number)
        : []
    if (!arr.length) return null
    return Math.max(1, Math.min(5, arr.length))
  }

  return null
}

export function isAnswered(q: QRow, valor: unknown): boolean {
  if (q.tipo === 'texto') {
    return String(typeof valor === 'object' && valor !== null ? (valor as any).t ?? '' : valor ?? '').trim().length > 0
  }
  if (q.tipo === 'hibrido') {
    const v = typeof valor === 'object' && valor !== null ? Number((valor as any).v) : Number(valor)
    return Number.isFinite(v) && v >= 1
  }
  if (q.tipo === 'multipla') {
    const arr = Array.isArray(valor) ? valor : (valor as any)?.sel
    return Array.isArray(arr) && arr.length > 0
  }
  return levelOf(q, valor) !== null
}

/** Free text of a hybrid or text answer. */
export function evidenceOf(valor: unknown): string {
  if (valor && typeof valor === 'object' && 't' in (valor as any)) {
    return String((valor as any).t ?? '').trim()
  }
  if (typeof valor === 'string' && !/^\d+$/.test(valor)) return valor.trim()
  return ''
}

const round1 = (n: number) => Math.round(n * 10) / 10
const round2 = (n: number) => Math.round(n * 100) / 100

/**
 * Dimension priority when no initiative is available to derive it from.
 * Level 1 on a control dimension is always a foundation (P0); otherwise the
 * declared gap drives the classification.
 */
function fallbackPriority(atual: number, gap: number, dim: DimKey): Priority {
  if (atual <= 1 && (dim === 'security' || dim === 'data')) return 'P0'
  if (gap >= 3) return 'P0'
  if (gap >= 2) return 'P1'
  if (gap === 1) return atual <= 2 ? 'P1' : 'P2'
  return atual <= 2 ? 'P2' : atual === 3 ? 'P3' : 'P4'
}

export function computeScorecard(
  questions: QRow[],
  respostas: RespostaMap,
  metas: Record<string, number>
): ScoreRow[] {
  return DIMENSIONS.map((dim) => {
    const scored = questions.filter((q) => q.dimensao === dim.key && q.persona !== 'O')
    const discovered = questions.filter((q) => q.dimensao === dim.key && q.persona === 'O')

    const levels: number[] = []
    for (const q of scored) {
      const lvl = levelOf(q, respostas[q.id])
      if (lvl !== null) levels.push(lvl)
    }

    const media = levels.length ? levels.reduce((a, b) => a + b, 0) / levels.length : 1
    const atual = levels.length ? round1(media) : 0
    const metaRaw = metas[dim.key]
    const meta = Number.isFinite(Number(metaRaw)) ? Math.max(1, Math.min(5, Number(metaRaw))) : Math.min(5, Math.round(media) + 1)
    const gap = Math.max(0, round1(meta - atual))

    const descobertas = discovered.filter((q) => isAnswered(q, respostas[q.id])).length

    return {
      dimensao: dim.key,
      nome: dim.nome,
      short: dim.short,
      atual,
      meta,
      gap,
      peso: DIM_WEIGHTS[dim.key],
      prioridade: fallbackPriority(atual, gap, dim.key),
      confianca: levels.length >= scored.length && scored.length > 0 ? 'alta' : 'reduzida',
      respondidas: levels.length,
      total: scored.length,
      descobertas,
      bloqueada: false,
    }
  })
}

export type IndexResult = {
  /** Weighted current maturity, 1–5. */
  escala5: number
  /** Alias kept for existing call sites and the reports table. */
  media4: number
  /** Weighted target maturity, 1–5. */
  target: number
  /** Weighted target − weighted current. */
  weightedGap: number
  /** Unweighted mean of the seven dimension levels. */
  mediaSimples: number
}

/** Weighted AI Maturity Index over the seven dimensions. */
export function computeIndex(rows: ScoreRow[]): IndexResult {
  const totalWeight = rows.reduce((a, r) => a + r.peso, 0) || 1
  const atual = rows.reduce((a, r) => a + r.atual * r.peso, 0) / totalWeight
  const target = rows.reduce((a, r) => a + r.meta * r.peso, 0) / totalWeight
  const simples = rows.reduce((a, r) => a + r.atual, 0) / (rows.length || 1)
  return {
    escala5: round2(atual),
    media4: round2(atual),
    target: round2(target),
    weightedGap: round2(Math.max(0, target - atual)),
    mediaSimples: round1(simples),
  }
}

// ── Initiative prioritisation ───────────────────────────────────────────────

export type PriorityFactors = {
  /** Expected improvement in business KPIs. */
  impacto: number
  /** Contribution to executive business priorities. */
  alinhamento: number
  /** Economic value relative to cost. */
  valor: number
  /** Data, technology and resource availability. */
  viabilidade: number
  /** Speed to a measurable result. */
  tempo: number
  /** Risk and enabling dependency. */
  criticidade: number
}

/** Weights sum to 1. */
export const CRITERIA_WEIGHTS = {
  impacto: 0.25,
  alinhamento: 0.15,
  valor: 0.15,
  viabilidade: 0.1,
  tempo: 0.1,
  criticidade: 0.1,
  gap: 0.15,
} as const

export const CRITERIA_LABEL: Record<keyof typeof CRITERIA_WEIGHTS, string> = {
  impacto: 'Business outcome impact',
  alinhamento: 'Strategic alignment',
  gap: 'Maturity gap',
  valor: 'Economic value',
  viabilidade: 'Implementation feasibility',
  tempo: 'Time to value',
  criticidade: 'Risk & dependency criticality',
}

/** Maturity gap 0–4 mapped onto the 1–5 score scale. */
export function gapScore(gap: number): number {
  return Math.max(1, Math.min(5, Math.round(gap) + 1))
}

/** Weighted priority score, 0–100. */
export function priorityScore(f: PriorityFactors, gap: number): number {
  const sum =
    f.impacto * CRITERIA_WEIGHTS.impacto +
    f.alinhamento * CRITERIA_WEIGHTS.alinhamento +
    f.valor * CRITERIA_WEIGHTS.valor +
    f.viabilidade * CRITERIA_WEIGHTS.viabilidade +
    f.tempo * CRITERIA_WEIGHTS.tempo +
    f.criticidade * CRITERIA_WEIGHTS.criticidade +
    gapScore(gap) * CRITERIA_WEIGHTS.gap
  // Every factor is 1–5, so the weighted mean is 1–5 → scale to 0–100.
  return Math.round((sum / 5) * 100)
}

export type ClassificationInput = {
  score: number
  /** True when this initiative must exist before others can deliver. */
  mandatoryFoundation?: boolean
  /** Blocked by an unresolved critical dependency. */
  blocked?: boolean
}

export function classifyPriority(input: ClassificationInput): Priority {
  if (input.blocked) return 'P0'
  if (input.mandatoryFoundation) return 'P0'
  const s = input.score
  if (s >= 80) return 'P1'
  if (s >= 65) return 'P2'
  if (s >= 50) return 'P3'
  return 'P4'
}

export type Wave = 'foundations' | 'quickwins' | 'strategic' | 'later'

export const WAVE_META: Record<Wave, { label: string; sub: string; window: string }> = {
  foundations: {
    label: 'Mandatory foundations',
    sub: 'Resolve before dependent initiatives — enabling capabilities, controls and obligations.',
    window: 'Days 0–30',
  },
  quickwins: {
    label: 'Quick wins',
    sub: 'High-priority initiatives able to show a measurable result inside 90 days.',
    window: 'Days 30–90',
  },
  strategic: {
    label: 'Strategic initiatives',
    sub: 'Business transformation initiatives for the next implementation wave.',
    window: 'Days 90–180',
  },
  later: {
    label: 'Future opportunity',
    sub: 'Reassess in the next cycle, when the prerequisites are in place.',
    window: 'Beyond 180 days',
  },
}
