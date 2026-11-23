import type { DimKey, QuestionSeed } from './questions'
import { DIMENSIONS } from './questions'

export type QRow = QuestionSeed & { id: number; versao: number }

export type RespostaMap = Record<number, unknown>

export type ScoreRow = {
  dimensao: DimKey
  nome: string
  short: string
  atual: number
  meta: number
  gap: number
  prioridade: 'Critical' | 'High' | 'Medium' | 'Low'
  confianca: 'alta' | 'reduzida'
  respondidas: number
  total: number
  urgencia: number
  bloqueada: boolean
}

/** Converte a resposta de uma pergunta em nível L0–L4 (null = não pontua) */
export function levelOf(q: QRow, valor: unknown): number | null {
  if (valor === null || valor === undefined || valor === '') return null
  if (q.tipo === 'texto') return null

  if (q.tipo === 'escala') {
    const v = typeof valor === 'object' && valor !== null ? Number((valor as any).v) : Number(valor)
    if (!Number.isFinite(v) || v < 1) return null
    return Math.max(0, Math.min(4, Math.round(v) - 1))
  }

  if (q.tipo === 'escolha') {
    const idx = typeof valor === 'object' && valor !== null ? Number((valor as any).i) : Number(valor)
    if (!Number.isFinite(idx)) return null
    const opt = q.opcoes?.[idx]
    if (!opt) return null
    return Math.max(0, Math.min(4, opt.level))
  }

  if (q.tipo === 'multipla') {
    const arr = Array.isArray(valor)
      ? valor.map(Number)
      : typeof valor === 'object' && valor !== null && Array.isArray((valor as any).sel)
        ? (valor as any).sel.map(Number)
        : []
    if (!arr.length) return null
    const semMecanismo = arr.includes((q.opcoes || []).findIndex((o) => o.level === 0))
    if (semMecanismo) return 0
    return Math.max(0, Math.min(4, arr.length))
  }

  return null
}

export function isAnswered(q: QRow, valor: unknown): boolean {
  if (q.tipo === 'texto') {
    return String(typeof valor === 'object' && valor !== null ? (valor as any).t ?? '' : valor ?? '').trim().length > 0
  }
  if (q.tipo === 'multipla') {
    const arr = Array.isArray(valor) ? valor : (valor as any)?.sel
    return Array.isArray(arr) && arr.length > 0
  }
  return levelOf(q, valor) !== null
}

function priorityOf(gap: number, urgencia: number, atual: number): ScoreRow['prioridade'] {
  let p: ScoreRow['prioridade'] = 'Low'
  if (gap >= 3) p = 'Critical'
  else if (gap >= 2) p = urgencia >= 3 ? 'Critical' : 'High'
  else if (gap >= 1) p = urgencia >= 3 ? 'High' : 'Medium'
  else p = atual <= 1 ? 'Medium' : 'Low'

  // Regra herdada: nível L0/L1 nunca é tratado como prioridade baixa
  if (atual === 0 && p !== 'Critical') p = 'Critical'
  else if (atual === 1 && (p === 'Low' || p === 'Medium')) p = 'High'
  return p
}

const PESO: Record<ScoreRow['prioridade'], number> = { Critical: 0, High: 1, Medium: 2, Low: 3 }

export function computeScorecard(
  questions: QRow[],
  respostas: RespostaMap,
  metas: Record<string, number>,
  urgenciasPorDimensao: Record<string, number>
): ScoreRow[] {
  return DIMENSIONS.map((dim) => {
    const qs = questions.filter((q) => q.dimensao === dim.key && q.tipo !== 'texto')
    const niveis: number[] = []
    let respondidas = 0
    for (const q of qs) {
      const lvl = levelOf(q, respostas[q.id])
      if (lvl !== null) {
        niveis.push(lvl)
        respondidas++
      }
    }
    const media = niveis.length ? niveis.reduce((a, b) => a + b, 0) / niveis.length : 0
    const atual = niveis.length ? Math.floor(media + 1e-9) : 0 // piso, sem arredondar para cima
    const metaRaw = metas[dim.key]
    const meta = Number.isFinite(Number(metaRaw)) ? Number(metaRaw) : Math.min(4, atual + 1)
    const gap = Math.max(0, meta - atual)
    const urgencia = urgenciasPorDimensao[dim.key] ?? 2
    const prioridade = priorityOf(gap, urgencia, atual)
    return {
      dimensao: dim.key,
      nome: dim.nome,
      short: dim.short,
      atual,
      meta,
      gap,
      prioridade,
      confianca: respondidas >= qs.length && qs.length > 0 ? 'alta' : 'reduzida',
      respondidas,
      total: qs.length,
      urgencia,
      bloqueada: prioridade === 'Critical',
    }
  })
}

/** Índice geral: média das 7 dimensões (0–4) exibido em escala 0–5 */
export function computeIndex(rows: ScoreRow[]): { escala5: number; media4: number } {
  const media4 = rows.reduce((a, r) => a + r.atual, 0) / rows.length
  const escala5 = (media4 / 4) * 5
  return { escala5: Math.round(escala5 * 10) / 10, media4: Math.round(media4 * 100) / 100 }
}

export function sortByPriority(rows: ScoreRow[]): ScoreRow[] {
  return [...rows].sort((a, b) => {
    const d = PESO[a.prioridade] - PESO[b.prioridade]
    return d !== 0 ? d : b.gap - a.gap
  })
}

export type IniciativaCalc = {
  id: number
  nome: string
  problema: string
  beneficio: string
  urgencia: number
  dimensao: string | null
  prioridade_calculada: string
  proximo_passo: string
  origem: 'cliente' | 'metodo'
  bloqueio: string | null
  horizonte: '1-30' | '31-60' | '61-90'
}

/** Matriz de priorização: urgência × dimensões de suporte, com bloqueio por Critical */
export function prioritizeInitiatives(
  rows: ScoreRow[],
  initiatives: {
    id: number
    nome: string
    problema: string | null
    beneficio: string | null
    urgencia: number
    dimensao: string | null
    proximo_passo?: string | null
    origem?: 'cliente' | 'metodo'
  }[]
): IniciativaCalc[] {
  const byDim = Object.fromEntries(rows.map((r) => [r.dimensao, r]))
  const calc = initiatives.map((ini) => {
    const alvo = ini.dimensao ? byDim[ini.dimensao] : null
    const pior = rows.reduce((acc, r) => (PESO[r.prioridade] < PESO[acc.prioridade] ? r : acc), rows[0])
    const critica = ini.dimensao
      ? alvo
        ? alvo.prioridade === 'Critical'
          ? alvo
          : null
        : null
      : pior.prioridade === 'Critical'
        ? pior
        : null

    let prioridade: ScoreRow['prioridade'] = 'Medium'
    if (ini.urgencia >= 3) prioridade = 'Critical'
    else if (ini.urgencia === 2) prioridade = 'High'
    else prioridade = 'Medium'

    if (critica) prioridade = 'Critical'

    let horizonte: IniciativaCalc['horizonte'] = '31-60'
    if (prioridade === 'Critical' || ini.urgencia >= 3) horizonte = '1-30'
    else if (prioridade === 'High' || ini.urgencia === 2) horizonte = '31-60'
    else horizonte = '61-90'

    return {
      id: ini.id,
      nome: ini.nome,
      problema: ini.problema || '',
      beneficio: ini.beneficio || '',
      urgencia: ini.urgencia,
      dimensao: ini.dimensao,
      prioridade_calculada: prioridade,
      proximo_passo: ini.proximo_passo || '',
      origem: ini.origem || 'cliente',
      bloqueio: critica && ini.origem !== 'metodo' ? critica.nome : null,
      horizonte,
    }
  })
  return calc.sort((a, b) => PESO[a.prioridade_calculada as ScoreRow['prioridade']] - PESO[b.prioridade_calculada as ScoreRow['prioridade']] || b.urgencia - a.urgencia)
}

export function defaultNextStep(dim: string | null, prioridade: string): string {
  const d = DIMENSIONS.find((x) => x.key === dim)
  if (prioridade === 'Critical') return `Definir dono executivo e plano de 30 dias para elevar ${d?.nome ?? 'a dimensão crítica'}.`
  if (prioridade === 'High') return `Formalizar escopo, baseline e KPI antes de escalar ${d?.nome ?? 'a iniciativa'}.`
  return `Validar viabilidade técnica e patrocínio; entrar no próximo ciclo de priorização.`
}
