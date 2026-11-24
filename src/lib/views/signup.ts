import { DIMENSIONS } from '../questions'
import { esc } from '../util'
import { publicShell, alertBox } from './layout'
import { COUNTRY_NAMES, DEFAULT_COUNTRY, REGION_SUGGESTIONS, VERTICAIS_PUBLIC, PORTES_PUBLIC } from '../geo'

export type SignupData = {
  razao_social?: string | null
  nome_fantasia?: string | null
  tax_id?: string | null
  website?: string | null
  vertical?: string | null
  tamanho_faixa?: string | null
  country?: string | null
  estado?: string | null
  cidade?: string | null
  postal_code?: string | null
  responsavel_nome?: string | null
  responsavel_email?: string | null
  consent?: string | null
}

export type SignupOpts = {
  data?: SignupData
  error?: string
  /** Shown when self-signup has been switched off by the administrator. */
  closed?: boolean
  contactEmail?: string
}

const REGION_OPTIONS = REGION_SUGGESTIONS.map((r) => `<option value="${esc(r)}"></option>`).join('')

/**
 * Public self-registration form. Reached from a button on the Unified
 * Technologies website; no login, no password for the client.
 */
export function signupPage(opts: SignupOpts = {}): string {
  const v = opts.data || {}
  const country = v.country || DEFAULT_COUNTRY

  if (opts.closed) {
    return publicShell(
      'Self-registration closed',
      `<div class="card accent" style="max-width:620px;margin:8px auto;text-align:center">
        <i class="fa-solid fa-lock" style="font-size:26px;color:var(--muted)" aria-hidden="true"></i>
        <h1 style="font-size:1.5rem;margin:16px 0 8px">Self-registration is currently closed</h1>
        <p class="muted">Open self-registration is not available right now. To request your assessment,
        contact Unified Technologies${opts.contactEmail ? ` at <a href="mailto:${esc(opts.contactEmail)}">${esc(opts.contactEmail)}</a>` : ''}.</p>
        <a class="btn btn-ghost" href="/" style="margin-top:10px"><i class="fa-solid fa-arrow-left" aria-hidden="true"></i> Back to the overview</a>
      </div>`,
      { hero: { kicker: '3-Day AI Readiness Assessment', title: 'Self-registration closed' } }
    )
  }

  const dims = DIMENSIONS.map(
    (d) => `<li><i class="fa-solid ${d.icone}" aria-hidden="true"></i><span><strong>${esc(d.nome)}</strong>
      <em>${esc(d.descricao)}</em></span></li>`
  ).join('')

  const form = `<form method="post" action="/start" class="card" novalidate>
    <div class="card-head"><div>
      <h2><i class="fa-solid fa-building-columns" aria-hidden="true"></i> Your organisation</h2>
      <div class="sub">This information identifies your company in the report.</div>
    </div></div>

    ${opts.error ? alertBox('danger', esc(opts.error)) : ''}

    <div class="grid-2">
      <div class="field">
        <label for="razao_social">Legal name <span class="req">*</span></label>
        <input type="text" id="razao_social" name="razao_social" value="${esc(v.razao_social || '')}" required maxlength="180" autocomplete="organization">
      </div>
      <div class="field">
        <label for="website">Website</label>
        <input type="text" id="website" name="website" value="${esc(v.website || '')}" placeholder="https://" maxlength="160" autocomplete="url">
      </div>
      <div class="field">
        <label for="vertical">Industry</label>
        <select id="vertical" name="vertical">
          <option value="">Select…</option>
          ${VERTICAIS_PUBLIC.map((x) => `<option value="${esc(x)}" ${v.vertical === x ? 'selected' : ''}>${esc(x)}</option>`).join('')}
        </select>
      </div>
      <div class="field">
        <label for="tamanho_faixa">Company size (employees)</label>
        <select id="tamanho_faixa" name="tamanho_faixa">
          <option value="">Select…</option>
          ${PORTES_PUBLIC.map((p) => `<option value="${esc(p)}" ${v.tamanho_faixa === p ? 'selected' : ''}>${esc(p)}</option>`).join('')}
        </select>
      </div>
    </div>

    <div class="divider"></div>
    <h3 style="margin-bottom:12px">Location</h3>
    <div class="grid-2">
      <div class="field">
        <label for="country">Country / territory</label>
        <select id="country" name="country">
          ${COUNTRY_NAMES.map((n) => `<option value="${esc(n)}" ${country === n ? 'selected' : ''}>${esc(n)}</option>`).join('')}
        </select>
      </div>
      <div class="field">
        <label for="estado">State / region</label>
        <input type="text" id="estado" name="estado" value="${esc(v.estado || '')}" list="region-list" maxlength="60" placeholder="Florida (FL)">
        <datalist id="region-list">${REGION_OPTIONS}</datalist>
      </div>
      <div class="field">
        <label for="cidade">City</label>
        <input type="text" id="cidade" name="cidade" value="${esc(v.cidade || '')}" maxlength="90" autocomplete="address-level2">
      </div>
      <div class="field">
        <label for="postal_code">ZIP / postal code</label>
        <input type="text" id="postal_code" name="postal_code" value="${esc(v.postal_code || '')}" maxlength="20" autocomplete="postal-code">
      </div>
    </div>

    <div class="divider"></div>
    <h3 style="margin-bottom:12px">Who will answer the questionnaire</h3>
    <div class="grid-2">
      <div class="field">
        <label for="responsavel_nome">Full name <span class="req">*</span></label>
        <input type="text" id="responsavel_nome" name="responsavel_nome" value="${esc(v.responsavel_nome || '')}" required maxlength="120" autocomplete="name">
      </div>
      <div class="field">
        <label for="responsavel_email">Work e-mail <span class="req">*</span></label>
        <input type="email" id="responsavel_email" name="responsavel_email" value="${esc(v.responsavel_email || '')}" required maxlength="160" autocomplete="email">
        <span class="hint">We send the questionnaire link to this address.</span>
      </div>
    </div>

    <div class="field" style="margin-top:6px">
      <label style="display:flex;gap:10px;align-items:flex-start;font-weight:500">
        <input type="checkbox" name="consent" value="1" required ${v.consent ? 'checked' : ''} style="width:auto;margin-top:3px">
        <span>I agree that Unified Technologies may use these details to send the assessment link and prepare the report.</span>
      </label>
    </div>

    <!-- Honeypot: real visitors never see or fill this field. -->
    <div style="position:absolute;left:-9999px;top:auto;width:1px;height:1px;overflow:hidden" aria-hidden="true">
      <label for="empresa_aux">Do not fill this field</label>
      <input type="text" id="empresa_aux" name="empresa_aux" tabindex="-1" autocomplete="off">
    </div>

    <div class="divider"></div>
    <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">
      <button class="btn" type="submit"><i class="fa-solid fa-paper-plane" aria-hidden="true"></i> Send me the questionnaire</button>
      <span class="small muted">Takes about 30 minutes · answers save automatically</span>
    </div>
  </form>`

  const intro = `<aside>
    <section class="card accent">
      <div class="card-head"><div>
        <h2 style="font-size:1.15rem;margin:0">What happens next</h2>
        <div class="sub" style="font-size:0.86rem;margin-top:8px">
          We create your assessment and e-mail you a unique link to the questionnaire — no account, no password.
        </div>
      </div></div>
      <div class="signup-facts">
        <div><strong>7</strong><span>dimensions</span></div>
        <div><strong>23</strong><span>questions</span></div>
        <div><strong>~30</strong><span>minutes</span></div>
        <div><strong>L0–L4</strong><span>model</span></div>
      </div>
      <div class="divider"></div>
      <h3 style="font-size:0.8rem;text-transform:uppercase;letter-spacing:1.2px;color:var(--muted)">The seven dimensions</h3>
      <ul class="signup-dims">${dims}</ul>
    </section>
    <p class="small muted" style="margin-top:14px">
      <i class="fa-solid fa-lock" aria-hidden="true"></i>
      Your answers are visible only to Unified Technologies and your organisation.
    </p>
  </aside>`

  return publicShell('Start your assessment', `<div class="signup-grid">${intro}${form}</div>`, {
    hero: {
      kicker: 'Registration',
      title: 'Measure your organisation’s AI maturity',
      lede:
        'A structured diagnosis across seven dimensions of AI readiness. Fill in the details below and we will send the questionnaire link to your e-mail.',
      breadcrumb: '<a href="/">Overview</a> / Registration',
    },
    wide: true,
  })
}

/** Confirmation shown right after a successful self-registration. */
export function signupDonePage(opts: {
  empresa: string
  email: string
  link: string
  expiraEm: string
  sent: boolean
  detail?: string
}): string {
  const mailBlock = opts.sent
    ? `<p>We have e-mailed the questionnaire link to <strong>${esc(opts.email)}</strong>.
       It is valid until <strong>${esc(opts.expiraEm)}</strong>.</p>`
    : `<p class="small muted">Automatic delivery is not available at the moment, so please use the link below.
       It is valid until <strong>${esc(opts.expiraEm)}</strong>.</p>`

  return publicShell(
    'Registration received',
    `<div class="card" style="max-width:640px;margin:36px auto">
      <div style="text-align:center;margin-bottom:18px">
        <i class="fa-solid fa-circle-check" style="font-size:34px;color:#8ab520" aria-hidden="true"></i>
        <h1 style="font-size:23px;margin:12px 0 6px">Registration received</h1>
        <p class="muted" style="margin:0">${esc(opts.empresa)}</p>
      </div>
      ${alertBox('ok', mailBlock)}
      ${
        opts.sent
          ? ''
          : `<div class="link-box" style="margin-top:14px">
              <i class="fa-solid fa-link" aria-hidden="true"></i>
              <input type="text" id="signup-link" value="${esc(opts.link)}" readonly aria-label="Questionnaire link">
              <button class="btn btn-sm btn-ghost" type="button" data-copy="signup-link"><i class="fa-regular fa-copy" aria-hidden="true"></i> Copy</button>
            </div>`
      }
      <div class="divider"></div>
      <p class="small">
        Open the link in the same browser to answer straight away. Your answers are saved automatically, so you can
        close the page and come back later until you submit. As soon as you submit, the report is generated —
        maturity index, seven-dimension scorecard, current × target radar, prioritised initiatives and a 90-day plan.
      </p>
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:16px">
        <a class="btn" href="${esc(opts.link)}"><i class="fa-solid fa-arrow-right" aria-hidden="true"></i> Open the questionnaire</a>
      </div>
      <p class="small muted" style="margin-top:18px">
        Didn't receive the e-mail? Check the spam folder, then request a new link by replying to
        Unified Technologies. Each link is unique and expires on the date above.
      </p>
    </div>
    <script>
      document.addEventListener('click', function(e){
        var b = e.target.closest('[data-copy]');
        if (!b) return;
        var el = document.getElementById(b.getAttribute('data-copy'));
        if (!el) return;
        el.select();
        navigator.clipboard.writeText(el.value).then(function(){
          var old = b.innerHTML; b.innerHTML = '<i class="fa-solid fa-check"></i> Copied';
          setTimeout(function(){ b.innerHTML = old; }, 1600);
        });
      });
    </script>`
  )
}
