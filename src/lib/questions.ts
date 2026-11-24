// Question bank v1 — 7 dimensions, 23 questions, L0–L4 rubrics.
// Stable per-question key (slug) so the bank can be translated later.

export type DimKey =
  | 'strategy'
  | 'usecases'
  | 'data'
  | 'tech'
  | 'security'
  | 'people'
  | 'economics'

export type Dimension = {
  key: DimKey
  nome: string
  short: string
  descricao: string
  cor: string
  icone: string
}

export const DIMENSIONS: Dimension[] = [
  {
    key: 'strategy',
    nome: 'Strategy and Leadership',
    short: 'Strategy',
    descricao: 'Direction, executive sponsorship and governance of the AI agenda.',
    cor: '#080048',
    icone: 'fa-compass',
  },
  {
    key: 'usecases',
    nome: 'Use Cases and Value',
    short: 'Use cases',
    descricao: 'Prioritised portfolio of use cases with proven value.',
    cor: '#1f4fa8',
    icone: 'fa-bullseye',
  },
  {
    key: 'data',
    nome: 'Data and Knowledge',
    short: 'Data',
    descricao: 'Quality, governance and availability of data and knowledge.',
    cor: '#2f6fb5',
    icone: 'fa-database',
  },
  {
    key: 'tech',
    nome: 'Technology and Architecture',
    short: 'Technology',
    descricao: 'Platform, integration, MLOps and AI observability.',
    cor: '#3f8ac0',
    icone: 'fa-sitemap',
  },
  {
    key: 'security',
    nome: 'Security, Risk and Governance',
    short: 'Security',
    descricao: 'Responsible use, privacy, risk and compliance.',
    cor: '#0f7f8f',
    icone: 'fa-shield-halved',
  },
  {
    key: 'people',
    nome: 'People and Operations',
    short: 'People',
    descricao: 'Capability building, organisation and adoption culture.',
    cor: '#4878b0',
    icone: 'fa-users',
  },
  {
    key: 'economics',
    nome: 'Economics and AI FinOps',
    short: 'FinOps',
    descricao: 'Cost, budget and return on AI investments.',
    cor: '#6a8fb8',
    icone: 'fa-chart-pie',
  },
]

export const DIM_MAP: Record<string, Dimension> = Object.fromEntries(
  DIMENSIONS.map((d) => [d.key, d])
) as Record<string, Dimension>

export const LEVEL_LABELS = [
  'L0 · Non-existent',
  'L1 · Initial / ad hoc',
  'L2 · Defined (draft)',
  'L3 · Managed (published)',
  'L4 · Optimised (measured)',
]

export const LEVEL_DESC = [
  'No practice, policy or structured discussion exists.',
  'Isolated individual actions, with no standard or sponsorship.',
  'Practice designed and documented, but only partially adopted.',
  'Practice published, with an owner, process and real adoption.',
  'Practice measured, periodically reviewed and optimised.',
]

export type Option = { label: string; level: number }

export type QuestionSeed = {
  slug: string
  dimensao: DimKey
  ordem: number
  texto: string
  tipo: 'escala' | 'escolha' | 'multipla' | 'texto'
  opcoes: Option[] | null
  obrigatoria: boolean
  rubrica: { labels: string[] } | null
  ajuda: string | null
}

const esc = (l: string[]) => ({ labels: l })

export const QUESTIONS: QuestionSeed[] = [
  // ── Strategy & Leadership ────────────────────────────────────────────────
  {
    slug: 'strategy-politica',
    dimensao: 'strategy',
    ordem: 10,
    texto: 'Is there a formalised AI strategy sponsored by leadership?',
    tipo: 'escala',
    opcoes: null,
    obrigatoria: true,
    ajuda: 'Consider an approved document, a named owner and a roadmap with deadlines.',
    rubrica: esc([
      'AI is not discussed on the leadership agenda at all.',
      'Isolated discussions inside technical teams, with no executive sponsorship.',
      'Strategy still in draft, with informal sponsorship from one director.',
      'Strategy published, with an owner, roadmap and approved budget.',
      'Strategy actively operated with targets, quarterly review and course correction.',
    ]),
  },
  {
    slug: 'strategy-patrocinio',
    dimensao: 'strategy',
    ordem: 11,
    texto: 'Who sponsors the AI agenda in the organisation today?',
    tipo: 'escolha',
    opcoes: [
      { label: 'Nobody — there is no formal sponsorship', level: 0 },
      { label: 'An isolated technical leader (IT / data)', level: 1 },
      { label: 'An informal director, with no dedicated budget', level: 2 },
      { label: 'A named C-level executive, with budget and targets', level: 3 },
      { label: 'An executive committee with targets and accountability', level: 4 },
    ],
    obrigatoria: true,
    rubrica: null,
    ajuda: null,
  },
  {
    slug: 'strategy-governanca',
    dimensao: 'strategy',
    ordem: 12,
    texto: 'Which AI governance mechanisms exist today?',
    tipo: 'multipla',
    opcoes: [
      { label: 'Approved AI usage policy', level: 1 },
      { label: 'Recurring AI committee or forum', level: 1 },
      { label: 'Use case catalogue with named owners', level: 1 },
      { label: 'Dedicated and approved budget', level: 1 },
      { label: 'None of these mechanisms', level: 0 },
    ],
    obrigatoria: true,
    rubrica: null,
    ajuda: 'Each active mechanism raises one level (maximum L4).',
  },

  // ── Use Cases & Value ───────────────────────────────────────────────────
  {
    slug: 'usecases-portfolio',
    dimensao: 'usecases',
    ordem: 20,
    texto: 'Is there a prioritised portfolio of AI use cases?',
    tipo: 'escala',
    opcoes: null,
    obrigatoria: true,
    ajuda: null,
    rubrica: esc([
      'No use case identified or catalogued.',
      'Scattered ideas, with no prioritisation criteria.',
      'Backlog prioritised by value × feasibility, without formal approval.',
      'Approved portfolio with owners, waves and budget.',
      'Portfolio managed with value metrics and periodic re-assessment.',
    ]),
  },
  {
    slug: 'usecases-producao',
    dimensao: 'usecases',
    ordem: 21,
    texto: 'How many AI use cases are effectively in production?',
    tipo: 'escolha',
    opcoes: [
      { label: 'None', level: 0 },
      { label: 'Proofs of concept only, none in production', level: 1 },
      { label: '1 to 2 cases in production', level: 2 },
      { label: '3 to 5 cases in production', level: 3 },
      { label: 'More than 5 cases, scaled across areas', level: 4 },
    ],
    obrigatoria: true,
    rubrica: null,
    ajuda: null,
  },
  {
    slug: 'usecases-valor',
    dimensao: 'usecases',
    ordem: 22,
    texto: 'Do use cases have measured benefit with baseline and KPI?',
    tipo: 'escala',
    opcoes: null,
    obrigatoria: true,
    ajuda: null,
    rubrica: esc([
      'No benefit measurement at all.',
      'Benefit reported qualitatively, case by case.',
      'KPIs defined, but without a reliable baseline.',
      'Baseline and KPI tracked on a dashboard for the main cases.',
      'Value captured and audited by FinOps/Controlling, with periodic review.',
    ]),
  },

  // ── Data & Knowledge ────────────────────────────────────────────────────
  {
    slug: 'data-governanca',
    dimensao: 'data',
    ordem: 30,
    texto: 'Does the organisation have data governance (catalogue, ownership, quality)?',
    tipo: 'escala',
    opcoes: null,
    obrigatoria: true,
    ajuda: null,
    rubrica: esc([
      'There is no catalogue, ownership or quality criteria.',
      'Manual, one-off controls that depend on key people.',
      'Catalogue and owners defined for a subset of domains.',
      'Governance with roles, catalogue and quality metrics in use.',
      'Quality monitored by SLA, with data contracts and automated remediation.',
    ]),
  },
  {
    slug: 'data-acesso',
    dimensao: 'data',
    ordem: 31,
    texto: 'How mature is data access for AI initiatives?',
    tipo: 'escolha',
    opcoes: [
      { label: 'Scattered spreadsheets, no integration', level: 0 },
      { label: 'Manual extraction on demand', level: 1 },
      { label: 'Data warehouse queried through IT requests', level: 2 },
      { label: 'Platform with self-service for analysts', level: 3 },
      { label: 'Self-service platform with catalogue, lineage and SLA', level: 4 },
    ],
    obrigatoria: true,
    rubrica: null,
    ajuda: null,
  },
  {
    slug: 'data-conhecimento',
    dimensao: 'data',
    ordem: 32,
    texto: 'Is there a structured, authorised knowledge base for generative AI (RAG)?',
    tipo: 'escolha',
    opcoes: [
      { label: 'None — content lives only in scattered documents', level: 0 },
      { label: 'Ad hoc repositories, without curation', level: 1 },
      { label: 'Partial repository, curated manually', level: 2 },
      { label: 'Curated, versioned base with access control', level: 3 },
      { label: 'Curated base, measured by usage and continuously updated', level: 4 },
    ],
    obrigatoria: true,
    rubrica: null,
    ajuda: null,
  },

  // ── Technology & Architecture ───────────────────────────────────────────
  {
    slug: 'tech-plataforma',
    dimensao: 'tech',
    ordem: 40,
    texto: 'Is the AI platform defined (models, gateway, MLOps/LLMOps)?',
    tipo: 'escala',
    opcoes: null,
    obrigatoria: true,
    ajuda: null,
    rubrica: esc([
      'Ad hoc use of public tools, with no standard.',
      'Tools chosen by each team, without integration.',
      'Reference architecture designed, with partial adoption.',
      'Standardised platform with gateway, versioning and CI/CD.',
      'Platform with model observability, continuous evaluation and integrated FinOps.',
    ]),
  },
  {
    slug: 'tech-componentes',
    dimensao: 'tech',
    ordem: 41,
    texto: 'Which AI platform components exist today?',
    tipo: 'multipla',
    opcoes: [
      { label: 'Model gateway/proxy with centralised credentials', level: 1 },
      { label: 'Call observability (logs, traces, costs)', level: 1 },
      { label: 'CI/CD and prompt/model versioning', level: 1 },
      { label: 'Vector database / retrieval layer (RAG)', level: 1 },
      { label: 'None of these components', level: 0 },
    ],
    obrigatoria: true,
    rubrica: null,
    ajuda: 'Each active component raises one level (maximum L4).',
  },
  {
    slug: 'tech-integracao',
    dimensao: 'tech',
    ordem: 42,
    texto: 'How do AI models integrate with core systems (ERP, CRM, core platform)?',
    tipo: 'escolha',
    opcoes: [
      { label: 'No integration — used in isolated tools', level: 0 },
      { label: 'One-off, manual integrations', level: 1 },
      { label: 'API integrations for some flows', level: 2 },
      { label: 'Standardised integrations with security and monitoring', level: 3 },
      { label: 'Orchestration layer with a service catalogue and SLA', level: 4 },
    ],
    obrigatoria: true,
    rubrica: null,
    ajuda: null,
  },

  // ── Security, Risk & Governance ─────────────────────────────────────────
  {
    slug: 'security-politica',
    dimensao: 'security',
    ordem: 50,
    texto: 'Is there a published and enforced responsible AI usage policy?',
    tipo: 'escala',
    opcoes: null,
    obrigatoria: true,
    ajuda: null,
    rubrica: esc([
      'There is no policy or guidance on AI usage.',
      'Informal guidance, with no approved document.',
      'Policy in draft, with no exception process.',
      'Policy published, with use classification and an exception channel.',
      'Policy enforced with auditing, training and periodic review.',
    ]),
  },
  {
    slug: 'security-risco',
    dimensao: 'security',
    ordem: 51,
    texto: 'How are AI risks assessed before going to production?',
    tipo: 'escolha',
    opcoes: [
      { label: 'There is no risk assessment', level: 0 },
      { label: 'Informal assessment, case by case', level: 1 },
      { label: 'Risk checklist applied to relevant projects', level: 2 },
      { label: 'Formal assessment with security/compliance sign-off', level: 3 },
      { label: 'Continuous assessment, with risk register and monitoring', level: 4 },
    ],
    obrigatoria: true,
    rubrica: null,
    ajuda: null,
  },
  {
    slug: 'security-privacidade',
    dimensao: 'security',
    ordem: 52,
    texto: 'Which privacy and security controls are applied to generative AI?',
    tipo: 'multipla',
    opcoes: [
      { label: 'Personal data masking (PII)', level: 1 },
      { label: 'Sensitive data blocking / DLP on prompts', level: 1 },
      { label: 'Human review for sensitive decisions', level: 1 },
      { label: 'Prompt and response logging and auditing', level: 1 },
      { label: 'No control applied', level: 0 },
    ],
    obrigatoria: true,
    rubrica: null,
    ajuda: null,
  },
  {
    slug: 'security-conformidade',
    dimensao: 'security',
    ordem: 53,
    texto: 'Is applicable AI regulation mapped (GDPR/LGPD, AI Act, sector rules)?',
    tipo: 'escala',
    opcoes: null,
    obrigatoria: true,
    ajuda: null,
    rubrica: esc([
      'No regulatory mapping has been carried out.',
      'Requirements known informally, with no plan.',
      'Partial mapping, with gaps identified.',
      'Requirements mapped with controls and owners defined.',
      'Compliance monitored with evidence and periodic review.',
    ]),
  },

  // ── People & Operations ─────────────────────────────────────────────────
  {
    slug: 'people-capacitacao',
    dimensao: 'people',
    ordem: 60,
    texto: 'Is there an AI capability programme by role (business, technical, leadership)?',
    tipo: 'escala',
    opcoes: null,
    obrigatoria: true,
    ajuda: null,
    rubrica: esc([
      'No structured capability building.',
      'One-off training, driven by individual initiative.',
      'Learning paths defined for some roles, with limited adoption.',
      'Programme by role with coverage targets and up-to-date material.',
      'Programme measured by practical application, with certification and an active community.',
    ]),
  },
  {
    slug: 'people-time',
    dimensao: 'people',
    ordem: 61,
    texto: 'How is the AI team structured today?',
    tipo: 'escolha',
    opcoes: [
      { label: 'No dedicated team', level: 0 },
      { label: 'Part-time effort from one or two people', level: 1 },
      { label: 'Small, multidisciplinary and informal team', level: 2 },
      { label: 'Formal team with defined roles (product, data, engineering)', level: 3 },
      { label: 'Teams federated by domain, with a CoE and AI career path', level: 4 },
    ],
    obrigatoria: true,
    rubrica: null,
    ajuda: null,
  },
  {
    slug: 'people-cultura',
    dimensao: 'people',
    ordem: 62,
    texto: 'Is there a community of practice and incentives for AI adoption?',
    tipo: 'escala',
    opcoes: null,
    obrigatoria: true,
    ajuda: null,
    rubrica: esc([
      'No community and no incentives.',
      'Spontaneous initiatives, with no formal support.',
      'Active community, not linked to targets or recognition.',
      'Community with regular meetups and leadership sponsorship.',
      'Adoption incentivised in area targets and formally recognised.',
    ]),
  },

  // ── Economics & AI FinOps ───────────────────────────────────────────────
  {
    slug: 'economics-visibilidade',
    dimensao: 'economics',
    ordem: 70,
    texto: 'Is AI cost visible per use case and per area?',
    tipo: 'escala',
    opcoes: null,
    obrigatoria: true,
    ajuda: null,
    rubrica: esc([
      'AI costs are neither known nor tracked.',
      'Costs appear aggregated under IT, with no detail.',
      'Manual estimates per area, with no allocation.',
      'Consumption and cost monitored per use case.',
      'Cost per transaction/outcome with alerts and continuous optimisation.',
    ]),
  },
  {
    slug: 'economics-orcamento',
    dimensao: 'economics',
    ordem: 71,
    texto: 'How is the AI budget managed today?',
    tipo: 'escolha',
    opcoes: [
      { label: 'There is no specific budget', level: 0 },
      { label: 'One-off funding, case by case', level: 1 },
      { label: 'A single annual budget, without formal prioritisation', level: 2 },
      { label: 'Budget per initiative, with approval and tracking', level: 3 },
      { label: 'Budget by expected value, with quarterly review and chargeback', level: 4 },
    ],
    obrigatoria: true,
    rubrica: null,
    ajuda: null,
  },
  {
    slug: 'economics-finops',
    dimensao: 'economics',
    ordem: 72,
    texto: 'Which AI FinOps practices are in use?',
    tipo: 'multipla',
    opcoes: [
      { label: 'AI cost allocation/chargeback per area', level: 1 },
      { label: 'Budget and alerts per use case', level: 1 },
      { label: 'Token/model optimisation and caching', level: 1 },
      { label: 'Business case with cost × benefit per initiative', level: 1 },
      { label: 'None of these practices', level: 0 },
    ],
    obrigatoria: true,
    rubrica: null,
    ajuda: null,
  },

  // ── Open context (not scored) ───────────────────────────────────────────
  {
    slug: 'contexto-objetivo',
    dimensao: 'strategy',
    ordem: 80,
    texto: 'In one sentence, what is the company’s main AI objective for the next 12 months?',
    tipo: 'texto',
    opcoes: null,
    obrigatoria: false,
    rubrica: null,
    ajuda: 'Optional. This text appears in the executive summary of the report.',
  },
]
