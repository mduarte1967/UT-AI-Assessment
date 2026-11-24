import { esc } from '../util'

export type DocOptions = {
  title: string
  bodyClass?: string
  head?: string
}

/** Base HTML document. Roboto + Font Awesome + /static/app.css (UT design system). */
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
<link href="https://fonts.googleapis.com/css2?family=Roboto:wght@100;300;400;500;700;900&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.5.2/css/all.min.css">
<link rel="stylesheet" href="/static/app.css">
${head}
</head>
<body class="${esc(bodyClass)}">
${body.join('\n')}
</body>
</html>`
}

const LOGO = `<a class="topbar-logo" href="{{HOME}}"><img src="/static/logo.png" alt="Unified Technologies"></a>`

const MOBILE_SCRIPT = `<script>
(function(){
  var t = document.querySelector('.mobile-toggle');
  var n = document.querySelector('.topbar-nav');
  if (!t || !n) return;
  t.addEventListener('click', function(){
    var open = n.classList.toggle('open');
    t.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
})();
</script>`

/* ── Admin console ──────────────────────────────────────────────────────── */

/** Routes of the administrator console — a separate URL space (/admin). */
export const ADMIN_ROOT = '/admin'

const ADMIN_NAV = [
  { href: '/admin', icon: 'fa-gauge-high', label: 'Dashboard' },
  { href: '/admin/clients/new', icon: 'fa-user-plus', label: 'New client' },
  { href: '/admin/help', icon: 'fa-circle-question', label: 'How to use' },
  { href: '/admin/settings', icon: 'fa-gear', label: 'Settings' },
]

export type AdminShellOptions = {
  title: string
  subtitle?: string
  active: string
  admin: { nome: string; email: string }
  actions?: string
  /** Narrow content column (forms, single cards). */
  narrow?: boolean
}

export function adminShell(opts: AdminShellOptions, ...content: string[]): string {
  const nav = ADMIN_NAV.map(
    (n) =>
      `<a href="${n.href}" class="${n.href === opts.active ? 'active' : ''}"${
        n.href === opts.active ? ' aria-current="page"' : ''
      }>${esc(n.label)}</a>`
  ).join('')

  return doc(
    { title: opts.title },
    `<a class="skip-link" href="#main">Skip to content</a>
<header class="topbar">
  <div class="topbar-inner">
    ${LOGO.replace('{{HOME}}', '/admin')}
    <button class="mobile-toggle" type="button" aria-label="Open menu" aria-expanded="false">☰</button>
    <nav class="topbar-nav" aria-label="Administrator navigation">
      ${nav}
      <form method="post" action="/admin/logout" style="margin:0">
        <button class="topbar-user" type="submit" title="Sign out">
          <span class="avatar" aria-hidden="true">${esc(opts.admin.nome.slice(0, 1).toUpperCase())}</span>
          ${esc(opts.admin.nome.split(' ')[0])}
          <i class="fa-solid fa-arrow-right-from-bracket" aria-hidden="true"></i>
        </button>
      </form>
    </nav>
  </div>
</header>

<section class="page-hero">
  <div class="container">
    ${opts.subtitle ? `<div class="breadcrumb">${opts.subtitle}</div>` : ''}
    <h1>${esc(opts.title)}</h1>
    ${opts.actions ? `<div class="hero-actions">${opts.actions}</div>` : ''}
  </div>
</section>

<main class="page-body" id="main">
  <div class="page-wrap${opts.narrow ? ' narrow' : ''}">
    ${content.join('\n')}
  </div>
</main>

<footer class="site-footer slim">
  <div class="container">
    <div class="footer-bottom">
      <span>© 2026 Unified Technologies · unifiedtech.com</span>
      <span class="signature">Co-Managed Security Intelligence</span>
    </div>
  </div>
</footer>
${MOBILE_SCRIPT}`
  )
}

/* ── Public (client-facing) site ─────────────────────────────────────────── */

export type PublicShellOptions = {
  /** Navy hero band; omit for pages that bring their own layout. */
  hero?: {
    kicker?: string
    title: string
    lede?: string
    breadcrumb?: string
    actions?: string
    stats?: { value: string; label: string }[]
  }
  /** Narrow (900px) or wide (1080px) body. */
  wide?: boolean
  head?: string
  bodyClass?: string
}

export function publicTopbar(): string {
  return `<header class="topbar">
  <div class="topbar-inner">
    ${LOGO.replace('{{HOME}}', '/')}
    <button class="mobile-toggle" type="button" aria-label="Open menu" aria-expanded="false">☰</button>
    <nav class="topbar-nav" aria-label="Main navigation">
      <a href="/">Overview</a>
      <a href="/#dimensions">Dimensions</a>
      <a href="/#how-it-works">How it works</a>
    </nav>
  </div>
</header>`
}

function heroHtml(hero: NonNullable<PublicShellOptions['hero']>, wide: boolean): string {
  const stats = hero.stats?.length
    ? `<div class="hero-stats">${hero.stats
        .map((s) => `<div><strong>${esc(s.value)}</strong><span>${esc(s.label)}</span></div>`)
        .join('')}</div>`
    : ''
  return `<section class="page-hero">
  <div class="${wide ? 'container' : 'container-narrow'}">
    ${hero.breadcrumb ? `<div class="breadcrumb">${hero.breadcrumb}</div>` : ''}
    ${hero.kicker ? `<span class="kicker">${esc(hero.kicker)}</span>` : ''}
    <h1>${esc(hero.title)}</h1>
    ${hero.lede ? `<p class="lede">${esc(hero.lede)}</p>` : ''}
    ${hero.actions ? `<div class="hero-actions">${hero.actions}</div>` : ''}
    ${stats}
  </div>
</section>`
}

function siteFooter(): string {
  return `<footer class="site-footer">
  <div class="container">
    <div class="footer-grid">
      <div class="brand">
        <img src="/static/logo.png" alt="Unified Technologies">
        <p>Ultra-secure, seamlessly integrated networks, infrastructure &amp; AI — delivered from the Caribbean.</p>
      </div>
      <div>
        <h4>Assessment</h4>
        <a href="/">Overview</a>
        <a href="/#dimensions">The seven dimensions</a>
        <a href="/#how-it-works">How it works</a>
        <a href="/start">Start the assessment</a>
      </div>
      <div>
        <h4>Deliverables</h4>
        <a href="/#deliverables">Maturity report</a>
        <a href="/#deliverables">Scorecard &amp; radar</a>
        <a href="/#deliverables">90-day plan</a>
      </div>
      <div>
        <h4>Contact</h4>
        <a href="mailto:ai@unifiedtech.com">ai@unifiedtech.com</a>
        <a href="https://www.unifiedtech.com" target="_blank" rel="noopener">unifiedtech.com</a>
      </div>
    </div>
    <div class="footer-bottom">
      <span>© 2026 Unified Technologies · unifiedtech.com</span>
      <span class="signature">Co-Managed Security Intelligence</span>
    </div>
  </div>
</footer>`
}

export function publicShell(title: string, content: string, opts: PublicShellOptions = {}): string {
  return doc(
    { title, head: opts.head, bodyClass: opts.bodyClass || 'public-shell' },
    `<a class="skip-link" href="#main">Skip to content</a>`,
    publicTopbar(),
    opts.hero ? heroHtml(opts.hero, !!opts.wide) : '',
    `<main id="main" class="public-body${opts.wide ? ' wide' : ''}">${content}</main>`,
    siteFooter(),
    MOBILE_SCRIPT
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
