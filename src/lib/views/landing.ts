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
    title: 'Answer 35 questions across the seven dimensions',
    body: 'Maturity questions use five anchors per dimension, so you score against evidence rather than perception. It takes about 30 minutes and every answer is saved automatically, so you can pause and come back.',
  },
  {
    n: '3',
    title: 'Receive the transformation roadmap',
    body: 'On submit the report is generated: business outcome map, weighted AI Maturity Index, scorecard of the seven dimensions, current × target radar, and an initiative portfolio split into business transformation and AI enabling initiatives, prioritised P0–P4.',
  },
]

const DELIVERABLES = [
  ['fa-map-location-dot', 'Business outcome map', 'The objectives, KPIs and constraints you declare, translated into the priorities the plan serves.'],
  ['fa-gauge-high', 'AI Maturity Index', 'A single weighted score on the 1–5 scale (Strategy 15%, Use Cases 20%, Data 15%, Technology 15%, Security 15%, People 10%, Economics 10%).'],
  ['fa-table-list', 'Scorecard for the seven dimensions', 'Current level, framework benchmark, gap, weighted gap and P0–P4 priority for each dimension.'],
  ['fa-chart-simple', 'Current × target radar', 'A visual comparison between where you are today and where the organisation intends to be.'],
  ['fa-diagram-project', 'Initiatives, split in two families', 'Business transformation initiatives that deliver results, and AI enabling initiatives that make them possible — each scored on seven criteria and classified P0–P4.'],
  ['fa-file-arrow-down', 'Report in HTML, PDF and XLSX', 'Read it online or download it for the board — every submission becomes a new report version.'],
]

export function landingPage(opts: LandingOpts = {}): string {
  const open = opts.open !== false
  const dims = DIMENSIONS.map(
    (d, i) => `<article class="ut-card dim-card">
      <div class="dim-ico"><i class="fa-solid ${esc(d.icone)}" aria-hidden="true"></i></div>
      <div class="num">D${i + 1}</div>
      <h3>${esc(d.nome)}</h3>
      <p>${esc(d.objetivo)}</p>
      <div class="lvl-scale" aria-hidden="true">
        <span>1</span>
        <i class="on"></i><i class="on"></i><i></i><i></i><i></i>
        <span>5</span>
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
        <span class="kicker">UT — Outcome-Driven AI Assessment</span>
        <h1>Know exactly where your organisation stands on AI — and what to do next.</h1>
        <p class="lede">A structured diagnosis across seven dimensions of AI maturity, scored 1–5 against
        evidence. From registration to a board-ready report with the business outcome map, the maturity
        scorecard, a radar chart and an initiative portfolio classified P0–P4.</p>
        <div class="hero-actions">
          ${cta}
          <a class="btn btn-ghost-light btn-lg" href="#how-it-works">How it works</a>
        </div>
        <div class="hero-stats">
          <div><strong>7</strong><span>dimensions</span></div>
          <div><strong>35</strong><span>questions</span></div>
          <div><strong>~30 min</strong><span>to complete</span></div>
          <div><strong>P0–P4</strong><span>priority model</span></div>
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
      <h2>Seven dimensions of AI maturity</h2>
      <p>Every dimension is measured from level 1 (Initial) to level 5 (Optimized) against its
      own maturity matrix. The dimension level is the mean of the evidence collected from its
      scored questions — not a single perception score.</p>
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
          no raw questionnaire. It states the current level, the gap to the framework benchmark
          and what to do next, in order.</p>
        <div class="ut-card navy" style="margin-top:26px">
          <div class="num" style="color:var(--lime)">Scoring method</div>
          <h3>Transparent by design</h3>
          <p>Of the 35 questions, 9 capture business outcomes (not scored), 23 measure maturity and
          3 are hybrid — scored and keeping the evidence. Each dimension's level is the mean of its
          scored answers; the AI Maturity Index is the weighted mean of the seven dimensions. Every
          initiative is scored on seven weighted criteria to a 0–100 mark and classified P0 to P4,
          with P0 reserved for critical foundations.</p>
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
    <h2>The path from assessment to a transformation roadmap</h2>
    <p>Register your organisation and receive the questionnaire link by e-mail. Nothing to
    install, no cost to start.</p>
    ${cta}
    <p class="small" style="margin:22px 0 0;color:rgba(255,255,255,.6)">
      Questions? Write to <a href="mailto:${esc(opts.contactEmail || 'ai@unifiedtech.com')}"
      style="color:var(--lime)">${esc(opts.contactEmail || 'ai@unifiedtech.com')}</a>
    </p>
  </div>
</section>`

  return publicShell('UT — Outcome-Driven AI Assessment', body, { wide: true })
}
