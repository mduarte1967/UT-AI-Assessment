// ─────────────────────────────────────────────────────────────────────────────
// UT — Outcome-Driven AI Assessment Framework
// Question bank v2 · 35 questions · 7 dimensions · maturity scale 1–5
//
// Every question carries a persona:
//   O — Outcome Discovery : identifies objectives, problems, KPIs, opportunities.
//                           Not scored; feeds the business outcome map and the
//                           initiative portfolio.
//   M — Maturity Assessment: evaluates existing capabilities, processes, controls.
//                           Scored 1–5; feeds the AI Maturity Index.
//   H — Hybrid             : identifies opportunities AND yields maturity evidence.
//                           Scored 1–5 and keeps the evidence text.
//
// A dimension's level is derived from its M and H questions only, so the index
// rests on evidence rather than on a single perception score.
// ─────────────────────────────────────────────────────────────────────────────

export type DimKey =
  | 'strategy'
  | 'usecases'
  | 'data'
  | 'tech'
  | 'security'
  | 'people'
  | 'economics'

export type Persona = 'O' | 'M' | 'H'

export type Dimension = {
  key: DimKey
  nome: string
  short: string
  descricao: string
  /** What the dimension is meant to establish. */
  objetivo: string
  cor: string
  icone: string
  /** Share of the weighted AI Maturity Index (0–1, sums to 1). */
  peso: number
  expectedOutcomes: string
  kpis: string
}

export const DIMENSIONS: Dimension[] = [
  {
    key: 'strategy',
    nome: 'Strategy',
    short: 'Strategy',
    descricao: 'Strategic priorities and how AI contributes to measurable business outcomes.',
    objetivo:
      "Understand the organization's strategic priorities and how AI can contribute to measurable business outcomes.",
    cor: '#0B2545',
    icone: 'fa-compass',
    peso: 0.15,
    expectedOutcomes: 'Strategic alignment, business outcome map, executive sponsorship and measurable AI objectives.',
    kpis: 'Revenue growth, operating margin, service quality, customer satisfaction and strategic goal achievement.',
  },
  {
    key: 'usecases',
    nome: 'Use Cases',
    short: 'Use cases',
    descricao: 'Business processes, services and decisions that could benefit from AI-enabled transformation.',
    objetivo:
      'Identify business processes, services and decisions that could benefit from AI-enabled transformation.',
    cor: '#1B3560',
    icone: 'fa-bullseye',
    peso: 0.2,
    expectedOutcomes: 'AI opportunity portfolio, process transformation opportunities and prioritized business use cases.',
    kpis:
      'Processing time, cost per transaction, hours saved, error rate, customer satisfaction, forecast accuracy and service availability.',
  },
  {
    key: 'data',
    nome: 'Data',
    short: 'Data',
    descricao: "Whether the organization's data capabilities can support the desired AI outcomes.",
    objetivo: "Determine whether the organization's data capabilities can support the desired AI outcomes.",
    cor: '#3E6BA5',
    icone: 'fa-database',
    peso: 0.15,
    expectedOutcomes:
      'Data readiness assessment, data management gaps, governance requirements and data dependencies for AI use cases.',
    kpis: 'Data quality score, data accessibility, data preparation time, data freshness and governance coverage.',
  },
  {
    key: 'tech',
    nome: 'Technology',
    short: 'Technology',
    descricao: 'Technological capabilities required to implement, integrate, operate and scale AI solutions.',
    objetivo:
      'Assess the technological capabilities required to implement, integrate, operate and scale AI solutions.',
    cor: '#315a8e',
    icone: 'fa-sitemap',
    peso: 0.15,
    expectedOutcomes: 'Technology readiness, architectural gaps, integration requirements and AI platform recommendations.',
    kpis: 'Deployment time, availability, response latency, integration coverage, scalability and infrastructure utilization.',
  },
  {
    key: 'security',
    nome: 'Security',
    short: 'Security',
    descricao: 'Cybersecurity, privacy, regulatory, operational and responsible AI risks.',
    objetivo:
      'Enable AI adoption while managing cybersecurity, privacy, regulatory, operational and responsible AI risks.',
    cor: '#0f7f8f',
    icone: 'fa-shield-halved',
    peso: 0.15,
    expectedOutcomes:
      'AI security posture, Shadow AI exposure, governance gaps, risk register and security control requirements.',
    kpis: 'Unauthorized AI usage, policy violations, security incidents, AI governance coverage and risk assessment coverage.',
  },
  {
    key: 'people',
    nome: 'People',
    short: 'People',
    descricao: 'Ability to adopt AI, transform ways of working and realize workforce productivity benefits.',
    objetivo:
      "Assess the organization's ability to adopt AI, transform ways of working and realize workforce productivity benefits.",
    cor: '#8FAE00',
    icone: 'fa-users-gear',
    peso: 0.1,
    expectedOutcomes:
      'Workforce readiness, AI literacy gaps, adoption strategy, training requirements and change management roadmap.',
    kpis: 'Active AI users, adoption rate, employee satisfaction, hours released and productivity improvement.',
  },
  {
    key: 'economics',
    nome: 'Economics',
    short: 'Economics',
    descricao: 'Ability to justify, fund, manage and realize the economic value of AI investments.',
    objetivo:
      "Assess the organization's ability to justify, fund, manage and realize the economic value of AI investments.",
    cor: '#5B6B80',
    icone: 'fa-chart-pie',
    peso: 0.1,
    expectedOutcomes:
      'Business value hypotheses, investment criteria, ROI framework, AI FinOps readiness and benefits realization capabilities.',
    kpis: 'ROI, TCO, payback period, cost per AI transaction, cost avoidance and realized business value.',
  },
]

export const DIM_MAP: Record<string, Dimension> = Object.fromEntries(
  DIMENSIONS.map((d) => [d.key, d])
) as Record<string, Dimension>

/** Dimension weights of the weighted AI Maturity Index (sums to 1). */
export const DIM_WEIGHTS: Record<DimKey, number> = Object.fromEntries(
  DIMENSIONS.map((d) => [d.key, d.peso])
) as Record<DimKey, number>

// ── Maturity scale 1–5 ──────────────────────────────────────────────────────

export const MATURITY_LABELS = [
  '1 · Initial',
  '2 · Emerging',
  '3 · Defined',
  '4 · Managed',
  '5 · Optimized',
]

export const MATURITY_DESC = [
  'No structured capability; ad hoc or absent.',
  'Isolated initiatives, partial visibility, no standard.',
  'Formal, documented practice with owners and criteria.',
  'Governed, measured and operating at scale.',
  'Continuously optimized and outcome-driven.',
]

/** Kept for compatibility with older view code: same content, 1–5 scale. */
export const LEVEL_LABELS = MATURITY_LABELS
export const LEVEL_DESC = MATURITY_DESC

/** 1-based label lookup: levelLabel(1) → '1 · Initial'. Safe for any input. */
export function levelLabel(level: number | null | undefined): string {
  const n = Math.round(Number(level))
  if (!Number.isFinite(n) || n < 1 || n > 5) return '—'
  return MATURITY_LABELS[n - 1]
}

/** Short name of the level: levelName(3) → 'Defined'. */
export function levelName(level: number | null | undefined): string {
  const l = levelLabel(level)
  return l === '—' ? '—' : l.split(' · ')[1]
}

/**
 * AI Maturity Assessment Matrix — the five criteria per dimension, from
 * "1 — Initial" to "5 — Optimized". Used as the rubric anchors of every
 * maturity question and as the anchor column of the report scorecard.
 */
export const MATURITY_MATRIX: Record<DimKey, string[]> = {
  strategy: [
    'No formal AI strategy',
    'Isolated AI objectives',
    'AI strategy aligned with business priorities',
    'Governed strategy with measurable KPIs',
    'Continuous outcome-driven strategic optimization',
  ],
  usecases: [
    'No structured discovery',
    'Isolated ideas and pilots',
    'Prioritized use cases with owners and expected benefits',
    'Production use cases with measured outcomes',
    'Continuous enterprise-wide AI transformation',
  ],
  data: [
    'Fragmented and unmanaged data',
    'Partial accessibility and quality controls',
    'Defined ownership, quality and governance standards',
    'Integrated, trusted and monitored data',
    'Continuously optimized AI-ready data ecosystem',
  ],
  tech: [
    'No established AI capabilities',
    'Isolated tools and environments',
    'Defined architecture and integration capabilities',
    'Governed, scalable production AI platforms',
    'Optimized hybrid and enterprise-wide AI architecture',
  ],
  security: [
    'No AI-specific controls',
    'Basic policies and partial visibility',
    'Formal AI security and governance controls',
    'Continuous monitoring and policy enforcement',
    'Adaptive security and automated governance',
  ],
  people: [
    'Limited AI awareness',
    'Individual experimentation',
    'Structured training and adoption programs',
    'Measured adoption and workforce transformation',
    'Continuous AI-enabled organizational improvement',
  ],
  economics: [
    'No structured AI business cases',
    'Ad hoc investment decisions',
    'Defined ROI, TCO and funding criteria',
    'AI FinOps and measured benefits realization',
    'Continuous value and unit economics optimization',
  ],
}

/**
 * Maturity-to-initiative recommendation matrix: the anchor recommendation for a
 * dimension at a given need level. A catalogue of possibilities, not a
 * prescription — the report explains the dependency on use cases and risk.
 */
export const MATURITY_TO_INITIATIVE: Record<DimKey, string[]> = {
  strategy: [
    'AI Strategy Definition',
    'AI Transformation Roadmap',
    'AI Portfolio Governance',
    'Enterprise AI Transformation',
    'Continuous Strategic Value Optimization',
  ],
  usecases: [
    'AI Opportunity Discovery',
    'AI Proof of Value',
    'AI Assistants & Process Automation',
    'Agentic AI & Workflow Orchestration',
    'Enterprise AI Innovation',
  ],
  data: [
    'Data Management Assessment',
    'Data Quality & Governance',
    'AI-ready Data Platform',
    'Enterprise Data Products',
    'Intelligent Data Management',
  ],
  tech: [
    'AI Architecture Assessment',
    'AI Platform & Integration Foundation',
    'Hybrid AI & Private AI',
    'Scalable AI Inference & Orchestration',
    'Continuous AI Platform Optimization',
  ],
  security: [
    'Shadow AI Discovery',
    'AI Policies & Governance',
    'AI Gateway & AI Security Controls',
    'Continuous AI Security & Agent Governance',
    'Automated AI Risk & Governance',
  ],
  people: [
    'AI Literacy Assessment',
    'AI Awareness & Training',
    'Governed AI Workspace & Adoption',
    'Workforce Transformation',
    'Continuous AI Workforce Optimization',
  ],
  economics: [
    'AI Business Value Assessment',
    'AI Business Case Framework',
    'AI FinOps & Cost Management',
    'AI Unit Economics & Benefits Tracking',
    'Continuous AI Value Optimization',
  ],
}

// ── Question bank ───────────────────────────────────────────────────────────

export type Option = { label: string; level: number }

export type QuestionSeed = {
  /** Stable identifier and human reference — e.g. 'STR01'. */
  slug: string
  ref: string
  dimensao: DimKey
  persona: Persona
  ordem: number
  texto: string
  /**
   * v2 uses only `texto` (outcome discovery), `escala` (maturity) and `hibrido`
   * (maturity + evidence). `escolha` / `multipla` remain in the union so older
   * banks and stored answers stay renderable.
   */
  tipo: 'texto' | 'escala' | 'escolha' | 'multipla' | 'hibrido'
  opcoes: Option[] | null
  obrigatoria: boolean
  rubrica: { labels: string[] } | null
  ajuda: string | null
}

const anchors = (dim: DimKey) => ({ labels: MATURITY_MATRIX[dim] })

export const QUESTIONS: QuestionSeed[] = [
  // ── Dimension 1 — Strategy ───────────────────────────────────────────────
  {
    slug: 'STR01',
    ref: 'STR01',
    dimensao: 'strategy',
    persona: 'O',
    ordem: 10,
    texto:
      'What are the most important business outcomes your organization aims to achieve over the next 12–24 months?',
    tipo: 'texto',
    opcoes: null,
    obrigatoria: true,
    rubrica: null,
    ajuda: 'List two to four outcomes. They become the business outcome map of the report.',
  },
  {
    slug: 'STR02',
    ref: 'STR02',
    dimensao: 'strategy',
    persona: 'O',
    ordem: 11,
    texto:
      'Which strategic KPIs are currently below expectations, and what improvement targets have been established?',
    tipo: 'texto',
    opcoes: null,
    obrigatoria: true,
    rubrica: null,
    ajuda: 'Name the KPI, the current value and the target you have committed to.',
  },
  {
    slug: 'STR03',
    ref: 'STR03',
    dimensao: 'strategy',
    persona: 'O',
    ordem: 12,
    texto:
      'What business challenges or organizational constraints are preventing you from achieving these outcomes?',
    tipo: 'texto',
    opcoes: null,
    obrigatoria: true,
    rubrica: null,
    ajuda: 'Constraints can be operational, financial, regulatory, technological or people-related.',
  },
  {
    slug: 'STR04',
    ref: 'STR04',
    dimensao: 'strategy',
    persona: 'M',
    ordem: 13,
    texto:
      'To what extent is AI incorporated into your business strategy, transformation programs and investment priorities?',
    tipo: 'escala',
    opcoes: null,
    obrigatoria: true,
    rubrica: anchors('strategy'),
    ajuda: null,
  },
  {
    slug: 'STR05',
    ref: 'STR05',
    dimensao: 'strategy',
    persona: 'M',
    ordem: 14,
    texto:
      'How are AI objectives, executive sponsorship, business ownership and success criteria defined and communicated across the organization?',
    tipo: 'escala',
    opcoes: null,
    obrigatoria: true,
    rubrica: anchors('strategy'),
    ajuda: null,
  },

  // ── Dimension 2 — Use Cases ──────────────────────────────────────────────
  {
    slug: 'USC01',
    ref: 'USC01',
    dimensao: 'usecases',
    persona: 'O',
    ordem: 20,
    texto:
      'Which business processes involve significant manual effort, repetitive activities, operational delays, errors or unnecessary costs, and how are these impacts measured?',
    tipo: 'texto',
    opcoes: null,
    obrigatoria: true,
    rubrica: null,
    ajuda: 'Name the process, the volume and the cost or delay it causes today.',
  },
  {
    slug: 'USC02',
    ref: 'USC02',
    dimensao: 'usecases',
    persona: 'O',
    ordem: 21,
    texto:
      'Where could AI improve customer experience, service delivery, revenue generation or enable new products and services?',
    tipo: 'texto',
    opcoes: null,
    obrigatoria: true,
    rubrica: null,
    ajuda: 'Think about the customer journey: contact, decision, fulfilment, support.',
  },
  {
    slug: 'USC03',
    ref: 'USC03',
    dimensao: 'usecases',
    persona: 'O',
    ordem: 22,
    texto:
      'Which business decisions or employee activities could benefit from faster access to information, knowledge, analytics or predictive insights?',
    tipo: 'texto',
    opcoes: null,
    obrigatoria: true,
    rubrica: null,
    ajuda: 'Decisions that are slow, inconsistent or dependent on scarce specialists are the best candidates.',
  },
  {
    slug: 'USC04',
    ref: 'USC04',
    dimensao: 'usecases',
    persona: 'O',
    ordem: 23,
    texto:
      'Which workflows could benefit from intelligent automation, AI assistants or AI agents, and what measurable improvements would be expected?',
    tipo: 'texto',
    opcoes: null,
    obrigatoria: true,
    rubrica: null,
    ajuda: 'Include the expected gain: hours, cycle time, error rate or cost.',
  },
  {
    slug: 'USC05',
    ref: 'USC05',
    dimensao: 'usecases',
    persona: 'M',
    ordem: 24,
    texto:
      'How does your organization currently identify, evaluate, prioritize, validate and scale AI use cases based on business value, feasibility and risk?',
    tipo: 'escala',
    opcoes: null,
    obrigatoria: true,
    rubrica: anchors('usecases'),
    ajuda: null,
  },

  // ── Dimension 3 — Data ───────────────────────────────────────────────────
  {
    slug: 'DAT01',
    ref: 'DAT01',
    dimensao: 'data',
    persona: 'O',
    ordem: 30,
    texto:
      'What structured and unstructured data is available to support your priority business processes, decisions and potential AI use cases?',
    tipo: 'texto',
    opcoes: null,
    obrigatoria: true,
    rubrica: null,
    ajuda: 'List the main systems and document repositories that hold this information.',
  },
  {
    slug: 'DAT02',
    ref: 'DAT02',
    dimensao: 'data',
    persona: 'M',
    ordem: 31,
    texto:
      'How does your organization measure and manage data quality, completeness, accuracy, consistency and timeliness?',
    tipo: 'escala',
    opcoes: null,
    obrigatoria: true,
    rubrica: anchors('data'),
    ajuda: null,
  },
  {
    slug: 'DAT03',
    ref: 'DAT03',
    dimensao: 'data',
    persona: 'M',
    ordem: 32,
    texto:
      'To what extent is business-critical information accessible, discoverable and integrated across enterprise systems and repositories?',
    tipo: 'escala',
    opcoes: null,
    obrigatoria: true,
    rubrica: anchors('data'),
    ajuda: null,
  },
  {
    slug: 'DAT04',
    ref: 'DAT04',
    dimensao: 'data',
    persona: 'M',
    ordem: 33,
    texto:
      'How are data ownership, classification, lineage, access permissions and governance responsibilities established and enforced?',
    tipo: 'escala',
    opcoes: null,
    obrigatoria: true,
    rubrica: anchors('data'),
    ajuda: null,
  },
  {
    slug: 'DAT05',
    ref: 'DAT05',
    dimensao: 'data',
    persona: 'M',
    ordem: 34,
    texto:
      'How effectively can your organization prepare, integrate, maintain and provide trusted data for AI applications, analytics and performance evaluation?',
    tipo: 'escala',
    opcoes: null,
    obrigatoria: true,
    rubrica: anchors('data'),
    ajuda: null,
  },

  // ── Dimension 4 — Technology ─────────────────────────────────────────────
  {
    slug: 'TEC01',
    ref: 'TEC01',
    dimensao: 'tech',
    persona: 'H',
    ordem: 40,
    texto:
      'What existing business applications, cloud services, infrastructure and AI capabilities could support your identified business outcomes?',
    tipo: 'hibrido',
    opcoes: null,
    obrigatoria: true,
    rubrica: anchors('tech'),
    ajuda: 'Rate the readiness of what exists today and list the platforms behind your answer.',
  },
  {
    slug: 'TEC02',
    ref: 'TEC02',
    dimensao: 'tech',
    persona: 'M',
    ordem: 41,
    texto:
      'How effectively can enterprise systems exchange information and execute workflows through APIs, integration platforms or automation services?',
    tipo: 'escala',
    opcoes: null,
    obrigatoria: true,
    rubrica: anchors('tech'),
    ajuda: null,
  },
  {
    slug: 'TEC03',
    ref: 'TEC03',
    dimensao: 'tech',
    persona: 'M',
    ordem: 42,
    texto:
      'What capabilities exist to develop, deploy, evaluate, monitor and maintain AI applications, models and agents?',
    tipo: 'escala',
    opcoes: null,
    obrigatoria: true,
    rubrica: anchors('tech'),
    ajuda: null,
  },
  {
    slug: 'TEC04',
    ref: 'TEC04',
    dimensao: 'tech',
    persona: 'H',
    ordem: 43,
    texto:
      'What technical limitations related to performance, availability, scalability, legacy systems or data residency could constrain AI adoption?',
    tipo: 'hibrido',
    opcoes: null,
    obrigatoria: true,
    rubrica: anchors('tech'),
    ajuda: 'Rate how constraining these limitations are today and name the main one.',
  },
  {
    slug: 'TEC05',
    ref: 'TEC05',
    dimensao: 'tech',
    persona: 'M',
    ordem: 44,
    texto:
      'How effectively can your current technology architecture support secure, reliable and scalable AI solutions across cloud, on-premises and edge environments?',
    tipo: 'escala',
    opcoes: null,
    obrigatoria: true,
    rubrica: anchors('tech'),
    ajuda: null,
  },

  // ── Dimension 5 — Security ───────────────────────────────────────────────
  {
    slug: 'SEC01',
    ref: 'SEC01',
    dimensao: 'security',
    persona: 'M',
    ordem: 50,
    texto:
      'How effectively does your organization identify and monitor AI applications currently being used by employees, including unauthorized or unmanaged AI services?',
    tipo: 'escala',
    opcoes: null,
    obrigatoria: true,
    rubrica: anchors('security'),
    ajuda: null,
  },
  {
    slug: 'SEC02',
    ref: 'SEC02',
    dimensao: 'security',
    persona: 'M',
    ordem: 51,
    texto:
      'What policies and controls govern AI usage, sensitive data protection, privacy, regulatory compliance and third-party AI providers?',
    tipo: 'escala',
    opcoes: null,
    obrigatoria: true,
    rubrica: anchors('security'),
    ajuda: null,
  },
  {
    slug: 'SEC03',
    ref: 'SEC03',
    dimensao: 'security',
    persona: 'M',
    ordem: 52,
    texto:
      'How does your organization prevent, detect and respond to AI-specific risks, including data leakage, prompt injection, inaccurate outputs and unauthorized agent actions?',
    tipo: 'escala',
    opcoes: null,
    obrigatoria: true,
    rubrica: anchors('security'),
    ajuda: null,
  },
  {
    slug: 'SEC04',
    ref: 'SEC04',
    dimensao: 'security',
    persona: 'M',
    ordem: 53,
    texto:
      'How are AI use cases evaluated for risk, human oversight, accountability, auditability and regulatory compliance before production deployment?',
    tipo: 'escala',
    opcoes: null,
    obrigatoria: true,
    rubrica: anchors('security'),
    ajuda: null,
  },
  {
    slug: 'SEC05',
    ref: 'SEC05',
    dimensao: 'security',
    persona: 'M',
    ordem: 54,
    texto:
      'How effectively can your organization continuously monitor AI security, enforce governance policies and respond to AI-related incidents at scale?',
    tipo: 'escala',
    opcoes: null,
    obrigatoria: true,
    rubrica: anchors('security'),
    ajuda: null,
  },

  // ── Dimension 6 — People ─────────────────────────────────────────────────
  {
    slug: 'PEO01',
    ref: 'PEO01',
    dimensao: 'people',
    persona: 'O',
    ordem: 60,
    texto:
      'Which employee groups, business roles and activities could benefit most from AI-enabled productivity, knowledge access or workforce augmentation?',
    tipo: 'texto',
    opcoes: null,
    obrigatoria: true,
    rubrica: null,
    ajuda: 'Name the roles and the headcount, and what they would stop doing.',
  },
  {
    slug: 'PEO02',
    ref: 'PEO02',
    dimensao: 'people',
    persona: 'M',
    ordem: 61,
    texto:
      'What is the current level of AI literacy, practical AI experience and technical capability across business and technology teams?',
    tipo: 'escala',
    opcoes: null,
    obrigatoria: true,
    rubrica: anchors('people'),
    ajuda: null,
  },
  {
    slug: 'PEO03',
    ref: 'PEO03',
    dimensao: 'people',
    persona: 'M',
    ordem: 62,
    texto:
      'How does your organization provide employees with approved AI tools, training, guidance and role-specific enablement?',
    tipo: 'escala',
    opcoes: null,
    obrigatoria: true,
    rubrica: anchors('people'),
    ajuda: null,
  },
  {
    slug: 'PEO04',
    ref: 'PEO04',
    dimensao: 'people',
    persona: 'M',
    ordem: 63,
    texto:
      'How effectively can the organization redesign workflows, responsibilities and operating practices to incorporate AI capabilities?',
    tipo: 'escala',
    opcoes: null,
    obrigatoria: true,
    rubrica: anchors('people'),
    ajuda: null,
  },
  {
    slug: 'PEO05',
    ref: 'PEO05',
    dimensao: 'people',
    persona: 'M',
    ordem: 64,
    texto:
      'How are AI adoption, employee productivity, user satisfaction and the realization of workforce-related benefits measured and continuously improved?',
    tipo: 'escala',
    opcoes: null,
    obrigatoria: true,
    rubrica: anchors('people'),
    ajuda: null,
  },

  // ── Dimension 7 — Economics ──────────────────────────────────────────────
  {
    slug: 'ECO01',
    ref: 'ECO01',
    dimensao: 'economics',
    persona: 'H',
    ordem: 70,
    texto:
      'How does your organization quantify the financial and non-financial impact of its business challenges and improvement opportunities?',
    tipo: 'hibrido',
    opcoes: null,
    obrigatoria: true,
    rubrica: anchors('economics'),
    ajuda: 'Rate the current practice and give one example of a quantified impact.',
  },
  {
    slug: 'ECO02',
    ref: 'ECO02',
    dimensao: 'economics',
    persona: 'M',
    ordem: 71,
    texto:
      'How are AI investments evaluated against expected business benefits, implementation costs, operating costs, ROI and payback requirements?',
    tipo: 'escala',
    opcoes: null,
    obrigatoria: true,
    rubrica: anchors('economics'),
    ajuda: null,
  },
  {
    slug: 'ECO03',
    ref: 'ECO03',
    dimensao: 'economics',
    persona: 'M',
    ordem: 72,
    texto:
      'What funding mechanisms and investment approval criteria exist for AI initiatives, including experimentation, production deployment and scaling?',
    tipo: 'escala',
    opcoes: null,
    obrigatoria: true,
    rubrica: anchors('economics'),
    ajuda: null,
  },
  {
    slug: 'ECO04',
    ref: 'ECO04',
    dimensao: 'economics',
    persona: 'M',
    ordem: 73,
    texto:
      'How are AI consumption costs, infrastructure expenses, software licenses and operational costs monitored, allocated and optimized?',
    tipo: 'escala',
    opcoes: null,
    obrigatoria: true,
    rubrica: anchors('economics'),
    ajuda: null,
  },
  {
    slug: 'ECO05',
    ref: 'ECO05',
    dimensao: 'economics',
    persona: 'M',
    ordem: 74,
    texto:
      'How does your organization validate actual AI business benefits against initial business cases and use those results to guide future investments?',
    tipo: 'escala',
    opcoes: null,
    obrigatoria: true,
    rubrica: anchors('economics'),
    ajuda: null,
  },
]

/** Bank version stored on new assessments. v1 remains readable for history. */
export const QUESTION_BANK_VERSION = 2

export const PERSONA_LABEL: Record<Persona, string> = {
  O: 'Outcome discovery',
  M: 'Maturity assessment',
  H: 'Hybrid',
}

export const PERSONA_DESC: Record<Persona, string> = {
  O: 'Identifies objectives, problems, KPIs and business opportunities. Not scored — feeds the outcome map and the initiative portfolio.',
  M: 'Evaluates existing capabilities, processes and controls. Scored 1–5 — feeds the AI Maturity Index.',
  H: 'Identifies opportunities and also provides maturity evidence. Scored 1–5, keeping the evidence text.',
}

/** Questions that actually score a dimension. */
export function scoredQuestions(qs: QuestionSeed[]): QuestionSeed[] {
  return qs.filter((q) => q.persona === 'M' || q.persona === 'H')
}
