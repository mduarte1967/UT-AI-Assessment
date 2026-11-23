// Utilitários compartilhados — sem dependências, compatíveis com Workers.

export function esc(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, (c) => {
    switch (c) {
      case '&': return '&amp;'
      case '<': return '&lt;'
      case '>': return '&gt;'
      case '"': return '&quot;'
      default: return '&#39;'
    }
  })
}

export function nowIso(): string {
  return new Date().toISOString()
}

export function addDays(days: number, from: Date = new Date()): Date {
  const d = new Date(from.getTime())
  d.setUTCDate(d.getUTCDate() + days)
  return d
}

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso.includes('T') ? iso : iso.replace(' ', 'T') + 'Z')
  if (Number.isNaN(d.getTime())) return String(iso)
  return `${String(d.getDate()).padStart(2, '0')} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

export function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso.includes('T') ? iso : iso.replace(' ', 'T') + 'Z')
  if (Number.isNaN(d.getTime())) return String(iso)
  return `${fmtDate(iso)} · ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function randomToken(bytes = 24): string {
  const buf = new Uint8Array(bytes)
  crypto.getRandomValues(buf)
  let bin = ''
  for (const b of buf) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function parseJson<T>(raw: unknown, fallback: T): T {
  if (raw === null || raw === undefined || raw === '') return fallback
  try {
    return JSON.parse(String(raw)) as T
  } catch {
    return fallback
  }
}

export function num(value: unknown, fallback = 0): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

export function initials(name: string): string {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return 'UT'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function estadoLabel(estado: string): string {
  switch (estado) {
    case 'aguardando': return 'Aguardando preenchimento'
    case 'em_preenchimento': return 'Em preenchimento'
    case 'submetido': return 'Submetido'
    case 'gerado': return 'Relatório gerado'
    default: return estado
  }
}

export function estadoTone(estado: string): string {
  switch (estado) {
    case 'aguardando': return 'warn'
    case 'em_preenchimento': return 'info'
    case 'submetido': return 'accent'
    case 'gerado': return 'ok'
    default: return 'muted'
  }
}

export function prioridadeTone(p: string): string {
  switch (p) {
    case 'Critical': return 'critical'
    case 'High': return 'high'
    case 'Medium': return 'medium'
    default: return 'low'
  }
}

export function prioridadePt(p: string): string {
  switch (p) {
    case 'Critical': return 'Crítica'
    case 'High': return 'Alta'
    case 'Medium': return 'Média'
    case 'Low': return 'Baixa'
    default: return p
  }
}

export function formatIndex(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '—'
  return n.toFixed(1).replace('.', ',')
}

export function formatPct(n: number): string {
  return `${Math.round(n * 100)}%`
}

export function sanitizePath(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120)
}
