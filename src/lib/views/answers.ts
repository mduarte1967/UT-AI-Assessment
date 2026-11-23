import { DIMENSIONS, LEVEL_LABELS } from '../questions'
import { isAnswered, levelOf, type QRow } from '../scoring'
import { esc, fmtDate } from '../util'
import { publicShell, levelChip } from './layout'

export type AnswersContext = {
  token: string
  empresa: string
  responsavel: string
  submetidoEm: string | null
  versaoRelatorio: number | null
  questions: QRow[]
  respostas: Record<number, unknown>
  metas: Record<string, number>
  readOnlyNote: string
}

function answerLabel(q: QRow, val: unknown): string {
  if (val === null || val === undefined) return '<span class="muted">Não respondida</span>'
  if (q.tipo === 'escala') {
    const v = Number((val as any)?.v ?? val)
    const idx = v - 1
    const label = q.rubrica?.labels?.[idx] || ''
    return label ? `L${idx} — ${esc(label)}` : `L${idx}`
  }
  if (q.tipo === 'escolha') {
    const i = Number((val as any)?.i ?? val)
    const opt = q.opcoes?.[i]
    return opt ? `${esc(opt.label)} <span class="badge muted">L${opt.level}</span>` : '—'
  }
  if (q.tipo === 'multipla') {
    const arr: number[] = Array.isArray(val) ? val.map(Number) : (val as any)?.sel?.map(Number) || []
    if (!arr.length) return '<span class="muted">Não respondida</span>'
    return arr.map((i) => esc(q.opcoes?.[i]?.label || '')).filter(Boolean).join(' · ')
  }
  return esc(String((val as any)?.t ?? val ?? '—'))
}

export function renderAnswersPage(ctx: AnswersContext): string {
  const scored = ctx.questions.filter((q) => q.tipo !== 'texto')
  const answered = scored.filter((q) => isAnswered(q, ctx.respostas[q.id])).length

  const sections = DIMENSIONS.map((dim) => {
    const qs = ctx.questions.filter((q) => q.dimensao === dim.key)
    if (!qs.length) return ''
    const meta = Number(ctx.metas[dim.key] ?? 2)
    return `<section class="section">
      <div class="section-head">
        <div class="dim-icon"><i class="fa-solid ${dim.icone}" aria-hidden="true"></i></div>
        <div><h2>${esc(dim.nome)}</h2><div class="sub">${esc(dim.descricao)}</div></div>
        <span class="count">meta L${meta}</span>
      </div>
      <div class="table-wrap" style="border:0;margin-top:10px">
        <table class="data" style="font-size:13px">
          <tbody>${qs
            .map((q) => {
              const val = ctx.respostas[q.id]
              const lvl = levelOf(q, val)
              if (q.tipo === 'texto') {
                return `<tr><td style="width:42%">${esc(q.texto)}</td><td colspan="2">${answerLabel(q, val)}</td></tr>`
              }
              return `<tr>
                <td style="width:42%">${esc(q.texto)}</td>
                <td>${answerLabel(q, val)}</td>
                <td class="num" style="width:70px">${lvl === null ? '<span class="muted">—</span>' : levelChip(lvl)}</td>
              </tr>`
            })
            .join('')}</tbody>
        </table>
      </div>
    </section>`
  }).join('')

  const metasRows = DIMENSIONS.map(
    (d) => `<div class="target-row">
      <div><span class="tname">${esc(d.short)}</span>
      <span class="tnow">${esc(LEVEL_LABELS[Number(ctx.metas[d.key] ?? 2)] || '')}</span></div>
      ${levelChip(Number(ctx.metas[d.key] ?? 2))}
    </div>`
  ).join('')

  const body = `
<div class="card" style="margin-bottom:18px;display:flex;gap:14px;align-items:center;justify-content:space-between;flex-wrap:wrap">
  <div>
    <h1 style="font-size:20px">Respostas enviadas</h1>
    <div class="small muted">${esc(ctx.empresa)} · ${esc(ctx.responsavel)}${
      ctx.submetidoEm ? ` · submetido em ${esc(fmtDate(ctx.submetidoEm))}` : ''
    }</div>
  </div>
  <div class="report-actions">
    ${ctx.versaoRelatorio ? `<a class="btn btn-sm" href="/a/${ctx.token}/relatorio"><i class="fa-solid fa-chart-simple" aria-hidden="true"></i> Ver relatório</a>` : ''}
    <a class="btn btn-sm btn-ghost" href="/a/${ctx.token}/relatorio.pdf" target="_blank" rel="noopener"><i class="fa-solid fa-file-pdf" aria-hidden="true"></i> PDF</a>
  </div>
</div>

<div class="alert info"><i class="fa-solid fa-lock" aria-hidden="true"></i><div>${ctx.readOnlyNote}</div></div>

<div class="card" style="margin-bottom:18px">
  <div class="card-head"><div><h2>Progresso do preenchimento</h2>
    <div class="sub">${answered} de ${scored.length} perguntas respondidas</div></div></div>
  <div class="bar" style="height:9px"><span style="width:${Math.round((answered / Math.max(1, scored.length)) * 100)}%"></span></div>
</div>

${sections}

<section class="section">
  <div class="section-head">
    <div class="dim-icon"><i class="fa-solid fa-bullseye" aria-hidden="true"></i></div>
    <div><h2>Metas declaradas para 12 meses</h2><div class="sub">Comparativo usado no radar atual × meta</div></div>
  </div>
  <div class="targets" style="margin-top:12px">${metasRows}</div>
</section>
`

  return publicShell('Respostas enviadas', body)
}
