// ─────────────────────────────────────────────────────────────────────────────
// Initiative library + selection engine.
//
// The client never fills in initiatives: the method owns a curated library of
// candidate initiatives, and this engine picks the ones that make sense for a
// given maturity profile. Selection is driven by
//   • the overall index (0–5) — decides which maturity band the organisation is
//     in, and therefore whether it needs foundations, core builds, scaling or
//     optimisation plays;
//   • the gap and priority of each of the seven dimensions — decides *where* the
//     effort should land first;
//   • vertical affinity — a light nudge, never a filter.
// ─────────────────────────────────────────────────────────────────────────────

import type { DimKey } from './questions'
import { DIMENSIONS } from './questions'
import type { ScoreRow } from './scoring'

export type InitiativeTier = 'foundation' | 'core' | 'scale' | 'optimize'
export type Effort = 'low' | 'medium' | 'high'

export type InitiativeTemplate = {
  codigo: string
  nome: string
  problema: string
  beneficio: string
  dimensao: DimKey
  tier: InitiativeTier
  urgencia: 1 | 2 | 3
  esforco: Effort
  proximo_passo: string
  kpi: string
  /** Verticals this initiative is especially relevant for. Empty = universal. */
  verticais?: string[]
}

// ── Library ─────────────────────────────────────────────────────────────────

export const INITIATIVE_LIBRARY: InitiativeTemplate[] = [
  // ── Strategy and Leadership ────────────────────────────────────────────────
  {
    codigo: 'STR-F1',
    nome: 'Executive sponsor and AI steering group',
    problema: 'The AI agenda has no named owner and decisions stall between areas.',
    beneficio: 'A single accountable executive and a fortnightly forum where priorities are decided.',
    dimensao: 'strategy',
    tier: 'foundation',
    urgencia: 3,
    esforco: 'low',
    proximo_passo: 'Name a C-level sponsor, seat the steering group and give it a decision charter within 30 days.',
    kpi: 'Sponsor named · steering group meeting fortnightly with minutes published',
  },
  {
    codigo: 'STR-F2',
    nome: 'Twelve-month AI ambition statement',
    problema: 'AI work is a set of disconnected experiments with no declared outcome.',
    beneficio: 'One sentence everyone can repeat, with three measurable outcomes for the year.',
    dimensao: 'strategy',
    tier: 'foundation',
    urgencia: 2,
    esforco: 'low',
    proximo_passo: 'Run a half-day workshop with the executive team and publish the statement internally.',
    kpi: 'Statement approved by the executive team · 3 baseline KPIs defined',
  },
  {
    codigo: 'STR-C1',
    nome: 'Annual AI portfolio and funding cycle',
    problema: 'Funding is decided case by case, so the portfolio follows whoever asks loudest.',
    beneficio: 'A ranked portfolio with an explicit budget line and quarterly reallocation.',
    dimensao: 'strategy',
    tier: 'core',
    urgencia: 2,
    esforco: 'medium',
    proximo_passo: 'Consolidate all AI demand into a single backlog and score it with one shared rubric.',
    kpi: 'Portfolio ranked quarterly · budget line approved in the annual plan',
  },
  {
    codigo: 'STR-S1',
    nome: 'AI value realisation office',
    problema: 'Benefits are claimed at approval and never measured afterwards.',
    beneficio: 'A light function that tracks realised value and retires initiatives that do not deliver.',
    dimensao: 'strategy',
    tier: 'scale',
    urgencia: 2,
    esforco: 'medium',
    proximo_passo: 'Assign two people part-time to track benefit cases against the approved business case.',
    kpi: '100% of funded initiatives with a measured benefit review within 6 months',
  },
  {
    codigo: 'STR-O1',
    nome: 'AI-driven business model review',
    problema: 'AI is used to cut cost inside the current model, not to change it.',
    beneficio: 'New revenue or service lines identified and tested before competitors.',
    dimensao: 'strategy',
    tier: 'optimize',
    urgencia: 1,
    esforco: 'high',
    proximo_passo: 'Run a quarterly session pairing the strategy team with product to test one new AI-enabled offer.',
    kpi: 'At least one AI-enabled offer in market within 12 months',
  },

  // ── Use Cases and Value ────────────────────────────────────────────────────
  {
    codigo: 'USE-F1',
    nome: 'Use-case inventory and value triage',
    problema: 'Ideas live in spreadsheets and chats, with no view of effort versus value.',
    beneficio: 'A single backlog scored on value, feasibility and risk, refreshed monthly.',
    dimensao: 'usecases',
    tier: 'foundation',
    urgencia: 3,
    esforco: 'low',
    proximo_passo: 'Collect every idea in one backlog and score the first 20 with a simple 1–5 rubric.',
    kpi: 'Single backlog live · 100% of active work traceable to a scored item',
  },
  {
    codigo: 'USE-F2',
    nome: 'Two lighthouse use cases with a 90-day proof',
    problema: 'Nothing has reached production, so confidence and sponsorship are fragile.',
    beneficio: 'Two visible wins that create internal appetite and evidence for the next budget cycle.',
    dimensao: 'usecases',
    tier: 'foundation',
    urgencia: 3,
    esforco: 'medium',
    proximo_passo: 'Pick the two highest-value, lowest-dependency items and staff them as products, not projects.',
    kpi: 'Two use cases in production · baseline and post-launch KPI measured',
  },
  {
    codigo: 'USE-C1',
    nome: 'Reusable use-case delivery playbook',
    problema: 'Every initiative restarts from zero with its own discovery, data and deployment ritual.',
    beneficio: 'A repeatable path from idea to production that cuts delivery time per use case.',
    dimensao: 'usecases',
    tier: 'core',
    urgencia: 2,
    esforco: 'medium',
    proximo_passo: 'Document the path used by the lighthouse cases and make it the default for the next five.',
    kpi: 'Time from approval to production reduced by 30%',
  },
  {
    codigo: 'USE-S1',
    nome: 'Scaled portfolio with product owners',
    problema: 'The portfolio grew faster than the capacity to own it.',
    beneficio: 'Each use case has an owner, a roadmap and a lifecycle from pilot to retirement.',
    dimensao: 'usecases',
    tier: 'scale',
    urgencia: 2,
    esforco: 'high',
    proximo_passo: 'Assign a business product owner per live use case and review the portfolio monthly.',
    kpi: 'Every production use case with a named owner and quarterly roadmap',
  },
  {
    codigo: 'USE-O1',
    nome: 'Autonomous optimisation of live models',
    problema: 'Deployed models are not retrained or re-evaluated once they go live.',
    beneficio: 'Sustained accuracy and value instead of slow drift after launch.',
    dimensao: 'usecases',
    tier: 'optimize',
    urgencia: 1,
    esforco: 'high',
    proximo_passo: 'Introduce scheduled drift monitoring and a retraining trigger per production model.',
    kpi: 'Drift alerts configured · retraining cadence defined per model',
  },

  // ── Data and Knowledge ─────────────────────────────────────────────────────
  {
    codigo: 'DAT-F1',
    nome: 'Critical data inventory',
    problema: 'Nobody can say which data exists, where it lives or who owns it.',
    beneficio: 'A short catalogue of the data that actually feeds AI, with an owner per domain.',
    dimensao: 'data',
    tier: 'foundation',
    urgencia: 3,
    esforco: 'low',
    proximo_passo: 'Catalogue the sources behind the first two use cases and assign a data owner per domain.',
    kpi: 'Top 10 sources catalogued with owner, freshness and quality note',
  },
  {
    codigo: 'DAT-F2',
    nome: 'Data quality baseline for the priority domain',
    problema: 'Quality problems are discovered during the project, not before it.',
    beneficio: 'A measured baseline so scope and cost are realistic before build starts.',
    dimensao: 'data',
    tier: 'foundation',
    urgencia: 3,
    esforco: 'medium',
    proximo_passo: 'Profile completeness, duplication and timeliness on the domain that feeds the priority use case.',
    kpi: 'Baseline published · acceptance thresholds agreed with the business',
  },
  {
    codigo: 'DAT-C1',
    nome: 'Governed data access layer',
    problema: 'Each team extracts data its own way, producing conflicting numbers.',
    beneficio: 'One governed path to curated data with lineage and access control.',
    dimensao: 'data',
    tier: 'core',
    urgencia: 2,
    esforco: 'high',
    proximo_passo: 'Publish the priority domain as a curated dataset with documented lineage and permissions.',
    kpi: 'Priority domain served through the governed layer · lineage documented',
  },
  {
    codigo: 'DAT-C2',
    nome: 'Retrieval layer over internal knowledge',
    problema: 'Policy, contract and technical knowledge is locked in documents nobody can search.',
    beneficio: 'Grounded answers over internal knowledge, with citations, for support and operations.',
    dimensao: 'data',
    tier: 'core',
    urgencia: 2,
    esforco: 'medium',
    proximo_passo: 'Index the ten most-consulted document sets and validate answer quality with real users.',
    kpi: 'Top 10 document sets indexed · answer accuracy validated on a 50-question set',
  },
  {
    codigo: 'DAT-S1',
    nome: 'Master data and quality SLAs',
    problema: 'Quality is repaired project by project instead of being guaranteed upstream.',
    beneficio: 'Data that is fit for AI by contract, not by heroics.',
    dimensao: 'data',
    tier: 'scale',
    urgencia: 2,
    esforco: 'high',
    proximo_passo: 'Agree quality SLAs with the source-system owners and monitor them on a dashboard.',
    kpi: 'Quality SLAs signed for the five critical domains · monthly monitoring live',
  },
  {
    codigo: 'DAT-O1',
    nome: 'Feature store and reusable data products',
    problema: 'The same features are rebuilt for every model.',
    beneficio: 'Shared, versioned features that cut build time and improve consistency.',
    dimensao: 'data',
    tier: 'optimize',
    urgencia: 1,
    esforco: 'high',
    proximo_passo: 'Move the features used by more than one model into a versioned, documented store.',
    kpi: 'Shared features reused by 2+ models · versioning and documentation in place',
  },

  // ── Technology and Architecture ────────────────────────────────────────────
  {
    codigo: 'TEC-F1',
    nome: 'Approved AI tooling and guardrails',
    problema: 'Teams adopt tools freely, with no control over data leaving the organisation.',
    beneficio: 'A short approved list plus blocking controls for unsanctioned tools.',
    dimensao: 'tech',
    tier: 'foundation',
    urgencia: 3,
    esforco: 'low',
    proximo_passo: 'Publish the approved tool list and enable the corresponding tenant and DLP controls.',
    kpi: 'Approved list published · shadow-AI usage reduced to a measured baseline',
  },
  {
    codigo: 'TEC-F2',
    nome: 'Reference architecture for one AI pattern',
    problema: 'Every build invents its own integration and deployment approach.',
    beneficio: 'One documented pattern the next three use cases can copy.',
    dimensao: 'tech',
    tier: 'foundation',
    urgencia: 2,
    esforco: 'medium',
    proximo_passo: 'Document the architecture used by the lighthouse case as the standard reference.',
    kpi: 'Reference architecture published · reused by the next use case',
  },
  {
    codigo: 'TEC-C1',
    nome: 'Model gateway and cost observability',
    problema: 'Spend and latency are invisible until the invoice arrives.',
    beneficio: 'Per-use-case cost, latency and fallback control in one place.',
    dimensao: 'tech',
    tier: 'core',
    urgencia: 2,
    esforco: 'medium',
    proximo_passo: 'Route model calls through a gateway that logs cost and latency per use case.',
    kpi: 'Cost per use case visible · monthly spend within forecast',
  },
  {
    codigo: 'TEC-C2',
    nome: 'Evaluation harness before release',
    problema: 'Quality is judged by demo impressions, not by measurement.',
    beneficio: 'A repeatable test set that gates every release.',
    dimensao: 'tech',
    tier: 'core',
    urgencia: 2,
    esforco: 'medium',
    proximo_passo: 'Build a 100-case evaluation set per use case and make it a release gate.',
    kpi: 'Evaluation set per use case · no release without a passing score',
  },
  {
    codigo: 'TEC-S1',
    nome: 'MLOps pipeline with automated deployment',
    problema: 'Release is a manual, fragile ritual performed by one person.',
    beneficio: 'Repeatable, auditable deployment with rollback.',
    dimensao: 'tech',
    tier: 'scale',
    urgencia: 2,
    esforco: 'high',
    proximo_passo: 'Introduce CI/CD with versioned artefacts and automated rollback for the live models.',
    kpi: 'Automated deployment for 100% of production models · rollback tested',
  },
  {
    codigo: 'TEC-O1',
    nome: 'Multi-model routing and resilience',
    problema: 'A single provider outage or price change hits every use case at once.',
    beneficio: 'Provider-independent operation with graceful degradation.',
    dimensao: 'tech',
    tier: 'optimize',
    urgencia: 1,
    esforco: 'high',
    proximo_passo: 'Introduce a routing layer with a secondary provider and tested failover per use case.',
    kpi: 'Failover exercised quarterly · no single-provider dependency in critical paths',
  },

  // ── Security, Risk and Governance ──────────────────────────────────────────
  {
    codigo: 'SEC-F1',
    nome: 'AI acceptable-use policy',
    problema: 'People already use generative tools with no written rule on data and outputs.',
    beneficio: 'Clear, short rules that remove ambiguity without blocking adoption.',
    dimensao: 'security',
    tier: 'foundation',
    urgencia: 3,
    esforco: 'low',
    proximo_passo: 'Publish a two-page policy, brief every team and require acknowledgement.',
    kpi: 'Policy published · 100% acknowledgement from staff using AI tools',
  },
  {
    codigo: 'SEC-F2',
    nome: 'AI risk inventory and classification',
    problema: 'Nobody knows which AI systems are in use, or how risky each one is.',
    beneficio: 'A register with a risk tier per system, and the obligations that follow from it.',
    dimensao: 'security',
    tier: 'foundation',
    urgencia: 3,
    esforco: 'medium',
    proximo_passo: 'Register every AI system in use and classify it as low, medium or high risk.',
    kpi: 'Register covering 100% of known systems · risk tier assigned',
  },
  {
    codigo: 'SEC-C1',
    nome: 'Human review gate for high-impact decisions',
    problema: 'Model output reaches customers or employees without a review step.',
    beneficio: 'A documented human-in-the-loop control where the impact is material.',
    dimensao: 'security',
    tier: 'core',
    urgencia: 3,
    esforco: 'medium',
    proximo_passo: 'Define which decisions require review and implement the approval step in the workflow.',
    kpi: 'Review gate enforced for 100% of high-impact use cases',
  },
  {
    codigo: 'SEC-C2',
    nome: 'Privacy and data protection impact review',
    problema: 'Personal data enters models without a documented lawful basis.',
    beneficio: 'Documented basis and minimisation per use case, defensible in an audit.',
    dimensao: 'security',
    tier: 'core',
    urgencia: 2,
    esforco: 'medium',
    proximo_passo: 'Run a DPIA for each use case that touches personal data before it goes live.',
    kpi: 'DPIA completed for every personal-data use case',
  },
  {
    codigo: 'SEC-S1',
    nome: 'Continuous model monitoring and audit trail',
    problema: 'After launch there is no evidence of behaviour, drift or incident handling.',
    beneficio: 'Traceable decisions and drift alerts that satisfy auditors and clients.',
    dimensao: 'security',
    tier: 'scale',
    urgencia: 2,
    esforco: 'high',
    proximo_passo: 'Log inputs, outputs and decisions per model and alert on drift and on anomalous behaviour.',
    kpi: 'Audit trail for 100% of production models · drift alerting live',
  },
  {
    codigo: 'SEC-O1',
    nome: 'Red teaming and adversarial testing',
    problema: 'Prompt injection and data exfiltration paths are never deliberately attacked.',
    beneficio: 'Known weaknesses fixed before an adversary finds them.',
    dimensao: 'security',
    tier: 'optimize',
    urgencia: 1,
    esforco: 'high',
    proximo_passo: 'Run a structured red-team exercise per critical use case before each major release.',
    kpi: 'Red team per critical use case · findings closed before release',
  },

  // ── People and Culture ─────────────────────────────────────────────────────
  {
    codigo: 'PEO-F1',
    nome: 'AI literacy baseline for all staff',
    problema: 'Adoption is uneven and depends on individual enthusiasm.',
    beneficio: 'A shared vocabulary and a consistent minimum standard across the organisation.',
    dimensao: 'people',
    tier: 'foundation',
    urgencia: 3,
    esforco: 'low',
    proximo_passo: 'Deliver a short mandatory module and measure the baseline before and after.',
    kpi: '80% of staff completed · post-training assessment passed',
  },
  {
    codigo: 'PEO-F2',
    nome: 'Role-based enablement for the priority teams',
    problema: 'Generic training does not change how a specific team works.',
    beneficio: 'Practical capability in the two teams that will actually use the first use cases.',
    dimensao: 'people',
    tier: 'foundation',
    urgencia: 2,
    esforco: 'medium',
    proximo_passo: 'Design a hands-on track per role and embed it in the team’s weekly ritual.',
    kpi: 'Two priority teams enabled · weekly usage measured',
  },
  {
    codigo: 'PEO-C1',
    nome: 'Internal AI champions network',
    problema: 'Knowledge stays with a few individuals and does not spread.',
    beneficio: 'A distributed network that supports peers and surfaces new opportunities.',
    dimensao: 'people',
    tier: 'core',
    urgencia: 2,
    esforco: 'medium',
    proximo_passo: 'Formalise one champion per business unit with time allocated and a monthly forum.',
    kpi: 'One champion per unit · monthly forum with documented use cases',
  },
  {
    codigo: 'PEO-C2',
    nome: 'New ways of working for AI-assisted roles',
    problema: 'People are given tools without their processes or targets being reconsidered.',
    beneficio: 'Redesigned workflows that capture the productivity gain instead of losing it.',
    dimensao: 'people',
    tier: 'core',
    urgencia: 2,
    esforco: 'medium',
    proximo_passo: 'Redesign two workflows end to end and update targets and job descriptions accordingly.',
    kpi: 'Two workflows redesigned · productivity gain measured and banked',
  },
  {
    codigo: 'PEO-S1',
    nome: 'Career paths and incentives for AI skills',
    problema: 'Specialists leave because there is no recognised progression.',
    beneficio: 'Retention and internal growth instead of permanent external hiring.',
    dimensao: 'people',
    tier: 'scale',
    urgencia: 2,
    esforco: 'high',
    proximo_passo: 'Define a technical and a managerial track, with recognition tied to delivered value.',
    kpi: 'Career framework published · attrition among AI roles below company average',
  },
  {
    codigo: 'PEO-O1',
    nome: 'Communities of practice across units',
    problema: 'Each unit relearns what another already solved.',
    beneficio: 'Reuse of patterns and faster adoption of what already works.',
    dimensao: 'people',
    tier: 'optimize',
    urgencia: 1,
    esforco: 'medium',
    proximo_passo: 'Create two communities of practice with a shared repository and a quarterly review.',
    kpi: 'Two active communities · documented patterns reused across units',
  },

  // ── Economics and Investment ───────────────────────────────────────────────
  {
    codigo: 'ECO-F1',
    nome: 'Cost visibility for AI consumption',
    problema: 'Token and infrastructure cost is invisible until the invoice arrives.',
    beneficio: 'Cost per use case and per unit of output, visible monthly.',
    dimensao: 'economics',
    tier: 'foundation',
    urgencia: 3,
    esforco: 'low',
    proximo_passo: 'Tag every AI workload and publish a monthly cost report per use case.',
    kpi: 'Cost per use case published monthly · variance explained',
  },
  {
    codigo: 'ECO-F2',
    nome: 'Business case template with benefit tracking',
    problema: 'Approval happens on estimates that are never revisited.',
    beneficio: 'A standard case with a measured benefit review at 90 and 180 days.',
    dimensao: 'economics',
    tier: 'foundation',
    urgencia: 2,
    esforco: 'low',
    proximo_passo: 'Adopt one template for every AI request and schedule the benefit review at approval.',
    kpi: '100% of AI requests with a business case · benefit review scheduled',
  },
  {
    codigo: 'ECO-C1',
    nome: 'Unit economics per use case',
    problema: 'Nobody can say what a transaction or an answer actually costs.',
    beneficio: 'Pricing, prioritisation and scaling decisions grounded in real unit cost.',
    dimensao: 'economics',
    tier: 'core',
    urgencia: 2,
    esforco: 'medium',
    proximo_passo: 'Compute cost per unit of output for the live use cases and compare with the baseline process.',
    kpi: 'Unit cost known per live use case · margin impact documented',
  },
  {
    codigo: 'ECO-C2',
    nome: 'Build versus buy decision framework',
    problema: 'Build-or-buy is decided by preference rather than by total cost.',
    beneficio: 'A repeatable decision that avoids duplicated platforms and lock-in.',
    dimensao: 'economics',
    tier: 'core',
    urgencia: 2,
    esforco: 'low',
    proximo_passo: 'Define criteria including total cost, differentiation and exit cost, and apply them to open requests.',
    kpi: 'Framework applied to 100% of new AI requests',
  },
  {
    codigo: 'ECO-S1',
    nome: 'AI budget with quarterly reallocation',
    problema: 'Budget is annual and fixed, so it cannot follow evidence.',
    beneficio: 'Money moves towards what proves value and away from what does not.',
    dimensao: 'economics',
    tier: 'scale',
    urgencia: 2,
    esforco: 'medium',
    proximo_passo: 'Ring-fence an AI budget line and reallocate 20% of it each quarter based on measured value.',
    kpi: 'Dedicated AI budget line · quarterly reallocation executed',
  },
  {
    codigo: 'ECO-O1',
    nome: 'Reinvestment and self-funding model',
    problema: 'Each wave depends on a new budget round and a new negotiation.',
    beneficio: 'A share of realised savings funds the next wave automatically.',
    dimensao: 'economics',
    tier: 'optimize',
    urgencia: 1,
    esforco: 'high',
    proximo_passo: 'Agree a reinvestment rule with finance and route a share of verified savings back into the portfolio.',
    kpi: 'Reinvestment rule approved · share of the next wave self-funded',
  },
]

// ── Index bands ─────────────────────────────────────────────────────────────

export type IndexBand = 'early' | 'developing' | 'consolidating' | 'advanced'

export function indexBand(escala5: number): IndexBand {
  if (escala5 < 1.5) return 'early'
  if (escala5 < 2.5) return 'developing'
  if (escala5 < 3.5) return 'consolidating'
  return 'advanced'
}

export const BAND_LABEL: Record<IndexBand, string> = {
  early: 'Early stage',
  developing: 'Developing',
  consolidating: 'Consolidating',
  advanced: 'Advanced',
}

export const BAND_FOCUS: Record<IndexBand, string> = {
  early: 'foundations first — governance, literacy and one credible proof of value',
  developing: 'turn ad-hoc pilots into a repeatable, governed capability',
  consolidating: 'scale what works and industrialise controls',
  advanced: 'differentiate through optimisation, resilience and new business models',
}

/** How much each maturity tier weighs inside each index band. */
const TIER_WEIGHT: Record<IndexBand, Record<InitiativeTier, number>> = {
  early: { foundation: 3.2, core: 1.5, scale: 0.5, optimize: 0.15 },
  developing: { foundation: 2.0, core: 2.8, scale: 1.2, optimize: 0.35 },
  consolidating: { foundation: 0.7, core: 2.1, scale: 2.8, optimize: 1.3 },
  advanced: { foundation: 0.15, core: 0.9, scale: 2.1, optimize: 3.0 },
}

// ── Selection ───────────────────────────────────────────────────────────────

export type GeneratedInitiative = {
  id: number
  codigo: string
  nome: string
  problema: string
  beneficio: string
  urgencia: number
  dimensao: string
  proximo_passo: string
  kpi: string
  motivo: string
  origem: 'metodo'
}

export type GenerateOptions = {
  scorecard: ScoreRow[]
  /** Overall index on the 0–5 scale. */
  escala5: number
  vertical?: string | null
  limit?: number
  /** Max initiatives drawn from a single dimension. */
  perDimensionCap?: number
}

type Candidate = {
  template: InitiativeTemplate
  score: number
  motivo: string
}

function verticalMatches(template: InitiativeTemplate, vertical: string | null | undefined): number {
  if (!template.verticais || !template.verticais.length) return 0
  if (!vertical) return 0
  const v = vertical
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
  const hit = template.verticais.some((tag) => {
    const t = tag.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    return v.includes(t) || t.includes(v)
  })
  return hit ? 0.8 : 0
}

function reasonFor(row: ScoreRow | undefined, template: InitiativeTemplate, band: IndexBand): string {
  if (!row) return `Method default for the ${BAND_LABEL[band].toLowerCase()} band.`
  const level = `L${row.atual}`
  const target = `L${row.meta}`
  const gap = row.gap > 0 ? `a gap of ${row.gap} level(s) to the 12-month target (${level} → ${target})` : `no declared gap (${level})`
  if (row.prioridade === 'Critical') return `${row.short} is at ${level} with ${gap} — critical priority, so this front comes first.`
  if (row.prioridade === 'High') return `${row.short} is at ${level} with ${gap} — high priority.`
  return `${row.short} is at ${level} with ${gap}; sequenced after the critical fronts.`
}

/**
 * Picks initiatives from the library for a maturity profile.
 *
 * Guarantees that every critical dimension and the two widest gaps get at least
 * one representative before the remaining slots are filled by pure relevance,
 * so the plan never ignores the weakest fronts.
 */
export function generateInitiatives(opts: GenerateOptions): GeneratedInitiative[] {
  const rows = opts.scorecard
  const band = indexBand(opts.escala5)
  const limit = Math.max(3, Math.min(10, opts.limit ?? 7))
  const cap = Math.max(1, Math.min(3, opts.perDimensionCap ?? 2))

  const byDim = new Map<string, ScoreRow>()
  for (const r of rows) byDim.set(r.dimensao, r)

  const weight = (r: ScoreRow) => 4 - r.atual + r.gap * 1.2 + (r.prioridade === 'Critical' ? 3 : r.prioridade === 'High' ? 1.6 : 0)

  const rankDimension = (r: ScoreRow) => weight(r) + (r.prioridade === 'Critical' ? 2 : 0)

  const candidates: Candidate[] = INITIATIVE_LIBRARY.map((template) => {
    const row = byDim.get(template.dimensao)
    const dimWeight = row ? rankDimension(row) : 2
    const score =
      TIER_WEIGHT[band][template.tier] * 2.4 +
      dimWeight * 0.9 +
      template.urgencia * 0.55 +
      (template.esforco === 'low' ? 0.5 : template.esforco === 'medium' ? 0.2 : 0) +
      verticalMatches(template, opts.vertical)
    return { template, score, motivo: reasonFor(row, template, band) }
  })

  // Deterministic order: score, then code, so the same profile always yields the
  // same plan (reports must be reproducible across regenerations).
  candidates.sort((a, b) => b.score - a.score || a.template.codigo.localeCompare(b.template.codigo))

  const chosen: Candidate[] = []
  const taken = new Set<string>()
  const perDim = new Map<string, number>()

  const take = (cand: Candidate) => {
    if (taken.has(cand.template.codigo)) return false
    if ((perDim.get(cand.template.dimensao) || 0) >= cap) return false
    taken.add(cand.template.codigo)
    perDim.set(cand.template.dimensao, (perDim.get(cand.template.dimensao) || 0) + 1)
    chosen.push(cand)
    return true
  }

  // 1 — coverage: critical dimensions first, then the widest gaps.
  const coverageOrder = [...rows]
    .filter((r) => r.prioridade === 'Critical' || r.gap >= 2)
    .sort((a, b) => rankDimension(b) - rankDimension(a))

  for (const row of coverageOrder) {
    if (chosen.length >= limit) break
    const best = candidates.find((c) => c.template.dimensao === row.dimensao && !taken.has(c.template.codigo))
    if (best) take(best)
  }

  // 2 — fill the remaining slots by relevance.
  for (const cand of candidates) {
    if (chosen.length >= limit) break
    take(cand)
  }

  // 3 — if the cap still left slots open, relax it.
  if (chosen.length < limit) {
    for (const cand of candidates) {
      if (chosen.length >= limit) break
      if (taken.has(cand.template.codigo)) continue
      taken.add(cand.template.codigo)
      chosen.push(cand)
    }
  }

  return chosen.map((c, idx) => ({
    id: -(idx + 1),
    codigo: c.template.codigo,
    nome: c.template.nome,
    problema: c.template.problema,
    beneficio: c.template.beneficio,
    urgencia: c.template.urgencia,
    dimensao: c.template.dimensao,
    proximo_passo: c.template.proximo_passo,
    kpi: c.template.kpi,
    motivo: c.motivo,
    origem: 'metodo' as const,
  }))
}

/** Human-readable note for the report header. */
export function selectionNote(escala5: number, count: number): string {
  const band = indexBand(escala5)
  return (
    `${count} initiative(s) selected automatically from the Unified Technologies library for an index of ` +
    `${escala5.toFixed(1)}/5 (${BAND_LABEL[band]}): ${BAND_FOCUS[band]}.`
  )
}

export const DIMENSION_ORDER: DimKey[] = DIMENSIONS.map((d) => d.key)
