import { DIMENSIONS } from '../questions'
import { esc } from '../util'
import { doc } from './layout'

export type LoginOpts = {
  error?: string
  email?: string
  /** Default credentials still active (first access, never changed) */
  firstAccess?: { email: string; senha: string } | null
  notice?: string
}

export function loginPage(opts: LoginOpts = {}): string {
  const dims = DIMENSIONS.map(
    (d) => `<span><i class="fa-solid ${d.icone}" aria-hidden="true"></i>${esc(d.nome)}</span>`
  ).join('')

  const fa = opts.firstAccess

  return doc(
    { title: 'Administrator sign-in', bodyClass: 'login-body' },
    `<div class="login-wrap">
  <aside class="login-hero">
    <div>
      <a href="/login" class="logo-chip"><img src="/static/logo.png" alt="Unified Technologies"></a>
      <h1>AI Maturity<br>Assessment</h1>
      <p>A structured diagnosis across the seven dimensions of AI readiness —
      from client registration to a report with dimension scores, a radar chart and a 90-day plan.</p>
      <div class="hero-dims">${dims}</div>
    </div>
    <div class="hero-foot">Unified Technologies</div>
  </aside>

  <section class="login-panel">
    <div class="login-box">
      <h2>Administrator sign-in</h2>
      <p class="lead">Restricted to practice management. Clients access through the unique link sent by e-mail.</p>

      ${
        opts.error
          ? `<div class="alert danger" role="alert"><i class="fa-solid fa-circle-exclamation" aria-hidden="true"></i><div>${esc(
              opts.error
            )}</div></div>`
          : ''
      }
      ${
        opts.notice
          ? `<div class="alert ok" role="status"><i class="fa-solid fa-circle-check" aria-hidden="true"></i><div>${esc(
              opts.notice
            )}</div></div>`
          : ''
      }

      ${
        fa
          ? `<div class="first-access">
              <strong><i class="fa-solid fa-key" aria-hidden="true"></i> First access</strong>
              This application has no sign-up screen: the administrator account is created automatically on
              first run, with the credentials below.
              <dl>
                <dt>E-mail</dt><dd><code>${esc(fa.email)}</code></dd>
                <dt>Password</dt><dd><code>${esc(fa.senha)}</code></dd>
              </dl>
              <div class="tip">Sign in with these details and change the password under <strong>Settings</strong>.
              This notice disappears as soon as the password is changed.</div>
            </div>`
          : ''
      }

      <form method="post" action="/login" novalidate>
        <div class="field">
          <label for="email">E-mail</label>
          <input type="email" id="email" name="email" value="${esc(opts.email || fa?.email || '')}" autocomplete="username" required ${fa ? '' : 'autofocus'}>
        </div>
        <div class="field">
          <label for="senha">Password</label>
          <input type="password" id="senha" name="senha" autocomplete="current-password" required ${fa ? 'autofocus' : ''}>
        </div>
        <button class="btn btn-block" type="submit">Sign in</button>
      </form>

      <p class="small muted" style="margin-top:18px">
        Forgot your password? Ask the application's technical owner for a reset —
        automated recovery is planned for the next phase.
      </p>
      <div class="divider"></div>
      <p class="small muted">
        <strong>Are you a client?</strong> You do not need a password: just use the exact link you received by e-mail —
        it opens your company's questionnaire.
      </p>
    </div>
  </section>
</div>`
  )
}
