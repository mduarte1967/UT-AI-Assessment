// ─────────────────────────────────────────────────────────────────────────────
// AI Initiative Catalog — IN01 … IN28
//
// Every entry keeps full traceability: dimension → related questions → trigger
// condition → recommended initiative. Two families are distinguished, because a
// roadmap of technology investments is not the same as a roadmap of business
// transformation:
//
//   transformation — delivers a business result directly (concierge, document
//                    intelligence, agentic workflows, predictive decisions…)
//   enabling       — establishes the conditions for those results to happen
//                    (governance, data quality, AI gateway, FinOps, literacy…)
//
// Each initiative is scored on the seven prioritisation criteria and classified
// P0–P4. P0 is a mandatory override: a critical foundation is resolved before
// the initiatives that depend on it, regardless of its individual ROI.
// ─────────────────────────────────────────────────────────────────────────────

import type { DimKey } from './questions'
import { DIM_MAP } from './questions'
import type { Priority, PriorityFactors, ScoreRow } from './scoring'
import { classifyPriority, priorityScore } from './scoring'

export type Category = 'transformation' | 'enabling'

export type InitiativeDef = {
  /** Catalog id — IN01 … IN28. */
  id: string
  dimensao: DimKey
  /** Question refs that produce the evidence for this initiative. */
  refs: string[]
  nome: string
  categoria: Category
  trigger: string
  problema: string
  beneficio: string
  /** Business outcome the initiative is meant to move. */
  outcome: string
  kpi: string
  proximo_passo: string
  /** Critical prerequisite: becomes P0 when the dimension is still immature. */
  foundation: boolean
  factors: PriorityFactors
  /** Extra eligibility test beyond the dimension gap. */
  gate?: (ctx: SelectionContext) => boolean
}

export type SelectionContext = {
  scorecard: ScoreRow[]
  /** Maturity level per question ref (null when the answer carries no evidence). */
  levelsByRef: Record<string, number | null>
}

const lvl = (ctx: SelectionContext, ref: string): number | null => {
  const v = ctx.levelsByRef[ref]
  return v === undefined ? null : v
}

// ── Catalog ─────────────────────────────────────────────────────────────────

export const INITIATIVE_CATALOG: InitiativeDef[] = [
  // ── Strategy ───────────────────────────────────────────────────────────────
  {
    id: 'IN01',
    dimensao: 'strategy',
    refs: ['STR01', 'STR02', 'STR03', 'STR04', 'STR05'],
    nome: 'AI Strategy & Transformation Roadmap',
    categoria: 'enabling',
    trigger: 'Business objectives not translated into AI priorities',
    problema: 'Declared business outcomes are not linked to an AI agenda, so effort follows enthusiasm instead of value.',
    beneficio: 'A single roadmap that connects each business outcome to the AI capabilities and investment it requires.',
    outcome: 'Strategic alignment',
    kpi: 'Board-approved roadmap · % of AI investment traceable to a declared outcome',
    proximo_passo: 'Translate the stated outcomes into an outcome map and rank the AI capabilities each one needs.',
    foundation: false,
    factors: { impacto: 4, alinhamento: 5, valor: 4, viabilidade: 4, tempo: 3, criticidade: 3 },
  },
  {
    id: 'IN02',
    dimensao: 'strategy',
    refs: ['STR04', 'STR05'],
    nome: 'AI Portfolio Governance',
    categoria: 'enabling',
    trigger: 'Lack of sponsorship, ownership or strategic alignment',
    problema: 'No named executive owner and no forum where the AI portfolio is decided, so priorities drift.',
    beneficio: 'Accountable sponsorship, a decision forum and one ranked portfolio instead of competing requests.',
    outcome: 'Executive sponsorship and measurable AI objectives',
    kpi: 'Sponsor named · portfolio reviewed quarterly · funded initiatives with owner and KPI',
    proximo_passo: 'Name the executive sponsor, seat a steering group and give it a written decision charter.',
    foundation: true,
    factors: { impacto: 4, alinhamento: 5, valor: 3, viabilidade: 5, tempo: 4, criticidade: 5 },
  },

  // ── Use Cases ──────────────────────────────────────────────────────────────
  {
    id: 'IN03',
    dimensao: 'usecases',
    refs: ['USC01', 'USC02', 'USC03', 'USC04', 'USC05'],
    nome: 'AI Use Case Discovery & Prioritization',
    categoria: 'enabling',
    trigger: 'Relevant business problems without a validated AI portfolio',
    problema: 'Opportunities identified in interviews are never consolidated, scored or sequenced.',
    beneficio: 'A single scored backlog with value, feasibility and risk visible side by side.',
    outcome: 'AI opportunity portfolio',
    kpi: 'Backlog live · 100% of active work traceable to a scored item',
    proximo_passo: 'Consolidate the declared pain points into one backlog and score the first twenty.',
    foundation: false,
    factors: { impacto: 4, alinhamento: 4, valor: 4, viabilidade: 5, tempo: 4, criticidade: 2 },
  },
  {
    id: 'IN04',
    dimensao: 'usecases',
    refs: ['USC01', 'USC04'],
    nome: 'Intelligent Process Automation',
    categoria: 'transformation',
    trigger: 'High manual effort, operational delays or rework',
    problema: 'Repetitive, error-prone work consumes capacity and pushes cycle time beyond what the business needs.',
    beneficio: 'Automated handling of the repetitive steps, with measurable reduction in cycle time and error rate.',
    outcome: 'Operational efficiency',
    kpi: 'Processing time, cost per transaction, error rate, hours released',
    proximo_passo: 'Pick the highest-volume process named in the interview and instrument its current baseline.',
    foundation: false,
    factors: { impacto: 5, alinhamento: 4, valor: 5, viabilidade: 4, tempo: 4, criticidade: 2 },
  },
  {
    id: 'IN05',
    dimensao: 'usecases',
    refs: ['USC02'],
    nome: 'AI Concierge & Customer Service',
    categoria: 'transformation',
    trigger: 'Repetitive inquiries and service experience gaps',
    problema: 'High volumes of repetitive contacts degrade response time and customer satisfaction.',
    beneficio: 'Round-the-clock first-line resolution with consistent answers and escalation only when needed.',
    outcome: 'Customer experience',
    kpi: 'First-contact resolution, containment rate, CSAT, average handling time',
    proximo_passo: 'Baseline the top twenty contact reasons and the share that a grounded assistant can resolve.',
    foundation: false,
    factors: { impacto: 5, alinhamento: 4, valor: 5, viabilidade: 4, tempo: 5, criticidade: 2 },
  },
  {
    id: 'IN06',
    dimensao: 'usecases',
    refs: ['USC03', 'DAT01'],
    nome: 'Enterprise Knowledge Assistant / RAG',
    categoria: 'transformation',
    trigger: 'Fragmented knowledge and inefficient information retrieval',
    problema: 'Answers are locked in documents and spread across repositories, so people search instead of deciding.',
    beneficio: 'Grounded answers with citations over internal knowledge, available where the decision is made.',
    outcome: 'Productivity and decision speed',
    kpi: 'Time to answer, search success rate, hours released, answer accuracy on a fixed test set',
    proximo_passo: 'Index the most-consulted document sets and validate answer quality against real questions.',
    foundation: false,
    factors: { impacto: 5, alinhamento: 4, valor: 5, viabilidade: 4, tempo: 4, criticidade: 2 },
    gate: (ctx) => {
      const d = lvl(ctx, 'DAT03')
      return d === null || d <= 3
    },
  },
  {
    id: 'IN07',
    dimensao: 'usecases',
    refs: ['USC03', 'DAT02'],
    nome: 'Predictive AI & Decision Intelligence',
    categoria: 'transformation',
    trigger: 'Forecasting, analytical or decision-making limitations',
    problema: 'Decisions that depend on forecasts or scoring are made on intuition or stale spreadsheets.',
    beneficio: 'Quantified predictions embedded in the decision, with accuracy tracked over time.',
    outcome: 'Decision quality and forecast accuracy',
    kpi: 'Forecast accuracy, decision cycle time, variance against plan',
    proximo_passo: 'Identify the decision with the highest economic exposure and the data available to model it.',
    foundation: false,
    factors: { impacto: 5, alinhamento: 4, valor: 4, viabilidade: 3, tempo: 3, criticidade: 2 },
    gate: (ctx) => {
      const d = lvl(ctx, 'DAT02')
      return d !== null && d >= 2
    },
  },
  {
    id: 'IN08',
    dimensao: 'usecases',
    refs: ['USC04', 'TEC02', 'SEC04'],
    nome: 'Agentic AI & Workflow Orchestration',
    categoria: 'transformation',
    trigger: 'Multi-step workflows suitable for controlled automation',
    problema: 'Multi-step processes need a human to move data between systems and make routine judgements.',
    beneficio: 'Orchestrated execution across systems with bounded actions and a human approval where it matters.',
    outcome: 'Operational efficiency and service availability',
    kpi: 'End-to-end cycle time, autonomous completion rate, exception rate',
    proximo_passo: 'Select one bounded multi-step workflow and define the actions an agent may take unattended.',
    foundation: false,
    factors: { impacto: 5, alinhamento: 4, valor: 4, viabilidade: 2, tempo: 3, criticidade: 4 },
    gate: (ctx) => {
      const integ = lvl(ctx, 'TEC02')
      const ctrl = lvl(ctx, 'SEC04')
      // Only when integration and pre-deployment review already have some footing.
      return (integ === null || integ >= 2) && (ctrl === null || ctrl >= 2)
    },
  },
  {
    id: 'IN09',
    dimensao: 'usecases',
    refs: ['USC01', 'USC03', 'DAT01'],
    nome: 'AI Document Intelligence',
    categoria: 'transformation',
    trigger: 'Document-intensive business processes',
    problema: 'Contracts, claims and forms are read manually, which is slow, inconsistent and hard to audit.',
    beneficio: 'Structured extraction with confidence scores and human review only on the exceptions.',
    outcome: 'Processing time and cost per transaction',
    kpi: 'Documents processed per hour, extraction accuracy, rework rate',
    proximo_passo: 'Quantify the document volume in the priority process and the cost of reading it today.',
    foundation: false,
    factors: { impacto: 5, alinhamento: 3, valor: 5, viabilidade: 4, tempo: 4, criticidade: 2 },
  },

  // ── Data ───────────────────────────────────────────────────────────────────
  {
    id: 'IN10',
    dimensao: 'data',
    refs: ['DAT01', 'DAT02', 'DAT03', 'DAT04', 'DAT05'],
    nome: 'Data Management Assessment',
    categoria: 'enabling',
    trigger: 'Insufficient understanding of data capabilities',
    problema: 'It is not known which data exists, where it lives or whether it is usable for AI.',
    beneficio: 'A factual picture of the data landscape with the dependencies each use case actually has.',
    outcome: 'Data readiness',
    kpi: 'Critical data domains catalogued · owner per domain · quality baseline published',
    proximo_passo: 'Catalogue the sources behind the priority use cases and assign an owner per domain.',
    foundation: false,
    factors: { impacto: 3, alinhamento: 3, valor: 4, viabilidade: 5, tempo: 5, criticidade: 4 },
  },
  {
    id: 'IN11',
    dimensao: 'data',
    refs: ['DAT02', 'DAT04'],
    nome: 'Data Quality & Governance',
    categoria: 'enabling',
    trigger: 'Unreliable data or undefined ownership',
    problema: 'No measurable quality standard and no accountable owner, so every model inherits the defects.',
    beneficio: 'Defined ownership, measurable quality thresholds and defects fixed at the source.',
    outcome: 'Trusted data',
    kpi: 'Data quality score, % of critical domains with owner, defect resolution time',
    proximo_passo: 'Measure completeness, duplication and timeliness on the priority domain and publish the baseline.',
    foundation: true,
    factors: { impacto: 4, alinhamento: 3, valor: 4, viabilidade: 4, tempo: 3, criticidade: 5 },
  },
  {
    id: 'IN12',
    dimensao: 'data',
    refs: ['DAT03', 'DAT05'],
    nome: 'AI-ready Data Platform',
    categoria: 'enabling',
    trigger: 'Fragmented data and limited accessibility',
    problema: 'Each team extracts and reshapes data its own way, producing conflicting numbers and duplicated effort.',
    beneficio: 'One governed path to curated, documented data that AI applications can rely on.',
    outcome: 'Data accessibility',
    kpi: 'Priority domains served through the governed layer · lineage documented · preparation time',
    proximo_passo: 'Publish the priority domain as a curated dataset with documented lineage and permissions.',
    foundation: false,
    factors: { impacto: 4, alinhamento: 3, valor: 4, viabilidade: 3, tempo: 2, criticidade: 4 },
  },
  {
    id: 'IN13',
    dimensao: 'data',
    refs: ['DAT03', 'DAT04', 'DAT05'],
    nome: 'Data Integration & AI Pipelines',
    categoria: 'enabling',
    trigger: 'Data preparation and integration barriers',
    problema: 'Getting data from source to model is a manual project every time, which caps how many use cases can scale.',
    beneficio: 'Repeatable pipelines with freshness guarantees, so new use cases start from a working feed.',
    outcome: 'Data freshness and preparation time',
    kpi: 'Pipeline coverage, data freshness, data preparation time per use case',
    proximo_passo: 'Automate the two pipelines that the lighthouse use cases depend on and monitor their freshness.',
    foundation: false,
    factors: { impacto: 3, alinhamento: 3, valor: 4, viabilidade: 3, tempo: 3, criticidade: 3 },
  },

  // ── Technology ─────────────────────────────────────────────────────────────
  {
    id: 'IN14',
    dimensao: 'tech',
    refs: ['TEC01', 'TEC04', 'TEC05'],
    nome: 'AI Architecture & Infrastructure',
    categoria: 'enabling',
    trigger: 'Architecture gaps preventing AI implementation',
    problema: 'There is no reference architecture, so each initiative invents its own and the estate fragments.',
    beneficio: 'A documented target architecture with the integration and hosting patterns the next use cases will reuse.',
    outcome: 'Technology readiness',
    kpi: 'Reference architecture published · reused by the next initiative',
    proximo_passo: 'Document the architecture of the first live use case as the standard reference for the rest.',
    foundation: false,
    factors: { impacto: 3, alinhamento: 3, valor: 3, viabilidade: 4, tempo: 3, criticidade: 4 },
  },
  {
    id: 'IN15',
    dimensao: 'tech',
    refs: ['TEC02', 'TEC03'],
    nome: 'Enterprise AI Integration Platform',
    categoria: 'enabling',
    trigger: 'Limited application and workflow integration',
    problema: 'Systems exchange information through manual steps, so AI cannot act where the work happens.',
    beneficio: 'Reusable integration and orchestration services that any use case can call.',
    outcome: 'Process automation and integration coverage',
    kpi: 'Integration coverage, deployment time, number of systems reachable through the platform',
    proximo_passo: 'Expose the three systems behind the priority workflow through governed APIs.',
    foundation: false,
    factors: { impacto: 4, alinhamento: 3, valor: 4, viabilidade: 3, tempo: 2, criticidade: 4 },
  },
  {
    id: 'IN16',
    dimensao: 'tech',
    refs: ['TEC04', 'TEC05', 'SEC02'],
    nome: 'Private AI / AI Inference Server',
    categoria: 'enabling',
    trigger: 'Validated sovereignty, latency or deployment requirements',
    problema: 'Data residency, latency or regulatory constraints prevent workloads from running on public endpoints.',
    beneficio: 'Inference inside the required boundary, with predictable latency and no data egress.',
    outcome: 'Deployment flexibility and compliance',
    kpi: 'Workloads meeting residency requirement · p95 latency · egress incidents',
    proximo_passo: 'Confirm which use cases genuinely require in-boundary inference before committing to infrastructure.',
    foundation: false,
    factors: { impacto: 3, alinhamento: 3, valor: 2, viabilidade: 2, tempo: 1, criticidade: 4 },
    // Only surfaced when the organisation declared a real technical constraint.
    gate: (ctx) => {
      const limitation = lvl(ctx, 'TEC04')
      return limitation !== null && limitation <= 2
    },
  },
  {
    id: 'IN17',
    dimensao: 'tech',
    refs: ['TEC01', 'TEC03', 'TEC05'],
    nome: 'Hybrid AI Architecture',
    categoria: 'enabling',
    trigger: 'Validated need for multiple AI execution environments',
    problema: 'Some workloads belong in the cloud and some cannot leave the estate, and today there is no common pattern.',
    beneficio: 'One operating model across cloud, on-premises and edge, with consistent deployment and control.',
    outcome: 'Scalability and deployment flexibility',
    kpi: 'Workloads deployed consistently across environments · deployment time',
    proximo_passo: 'Classify live and planned workloads by environment before designing the hybrid pattern.',
    foundation: false,
    factors: { impacto: 3, alinhamento: 3, valor: 2, viabilidade: 2, tempo: 2, criticidade: 3 },
  },

  // ── Security ───────────────────────────────────────────────────────────────
  {
    id: 'IN18',
    dimensao: 'security',
    refs: ['SEC01'],
    nome: 'Shadow AI Discovery & Management',
    categoria: 'enabling',
    trigger: 'Unmanaged or unauthorized AI usage',
    problema: 'Employees already use external AI tools with company data, and nobody sees which or with what.',
    beneficio: 'Visibility of actual AI usage, with the risky services blocked and safe alternatives offered.',
    outcome: 'Data protection',
    kpi: 'Shadow AI services identified · sanctioned coverage · data-egress incidents',
    proximo_passo: 'Discover actual AI usage from network and identity telemetry before writing the policy.',
    foundation: true,
    factors: { impacto: 4, alinhamento: 4, valor: 4, viabilidade: 4, tempo: 5, criticidade: 5 },
  },
  {
    id: 'IN19',
    dimensao: 'security',
    refs: ['SEC02', 'SEC04'],
    nome: 'AI Governance Framework',
    categoria: 'enabling',
    trigger: 'Missing AI policies, accountability or risk controls',
    problema: 'No acceptable-use policy, no risk classification and no pre-deployment review gate.',
    beneficio: 'Written rules, a risk tier per system and a review that happens before production, not after an incident.',
    outcome: 'Risk reduction and governance coverage',
    kpi: 'Policy published and acknowledged · risk tier per system · review gate on 100% of deployments',
    proximo_passo: 'Publish a short acceptable-use policy and a pre-deployment review checklist, then apply both.',
    foundation: true,
    factors: { impacto: 4, alinhamento: 4, valor: 4, viabilidade: 5, tempo: 5, criticidade: 5 },
  },
  {
    id: 'IN20',
    dimensao: 'security',
    refs: ['SEC03', 'SEC05', 'TEC03'],
    nome: 'AI Security & AI Gateway',
    categoria: 'enabling',
    trigger: 'AI-specific security and policy enforcement gaps',
    problema: 'Model calls are not inspected, so prompt injection, leakage and unsafe output travel unmonitored.',
    beneficio: 'A single enforcement point for policy, logging and inspection across every AI call.',
    outcome: 'AI security and control',
    kpi: 'AI traffic through the gateway · blocked violations · incident detection time',
    proximo_passo: 'Route model calls through a gateway that logs, inspects and enforces policy centrally.',
    foundation: false,
    factors: { impacto: 4, alinhamento: 3, valor: 4, viabilidade: 3, tempo: 3, criticidade: 4 },
  },
  {
    id: 'IN21',
    dimensao: 'security',
    refs: ['SEC03', 'SEC04', 'SEC05', 'USC04'],
    nome: 'Agentic AI Security & Governance',
    categoria: 'enabling',
    trigger: 'Agents requiring controlled access and action boundaries',
    problema: 'Agents that can act on systems need permissions, audit and a stop condition before they are deployed.',
    beneficio: 'Bounded action scope, on-behalf-of identity, full audit trail and a tested kill switch.',
    outcome: 'Autonomy with controlled blast radius',
    kpi: 'Agents with scoped credentials · actions logged · kill switch tested',
    proximo_passo: 'Define the allowed action scope and the audit requirement for each agent before any autonomy.',
    foundation: false,
    factors: { impacto: 4, alinhamento: 3, valor: 3, viabilidade: 3, tempo: 2, criticidade: 5 },
    gate: (ctx) => {
      const review = lvl(ctx, 'SEC04')
      return review !== null && review >= 1
    },
  },

  // ── People ─────────────────────────────────────────────────────────────────
  {
    id: 'IN22',
    dimensao: 'people',
    refs: ['PEO01', 'PEO02'],
    nome: 'AI Literacy & Workforce Enablement',
    categoria: 'enabling',
    trigger: 'Limited AI skills and awareness',
    problema: 'Capability is concentrated in a few enthusiasts, so adoption depends on who happens to be available.',
    beneficio: 'A measured baseline and a role-based curriculum for the teams that will actually use AI.',
    outcome: 'Workforce productivity',
    kpi: 'Baseline literacy score · completion rate · active AI users',
    proximo_passo: 'Measure the literacy baseline and design a hands-on track for the two priority roles.',
    foundation: false,
    factors: { impacto: 4, alinhamento: 3, valor: 4, viabilidade: 5, tempo: 4, criticidade: 3 },
  },
  {
    id: 'IN23',
    dimensao: 'people',
    refs: ['PEO03', 'SEC01', 'SEC02'],
    nome: 'Governed AI Workspace',
    categoria: 'enabling',
    trigger: 'Employee AI demand without approved enterprise tools',
    problema: 'Staff want to use AI, are not given approved tools, and fill the gap with unsanctioned services.',
    beneficio: 'Sanctioned tools with guardrails, so demand is met inside the perimeter instead of outside it.',
    outcome: 'Secure AI adoption',
    kpi: 'Sanctioned tool coverage · shadow usage trend · user satisfaction',
    proximo_passo: 'Publish the approved tool list and enable the tenant and data-protection controls that enforce it.',
    foundation: false,
    factors: { impacto: 4, alinhamento: 3, valor: 4, viabilidade: 4, tempo: 5, criticidade: 4 },
  },
  {
    id: 'IN24',
    dimensao: 'people',
    refs: ['PEO04', 'PEO05'],
    nome: 'AI Adoption & Change Management',
    categoria: 'enabling',
    trigger: 'Workflow transformation and adoption gaps',
    problema: 'Tools arrive without the workflow, targets or incentives being reconsidered, so productivity gains evaporate.',
    beneficio: 'Redesigned workflows with updated targets, so the gain is captured and stays.',
    outcome: 'Measured adoption and workforce transformation',
    kpi: 'Adoption rate · hours released · productivity improvement in redesigned roles',
    proximo_passo: 'Redesign two workflows end to end and update the targets and job descriptions with them.',
    foundation: false,
    factors: { impacto: 4, alinhamento: 3, valor: 4, viabilidade: 4, tempo: 3, criticidade: 3 },
  },

  // ── Economics ──────────────────────────────────────────────────────────────
  {
    id: 'IN25',
    dimensao: 'economics',
    refs: ['ECO01', 'ECO02'],
    nome: 'AI Business Value & ROI Framework',
    categoria: 'enabling',
    trigger: 'Missing quantitative investment justification',
    problema: 'Investments are approved on narrative, with no standard case, cost model or payback requirement.',
    beneficio: 'One template with benefits, costs, ROI and payback, applied to every request before funding.',
    outcome: 'Investment effectiveness',
    kpi: 'Business case coverage · ROI accuracy against realised value',
    proximo_passo: 'Adopt a single business-case template and apply it to the requests already in the queue.',
    foundation: true,
    factors: { impacto: 4, alinhamento: 4, valor: 4, viabilidade: 5, tempo: 4, criticidade: 4 },
  },
  {
    id: 'IN26',
    dimensao: 'economics',
    refs: ['ECO04'],
    nome: 'AI FinOps & Governance',
    categoria: 'enabling',
    trigger: 'Limited visibility and control of AI consumption costs',
    problema: 'Token and infrastructure cost is invisible until the invoice arrives, and cannot be allocated.',
    beneficio: 'Cost per use case and per unit of output, visible monthly and attributable to an owner.',
    outcome: 'Cost optimization',
    kpi: 'Cost per use case · forecast accuracy · consumption variance explained',
    proximo_passo: 'Tag every AI workload and publish a monthly cost report per use case.',
    foundation: false,
    factors: { impacto: 3, alinhamento: 3, valor: 4, viabilidade: 4, tempo: 4, criticidade: 3 },
  },
  {
    id: 'IN27',
    dimensao: 'economics',
    refs: ['ECO05'],
    nome: 'AI Benefits Realization',
    categoria: 'enabling',
    trigger: 'Lack of actual business outcome measurement',
    problema: 'Benefits are claimed at approval and never measured, so the next investment is another guess.',
    beneficio: 'Realised value measured against the original case, feeding the next funding decision.',
    outcome: 'Realized business value',
    kpi: '% of funded initiatives with a benefit review · variance against business case',
    proximo_passo: 'Schedule a benefit review at 90 and 180 days for every funded initiative.',
    foundation: false,
    factors: { impacto: 4, alinhamento: 3, valor: 4, viabilidade: 4, tempo: 3, criticidade: 3 },
  },
  {
    id: 'IN28',
    dimensao: 'economics',
    refs: ['ECO02', 'ECO03', 'USC05'],
    nome: 'AI Proof of Value Program',
    categoria: 'transformation',
    trigger: 'High-potential use cases requiring value validation',
    problema: 'Promising use cases stall because there is no funded, time-boxed way to prove value.',
    beneficio: 'A short, funded cycle that produces a measured result and a go/no-go decision.',
    outcome: 'Validated business case',
    kpi: 'Proofs completed within 90 days · go/no-go decision rate · value validated per proof',
    proximo_passo: 'Fund two proofs with a fixed 90-day window and a pre-agreed success metric.',
    foundation: false,
    factors: { impacto: 5, alinhamento: 4, valor: 5, viabilidade: 5, tempo: 5, criticidade: 2 },
  },
]

/** Catalogue entries grouped by the dimension they belong to. */
export const CATALOG_BY_DIM: Record<string, InitiativeDef[]> = INITIATIVE_CATALOG.reduce(
  (acc, i) => {
    ;(acc[i.dimensao] ||= []).push(i)
    return acc
  },
  {} as Record<string, InitiativeDef[]>
)

// ── Selection & prioritisation ──────────────────────────────────────────────

export type RecommendedInitiative = {
  /** Catalog id (IN01…). */
  id: string
  nome: string
  categoria: Category
  dimensao: DimKey
  dimensaoLabel: string
  refs: string[]
  trigger: string
  problema: string
  beneficio: string
  outcome: string
  kpi: string
  proximo_passo: string
  /** Weighted priority score, 0–100. */
  score: number
  prioridade: Priority
  /** Why this initiative was triggered for this profile. */
  motivo: string
  /** Factors used, exposed for the scorecard table. */
  factors: PriorityFactors & { gap: number }
  bloqueio: string | null
}

export type SelectionOptions = {
  scorecard: ScoreRow[]
  levelsByRef: Record<string, number | null>
  /** Max initiatives in the plan. */
  limit?: number
  /** Max initiatives drawn from one dimension. */
  perDimensionCap?: number
}

const PESO_P: Record<Priority, number> = { P0: 0, P1: 1, P2: 2, P3: 3, P4: 4 }

function motivoFor(row: ScoreRow | undefined, def: InitiativeDef): string {
  if (!row) return def.trigger
  const state =
    row.atual <= 0
      ? 'not assessed'
      : `at ${row.atual.toFixed(1)}/5 (${row.short})`
  if (row.gap <= 0) return `${def.trigger} — declared target already met.`
  return `${def.trigger}. ${row.short} is ${state}, target ${row.meta}/5, gap ${row.gap.toFixed(1)}.`
}

/**
 * Selects and classifies the initiatives for one assessment.
 *
 * Rules, in order:
 *  1. Eligibility — the dimension must have a gap, or still sit at level ≤ 2.
 *  2. Foundation override — a critical prerequisite whose dimension is not yet
 *     established becomes P0 regardless of its computed score.
 *  3. Both families must be represented when eligible, so the client never
 *     receives a purely technological roadmap.
 *  4. Deterministic ordering: priority, then score, then catalogue id.
 */
export function selectInitiatives(opts: SelectionOptions): RecommendedInitiative[] {
  const byDim = new Map(opts.scorecard.map((r) => [r.dimensao, r]))
  const ctx: SelectionContext = { scorecard: opts.scorecard, levelsByRef: opts.levelsByRef }
  const limit = Math.max(6, Math.min(14, opts.limit ?? 10))
  const cap = Math.max(1, Math.min(4, opts.perDimensionCap ?? 3))

  const candidates: RecommendedInitiative[] = []

  for (const def of INITIATIVE_CATALOG) {
    const row = byDim.get(def.dimensao)
    if (!row) continue
    const eligible = row.gap >= 1 || row.atual <= 2
    if (!eligible) continue
    if (def.gate && !def.gate(ctx)) continue

    const gap = row.gap
    const score = priorityScore(def.factors, gap)
    const mandatory = def.foundation && row.atual <= 2
    const prioridade = classifyPriority({ score, mandatoryFoundation: mandatory })

    candidates.push({
      id: def.id,
      nome: def.nome,
      categoria: def.categoria,
      dimensao: def.dimensao,
      dimensaoLabel: DIM_MAP[def.dimensao]?.short || def.dimensao,
      refs: def.refs,
      trigger: def.trigger,
      problema: def.problema,
      beneficio: def.beneficio,
      outcome: def.outcome,
      kpi: def.kpi,
      proximo_passo: def.proximo_passo,
      score,
      prioridade,
      motivo: motivoFor(row, def),
      factors: { ...def.factors, gap },
      bloqueio: null,
    })
  }

  candidates.sort(
    (a, b) => PESO_P[a.prioridade] - PESO_P[b.prioridade] || b.score - a.score || a.id.localeCompare(b.id)
  )

  const chosen: RecommendedInitiative[] = []
  const perDim = new Map<string, number>()
  const has = (id: string) => chosen.some((c) => c.id === id)

  const take = (c: RecommendedInitiative) => {
    if (has(c.id)) return false
    if ((perDim.get(c.dimensao) || 0) >= cap) return false
    perDim.set(c.dimensao, (perDim.get(c.dimensao) || 0) + 1)
    chosen.push(c)
    return true
  }

  // Coverage: at least three enabling and two transformation initiatives, so the
  // roadmap shows both the conditions and the business results.
  const takeFrom = (cat: Category, n: number) => {
    let taken = 0
    for (const c of candidates) {
      if (taken >= n || chosen.length >= limit) break
      if (c.categoria !== cat || has(c.id)) continue
      if (take(c)) taken++
    }
  }
  takeFrom('enabling', 3)
  takeFrom('transformation', 2)

  for (const c of candidates) {
    if (chosen.length >= limit) break
    take(c)
  }

  // Relax the per-dimension cap if the catalog could not fill the plan.
  if (chosen.length < limit) {
    for (const c of candidates) {
      if (chosen.length >= limit) break
      if (has(c.id)) continue
      chosen.push(c)
    }
  }

  const sorted = chosen.sort(
    (a, b) => PESO_P[a.prioridade] - PESO_P[b.prioridade] || b.score - a.score || a.id.localeCompare(b.id)
  )

  // A P0 blocking note: the enabling initiative that must precede this one.
  const firstP0 = sorted.find((c) => c.prioridade === 'P0' && c.categoria === 'enabling')
  for (const c of sorted) {
    if (
      firstP0 &&
      c.id !== firstP0.id &&
      c.categoria === 'transformation' &&
      c.prioridade !== 'P0' &&
      firstP0.dimensao !== c.dimensao
    ) {
      c.bloqueio = `${firstP0.nome} (${firstP0.id})`
    }
  }

  return sorted
}

/** Split for the report: business transformation vs AI enabling. */
export function splitByCategory(items: RecommendedInitiative[]) {
  return {
    transformation: items.filter((i) => i.categoria === 'transformation'),
    enabling: items.filter((i) => i.categoria === 'enabling'),
  }
}

export const CATEGORY_META: Record<Category, { label: string; sub: string; tone: string }> = {
  transformation: {
    label: 'Business transformation initiatives',
    sub: 'Deliver business results directly — customer experience, efficiency, decisions.',
    tone: 'accent',
  },
  enabling: {
    label: 'AI enabling initiatives',
    sub: 'Establish the conditions those results depend on — governance, data, security, FinOps.',
    tone: 'lime',
  },
}

/** Human-readable header for the report. */
export function selectionNote(count: number, index: number, target: number): string {
  return (
    `${count} initiative(s) selected from the Unified Technologies catalogue for a weighted maturity index of ` +
    `${index.toFixed(2)}/5 against a target of ${target.toFixed(2)}/5. ` +
    `Each is scored on the seven prioritisation criteria and classified P0–P4.`
  )
}
