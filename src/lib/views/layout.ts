import { esc } from '../util'

export type DocOptions = {
  title: string
  bodyClass?: string
  head?: string
}

export function doc({ title, bodyClass = '', head = '' }: DocOptions, ...body: string[]): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${esc(title)} · Unified Technologies</title>
<link rel="icon" href="/static/logo.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.5.2/css/all.min.css">
<link rel="stylesheet" href="/static/app.css">
${head}
</head>
<body class="${esc(bodyClass)}">
${body.join('\n')}
</body>
</html>`
}

const NAV = [
  { href: '/painel', icon: 'fa-gauge-high', label: 'Dashboard' },
  { href: '/clientes/novo', icon: 'fa-user-plus', label: 'New client' },
  { href: '/ajuda', icon: 'fa-circle-question', label: 'How to use' },
  { href: '/configuracoes', icon: 'fa-gear', label: 'Settings' },
]

export type AdminShellOptions = {
  title: string
  subtitle?: string
  active: string
  admin: { nome: string; email: string }
  actions?: string
}

export function adminShell(opts: AdminShellOptions, ...content: string[]): string {
  const nav = NAV.map(
    (n) =>
      `<a href="${n.href}" class="${n.href === opts.active ? 'active' : ''}"${
        n.href === opts.active ? ' aria-current="page"' : ''
      }><i class="fa-solid ${n.icon}" aria-hidden="true"></i>${n.label}</a>`
  ).join('')

  return doc(
    { title: opts.title },
    `<a class="skip-link" href="#main">Skip to content</a>
<div class="shell">
  <aside class="sidebar">
    <div class="brand">
      <a href="/"><img src="/static/logo.png" alt="Unified Technologies"></a>
    </div>
    <nav class="nav" aria-label="Main navigation">
      <span class="nav-label">Assessment</span>
      ${nav}
    </nav>
    <div class="sidebar-foot">
      <div class="side-user">
        <span class="avatar" aria-hidden="true">${esc(opts.admin.nome.slice(0, 1).toUpperCase())}</span>
        <div>
          <strong>${esc(opts.admin.nome)}</strong>
          <span>${esc(opts.admin.email)}</span>
        </div>
      </div>
      <form method="post" action="/logout">
        <button class="btn btn-ghost btn-sm btn-block" type="submit" style="background:transparent;color:#c8d4ea;border-color:rgba(255,255,255,.18)">
          <i class="fa-solid fa-arrow-right-from-bracket" aria-hidden="true"></i> Sign out
        </button>
      </form>
    </div>
  </aside>
  <div class="main">
    <header class="topbar">
      <div>
        ${opts.subtitle ? `<div class="crumbs">${opts.subtitle}</div>` : ''}
        <h1>${esc(opts.title)}</h1>
      </div>
      <div class="report-actions">${opts.actions || ''}</div>
    </header>
    <main class="content" id="main">
      ${content.join('\n')}
    </main>
  </div>
</div>`
  )
}

export function publicHeader(backHref?: string, backLabel?: string): string {
  return `<header class="public-top">
  <img src="/static/logo.png" alt="Unified Technologies">
  ${
    backHref
      ? `<a class="btn btn-ghost btn-sm" href="${backHref}"><i class="fa-solid fa-arrow-left" aria-hidden="true"></i> ${esc(backLabel || 'Back')}</a>`
      : `<span class="small muted">AI Maturity Assessment</span>`
  }
</header>`
}

export function publicShell(title: string, content: string, opts: { backHref?: string; backLabel?: string; head?: string; bodyClass?: string } = {}): string {
  return doc(
    { title, head: opts.head, bodyClass: opts.bodyClass || 'public-shell' },
    publicHeader(opts.backHref, opts.backLabel),
    `<div class="public-body">${content}</div>`
  )
}

export function badge(text: string, tone = 'muted'): string {
  return `<span class="badge ${tone}">${esc(text)}</span>`
}

export function alertBox(kind: 'ok' | 'warn' | 'danger' | 'info', text: string): string {
  const icons: Record<string, string> = {
    ok: 'fa-circle-check',
    warn: 'fa-triangle-exclamation',
    danger: 'fa-circle-exclamation',
    info: 'fa-circle-info',
  }
  return `<div class="alert ${kind}" role="status"><i class="fa-solid ${icons[kind]}" aria-hidden="true"></i><div>${text}</div></div>`
}

export function levelChip(level: number): string {
  return `<span class="lvl-chip l${level}">L${level}</span>`
}
