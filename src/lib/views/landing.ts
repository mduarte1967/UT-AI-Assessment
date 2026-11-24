import { DIMENSIONS } from '../questions'
import { esc } from '../util'
import { publicShell } from './layout'

export type LandingOpts = {
  /** Self-registration switched on by the administrator. */
  open?: boolean
  contactEmail?: string
}

const STEPS = [
  {
    n: '1',
    title: 'Register your organisation',
    body: 'Fill in the short form with your company details and the contact of the person who will answer. No account and no password — you receive a unique link by e-mail.',
  },
  {
    n: '2',
    title: 'Answer the seven dimensions',
    body: 'Around 23 questions with anchors for each score from 1 to 5. It takes about 30 minutes and every answer is saved automatically, so you can pause and come back.',
  },
  {
    n: '3',
    title: 'Receive the maturity report',
    body: 'As soon as you submit, the report is generated: maturity index, scorecard for the seven dimensions, current × target radar, prioritised initiatives and a 90-day plan.',
  },
]

const DELIVERABLES = [
  ['fa-gauge-high', 'Maturity index', 'A single weighted score from 0.0 to 5.0, with the consolidated maturity level (L0–L4).'],
  ['fa-table-list', 'Scorecard for the seven dimensions', 'Current level, 12-month target, gap and priority (Critical, High, Medium, Low) for each dimension.'],
  ['fa-chart-simple', 'Current × target radar', 'A visual comparison between where you are today and where the organisation intends to be.'],
  ['fa-lightbulb', 'Prioritised initiatives', 'Your candidate initiatives scored by gap and urgency, each with a recommended next step.'],
  ['fa-calendar-check', '90-day plan', 'The same initiatives distributed across three horizons: 0–30, 31–60 and 61–90 days.'],
  ['fa-file-arrow-down', 'Report in HTML, PDF and XLSX', 'Read it online or download it for the board — every submission becomes a new report version.'],
]

export function landingPage(opts: LandingOpts = {}): string {
  const open = opts.open !== false
  const dims = DIMENSIONS.map(
    (d, i) => `<article class="ut-card dim-card">
      <div class="dim-ico"><i class="fa-solid ${esc(d.icone)}" aria-hidden="true"></i></div>
      <div class="num">D${i + 1}</div>
      <h3>${esc(d.nome)}</h3>
      <p>${esc(d.descricao)}</p>
      <div class="lvl-scale" aria-hidden="true">
        <span>L0</span>
        <i class="on"></i><i class="on"></i><i></i><i></i>
        <span>L4</span>
      </div>
    </article>`
  ).join('')

  const steps = STEPS.map(
    (s) => `<article class="ut-card step-card">
      <div class="num">${s.n}</div>
      <h3>${esc(s.title)}</h3>
      <p>${esc(s.body)}</p>
    </article>`
  ).join('')

  const deliverables = DELIVERABLES.map(
    ([icon, title, body]) => `<div class="deliverable">
      <i class="fa-solid ${icon}" aria-hidden="true"></i>
      <div><strong>${esc(title)}</strong><span>${esc(body)}</span></div>
    </div>`
  ).join('')

  const cta = open
    ? `<a class="btn btn-accent btn-lg" href="/start"><i class="fa-solid fa-arrow-right" aria-hidden="true"></i> Start the assessment</a>`
    : `<a class="btn btn-accent btn-lg" href="mailto:${esc(opts.contactEmail || 'ai@unifiedtech.com')}"><i class="fa-regular fa-envelope" aria-hidden="true"></i> Request your assessment</a>`

  const body = `
<section class="page-hero">
  <div class="container">
    <div class="hero-split">
      <div>
        <span class="kicker">3-Day AI Readiness Assessment</span>
        <h1>Know exactly where your organisation stands on AI — in three days.</h1>
        <p class="lede">A structured diagnosis across seven dimensions of AI readiness, scored on a
        five-level maturity model. From registration to a board-ready report with a scorecard,
        a radar chart and a 90-day plan.</p>
        <div class="hero-actions">
          ${cta}
          <a class="btn btn-ghost-light btn-lg" href="#how-it-works">How it works</a>
        </div>
        <div class="hero-stats">
          <div><strong>7</strong><span>dimensions</span></div>
          <div><strong>23</strong><span>questions</span></div>
          <div><strong>~30 min</strong><span>to complete</span></div>
          <div><strong>L0–L4</strong><span>maturity model</span></div>
        </div>
      </div>
      <aside class="hero-panel">
        <h3>The path in three steps</h3>
        <ol>
          <li>Register your organisation — no account, no password.</li>
          <li>Answer the questionnaire at your own pace, saved automatically.</li>
          <li>Submit and receive the maturity report immediately.</li>
        </ol>
        <div class="foot"><i class="fa-solid fa-lock" aria-hidden="true"></i>
          Your answers are visible only to Unified Technologies and your organisation.</div>
      </aside>
    </div>
  </div>
</section>

<section class="ut-section alt" id="dimensions">
  <div class="container">
    <div class="ut-head">
      <span class="kicker">The model</span>
      <h2>Seven dimensions of AI readiness</h2>
      <p>Every dimension is measured from level L0 (absent) to L4 (scaled and continuously
      improved). The dimension level is the average of its answers, always rounded down —
      no inflation.</p>
    </div>
    <div class="ut-grid-3">${dims}</div>
  </div>
</section>

<section class="ut-section" id="how-it-works">
  <div class="container">
    <div class="ut-head">
      <span class="kicker">How it works</span>
      <h2>From first contact to a decision-ready report</h2>
      <p>No installation, no licence, no long consultancy cycle. The assessment runs
      entirely online and the report is generated the moment you submit.</p>
    </div>
    <div class="ut-grid-3">${steps}</div>
  </div>
</section>

<section class="ut-section alt" id="deliverables">
  <div class="container">
    <div class="grid-2" style="gap:48px;align-items:center">
      <div>
        <span class="kicker">What you receive</span>
        <h2 style="font-size:1.85rem">A report your board can act on</h2>
        <p class="muted">The report is written for decision-makers: no dashboards to interpret,
          no raw questionnaire. It states the current level, the gap to the 12-month target
          and what to do next, in order.</p>
        <div class="ut-card navy" style="margin-top:26px">
          <div class="num" style="color:var(--lime)">Scoring method</div>
          <h3>Transparent by design</h3>
          <p>Each dimension's level is the floor of the mean of its answers. The overall index is
          shown on a 0–5 scale so it can be compared across units and over time. Priority comes
          from the gap between current and target, weighted by urgency — with automatic floors:
          any L0 dimension is always Critical.</p>
        </div>
      </div>
      <div class="card" style="padding:30px 28px">
        ${deliverables}
      </div>
    </div>
  </div>
</section>

<section class="cta-band">
  <div class="container">
    <span class="kicker" style="color:var(--lime)">Ready to start</span>
    <h2>Three days from now, you will know where you stand.</h2>
    <p>Register your organisation and receive the questionnaire link by e-mail. Nothing to
    install, no cost to start.</p>
    ${cta}
    <p class="small" style="margin:22px 0 0;color:rgba(255,255,255,.6)">
      Questions? Write to <a href="mailto:${esc(opts.contactEmail || 'ai@unifiedtech.com')}"
      style="color:var(--lime)">${esc(opts.contactEmail || 'ai@unifiedtech.com')}</a>
    </p>
  </div>
</section>`

  return publicShell('3-Day AI Readiness Assessment', body, { wide: true })
}
