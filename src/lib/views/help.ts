import { esc } from '../util'
import { adminShell, badge } from './layout'

export type HelpOpts = {
  admin: { nome: string; email: string }
  mailConfigured: boolean
  ttlDays: number
  demoToken: string | null
  baseUrl: string
}

const STEP = (n: number, titulo: string, corpo: string, acoes = '') => `
<div class="help-step">
  <div class="help-num">${n}</div>
  <div>
    <h3>${titulo}</h3>
    <div class="help-body">${corpo}</div>
    ${acoes ? `<div class="help-actions">${acoes}</div>` : ''}
  </div>
</div>`

export function helpPage(o: HelpOpts): string {
  const conteudo = `
<section class="card" style="margin-bottom:18px">
  <div class="card-head"><div>
    <h2>How to use the system — a 5-step guide</h2>
    <div class="sub">From registering the client to delivering the report. The first client takes about 5 minutes.</div>
  </div></div>

  ${STEP(
    1,
    'Sign in as administrator',
    `Go to <span class="mono">/admin/login</span> and use the e-mail <strong>${esc(o.admin.email)}</strong>.
     ${o.mailConfigured ? '' : 'The initial password is a first-access one — change it under <a href="/admin/settings#access">Settings</a>.'}
     There is no user sign-up screen: the administrator is the <strong>only profile with a login</strong>, created automatically on first run.
     If you need more administrators, contact the application's technical owner.`,
    `<a class="btn btn-sm btn-ghost" href="/admin/settings#access">Change my password</a>`
  )}

  ${STEP(
    2,
    'Register the client — or let the prospect self-register',
    `Two paths, same result. <strong>Option A (manual):</strong> under <strong>New client</strong>, provide the legal name, industry,
     company size and — most importantly — the <strong>name and e-mail of the contact</strong>. That is the address the invitation goes to.
     <strong>Option B (self-registration):</strong> the prospect fills in the public form at
     <span class="mono">/start</span> and the assessment is created automatically, with the link e-mailed to them.
     Either way the system creates the assessment, generates a unique link and (if delivery is configured) sends the e-mail straight away.
     Without delivery configured, the link appears on screen with a <em>Copy</em> button — you send it manually.`,
    `<a class="btn btn-sm" href="/admin/clients/new"><i class="fa-solid fa-user-plus" aria-hidden="true"></i> Register client</a>
     <a class="btn btn-sm btn-ghost" href="/start" target="_blank" rel="noopener">Open the public form</a>
     <a class="btn btn-sm btn-ghost" href="/admin/settings#signup">Self-registration settings</a>`
  )}

  ${STEP(
    3,
    'Configure e-mail delivery (once)',
    `Under <a href="/admin/settings#email">Settings → E-mail delivery</a>, enter the Resend API key (recommended) or SendGrid,
     the verified sender and the link validity (${o.ttlDays} days).
     Use the <em>Test</em> button to confirm the e-mail arrives.
     ${o.mailConfigured ? badge('Delivery configured', 'ok') : badge('Not configured yet', 'warn')}`
  )}

  ${STEP(
    4,
    'The client answers through the link (no password)',
    `The client opens the link in the browser, answers the 7 dimensions (~30 min) and the responses are
     <strong>saved automatically</strong> — they can close and come back later, until they submit.
     In the last step they review outstanding items and declare the 12-month targets per dimension.
     There is nothing to fill in about initiatives: the method generates them.`
  )}

  ${STEP(
    5,
    'The report is generated immediately',
    `On submit, the system calculates the index, builds the results table for the 7 dimensions, the current × target radar,
     the AI Maturity Index, the scorecard of the seven dimensions, the current × target radar, the initiative portfolio
     (business transformation + AI enabling) and the AI Transformation Roadmap. The client sees and downloads it as PDF/XLSX;
     you follow everything on the <a href="/admin">Dashboard</a>, with a full base export.
     To correct answers after submission, use <em>Reopen questionnaire</em> on the client record — that generates a new report version and preserves the previous one.`,
    `<a class="btn btn-sm btn-ghost" href="/admin"><i class="fa-solid fa-gauge-high" aria-hidden="true"></i> Open the dashboard</a>`
  )}
</section>

<div class="grid-2" style="align-items:start;gap:18px">
  <section class="card">
    <div class="card-head"><div><h2>Frequently asked questions</h2></div></div>
    <div class="faq">
      <details open>
        <summary>Can a prospect start the assessment without me doing anything?</summary>
        <p>Yes. Point them at <span class="mono">/start</span> — or embed the ready-made button from
        <a href="/admin/settings#signup">Settings → Public self-registration</a> on the Unified Technologies website.
        They fill in the form, receive the link by e-mail and the assessment appears on your dashboard under actor
        <span class="mono">self-signup</span>. You can switch self-registration off at any time, and the form is protected
        against duplicate e-mails, bots and repeated submissions from the same network.</p>
      </details>
      <details>
        <summary>Does the client need to create an account or password?</summary>
        <p>No. Access is through a <strong>unique tokenised link</strong> that expires in ${o.ttlDays} days.
        The link opens only that company's assessment. Whoever holds the link answers; nobody else sees the data.</p>
      </details>
      <details>
        <summary>How do I change the recipient's e-mail?</summary>
        <p>On the client record, choose <em>Edit</em> and change “Contact → E-mail”. Then use <em>Resend link</em>
        to send a new invitation — the previous link is invalidated automatically.</p>
      </details>
      <details>
        <summary>The client lost the e-mail. Now what?</summary>
        <p>Open the client record and click <em>Resend link</em>. A new token is generated and the old one stops working.
        You can also copy the link and send it over any other channel.</p>
      </details>
      <details>
        <summary>Can I correct answers after submission?</summary>
        <p>Yes, using <em>Reopen questionnaire</em>. The client can edit again and, on resubmission, report version v2 is created.
        v1 remains accessible in the history — nothing is overwritten.</p>
      </details>
      <details>
        <summary>Does deleting a client erase the data?</summary>
        <p>No. Deletion is <strong>logical</strong>: the client disappears from the listings, but clients, responses and reports
        remain in the database for auditing. The XLSX/CSV export guarantees portability of the base.</p>
      </details>
      <details>
        <summary>How is the index calculated?</summary>
        <p>Of the 35 questions, 9 capture business outcomes and are <strong>not scored</strong>; 23 measure maturity and
        3 are hybrid — scored and keeping the evidence text. Each dimension's level is the <strong>mean</strong> of its
        scored answers on the 1–5 scale (1 Initial, 2 Emerging, 3 Defined, 4 Managed, 5 Optimized).
        The AI Maturity Index is the <strong>weighted</strong> mean of the seven dimensions (Use Cases 20%; Strategy,
        Data, Technology and Security 15% each; People and Economics 10% each). The gap is the declared target minus
        the current level, and each initiative is scored on seven weighted criteria to a 0–100 mark, classified
        <strong>P0</strong> (critical foundation) to <strong>P4</strong> (deferred).</p>
      </details>
      <details>
        <summary>How do I export the data?</summary>
        <p>On the dashboard: <em>Export XLSX</em> (4 sheets: clients, responses, indexes, initiatives) or
        <span class="mono">/admin/export/clients.csv</span>. Every report also offers PDF and XLSX export of the results table.</p>
      </details>
    </div>
  </section>

  <section class="card">
    <div class="card-head"><div><h2>Try the flow now</h2>
      <div class="sub">Open an existing assessment link to see the client experience.</div></div></div>
    ${
      o.demoToken
        ? `<div class="link-box" style="margin-bottom:12px">
            <i class="fa-solid fa-link" aria-hidden="true"></i>
            <input type="text" id="demo-link" value="${esc(o.baseUrl)}/a/${esc(o.demoToken)}" readonly aria-label="Test link">
            <button class="btn btn-sm btn-ghost" type="button" data-copy="demo-link"><i class="fa-regular fa-copy" aria-hidden="true"></i> Copy</button>
          </div>
          <a class="btn btn-sm" href="/a/${esc(o.demoToken)}" target="_blank" rel="noopener">
            <i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i> Open the client questionnaire
          </a>`
        : `<p class="small muted">No client registered yet. Register one to generate a test link.</p>`
    }
    <div class="divider"></div>
    <h3 style="font-size:13px;margin-bottom:8px">System map</h3>
    <table class="data" style="font-size:12.5px">
      <tbody>
        <tr><td class="mono">/admin/login</td><td>Administrator sign-in</td></tr>
        <tr><td class="mono">/admin</td><td>KPIs, clients and exports</td></tr>
        <tr><td class="mono">/start</td><td>Public self-registration (no login)</td></tr>
        <tr><td class="mono">/admin/clients/new</td><td>Registration + link generation</td></tr>
        <tr><td class="mono">/admin/clients/:id</td><td>Record, responses, reports and actions</td></tr>
        <tr><td class="mono">/a/:token</td><td>Client questionnaire (no login)</td></tr>
        <tr><td class="mono">/a/:token/report</td><td>Client report (PDF/XLSX)</td></tr>
        <tr><td class="mono">/admin/settings</td><td>Admin password, e-mail delivery and self-registration</td></tr>
      </tbody>
    </table>
  </section>
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

  return adminShell(
    {
      title: 'How to use',
      subtitle: 'Practice guide',
      active: '/admin/help',
      admin: o.admin,
      actions: `<a class="btn btn-sm" href="/admin/clients/new"><i class="fa-solid fa-plus" aria-hidden="true"></i> New client</a>`,
    },
    conteudo
  )
}
