// Banco de perguntas v1 — 7 dimensões, 22 perguntas, rubricas L0–L4.
// Chave estável por pergunta (slug) para permitir tradução EN/ES no futuro.

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
    nome: 'Strategy & Leadership',
    short: 'Estratégia',
    descricao: 'Direção, patrocínio executivo e governança da agenda de IA.',
    cor: '#080048',
    icone: 'fa-compass',
  },
  {
    key: 'usecases',
    nome: 'Use Cases & Value',
    short: 'Casos de uso',
    descricao: 'Portfólio priorizado de casos de uso e valor comprovado.',
    cor: '#1f4fa8',
    icone: 'fa-bullseye',
  },
  {
    key: 'data',
    nome: 'Data & Knowledge',
    short: 'Dados',
    descricao: 'Qualidade, governança e disponibilidade de dados e conhecimento.',
    cor: '#2f6fb5',
    icone: 'fa-database',
  },
  {
    key: 'tech',
    nome: 'Technology & Architecture',
    short: 'Tecnologia',
    descricao: 'Plataforma, integração, MLOps e observabilidade de IA.',
    cor: '#3f8ac0',
    icone: 'fa-sitemap',
  },
  {
    key: 'security',
    nome: 'Security, Risk & Governance',
    short: 'Segurança',
    descricao: 'Uso responsável, privacidade, riscos e conformidade.',
    cor: '#0f7f8f',
    icone: 'fa-shield-halved',
  },
  {
    key: 'people',
    nome: 'People & Operations',
    short: 'Pessoas',
    descricao: 'Capacitação, organização e cultura de adoção.',
    cor: '#4878b0',
    icone: 'fa-users',
  },
  {
    key: 'economics',
    nome: 'Economics & AI FinOps',
    short: 'FinOps',
    descricao: 'Custo, orçamento e retorno dos investimentos em IA.',
    cor: '#6a8fb8',
    icone: 'fa-chart-pie',
  },
]

export const DIM_MAP: Record<string, Dimension> = Object.fromEntries(
  DIMENSIONS.map((d) => [d.key, d])
) as Record<string, Dimension>

export const LEVEL_LABELS = [
  'L0 · Inexistente',
  'L1 · Inicial / ad hoc',
  'L2 · Definido (rascunho)',
  'L3 · Gerenciado (publicado)',
  'L4 · Otimizado (medido)',
]

export const LEVEL_DESC = [
  'Não existe prática, política ou discussão estruturada.',
  'Ações pontuais e individuais, sem padrão ou patrocínio.',
  'Prática desenhada e documentada, porém parcialmente adotada.',
  'Prática publicada, com dono, processo e adoção real.',
  'Prática medida, revisada periodicamente e otimizada.',
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
    texto: 'Existe uma estratégia de IA formalizada e patrocinada pela liderança?',
    tipo: 'escala',
    opcoes: null,
    obrigatoria: true,
    ajuda: 'Considere documento aprovado, dono nomeado e roadmap com prazos.',
    rubrica: esc([
      'Não há qualquer discussão sobre IA na agenda da liderança.',
      'Discussões isoladas de áreas técnicas, sem patrocínio executivo.',
      'Estratégia em rascunho, patrocínio informal de um diretor.',
      'Estratégia publicada, com dono, roadmap e orçamento aprovado.',
      'Estratégia operada com metas, revisão trimestral e ajuste de rota.',
    ]),
  },
  {
    slug: 'strategy-patrocinio',
    dimensao: 'strategy',
    ordem: 11,
    texto: 'Quem patrocina a agenda de IA na organização hoje?',
    tipo: 'escolha',
    opcoes: [
      { label: 'Ninguém — não há patrocínio formal', level: 0 },
      { label: 'Liderança técnica isolada (TI / dados)', level: 1 },
      { label: 'Um diretor informal, sem orçamento próprio', level: 2 },
      { label: 'C-level nomeado, com orçamento e metas', level: 3 },
      { label: 'Comitê executivo com metas e prestação de contas', level: 4 },
    ],
    obrigatoria: true,
    rubrica: null,
    ajuda: null,
  },
  {
    slug: 'strategy-governanca',
    dimensao: 'strategy',
    ordem: 12,
    texto: 'Quais mecanismos de governança de IA existem hoje?',
    tipo: 'multipla',
    opcoes: [
      { label: 'Política de uso de IA aprovada', level: 1 },
      { label: 'Comitê ou fórum periódico de IA', level: 1 },
      { label: 'Catálogo de casos de uso com donos', level: 1 },
      { label: 'Orçamento dedicado e aprovado', level: 1 },
      { label: 'Nenhum desses mecanismos', level: 0 },
    ],
    obrigatoria: true,
    rubrica: null,
    ajuda: 'Cada mecanismo ativo eleva um nível (máximo L4).',
  },

  // ── Use Cases & Value ───────────────────────────────────────────────────
  {
    slug: 'usecases-portfolio',
    dimensao: 'usecases',
    ordem: 20,
    texto: 'Existe um portfólio priorizado de casos de uso de IA?',
    tipo: 'escala',
    opcoes: null,
    obrigatoria: true,
    ajuda: null,
    rubrica: esc([
      'Nenhum caso de uso identificado ou catalogado.',
      'Ideias dispersas, sem critério de priorização.',
      'Backlog priorizado por valor × viabilidade, sem aprovação formal.',
      'Portfólio aprovado com donos, ondas e orçamento.',
      'Portfólio gerido com métricas de valor e reavaliação periódica.',
    ]),
  },
  {
    slug: 'usecases-producao',
    dimensao: 'usecases',
    ordem: 21,
    texto: 'Quantos casos de uso de IA estão efetivamente em produção?',
    tipo: 'escolha',
    opcoes: [
      { label: 'Nenhum', level: 0 },
      { label: 'Apenas provas de conceito, nenhuma em produção', level: 1 },
      { label: '1 a 2 casos em produção', level: 2 },
      { label: '3 a 5 casos em produção', level: 3 },
      { label: 'Mais de 5 casos, com escala entre áreas', level: 4 },
    ],
    obrigatoria: true,
    rubrica: null,
    ajuda: null,
  },
  {
    slug: 'usecases-valor',
    dimensao: 'usecases',
    ordem: 22,
    texto: 'Os casos de uso têm benefício mensurado com baseline e KPI?',
    tipo: 'escala',
    opcoes: null,
    obrigatoria: true,
    ajuda: null,
    rubrica: esc([
      'Nenhuma medição de benefício.',
      'Benefício relatado de forma qualitativa, caso a caso.',
      'KPIs definidos, mas sem baseline confiável.',
      'Baseline e KPI acompanhados em painel para os principais casos.',
      'Valor capturado e auditado em FinOps/Controladoria, com revisão periódica.',
    ]),
  },

  // ── Data & Knowledge ────────────────────────────────────────────────────
  {
    slug: 'data-governanca',
    dimensao: 'data',
    ordem: 30,
    texto: 'A organização tem governança de dados (catálogo, ownership, qualidade)?',
    tipo: 'escala',
    opcoes: null,
    obrigatoria: true,
    ajuda: null,
    rubrica: esc([
      'Não há catálogo, donos nem critérios de qualidade.',
      'Controles manuais e pontuais, dependentes de pessoas-chave.',
      'Catálogo e donos definidos para um subconjunto de domínios.',
      'Governança com papéis, catálogo e métricas de qualidade em uso.',
      'Qualidade monitorada por SLA, com contratos de dados e correção automatizada.',
    ]),
  },
  {
    slug: 'data-acesso',
    dimensao: 'data',
    ordem: 31,
    texto: 'Qual a maturidade do acesso a dados para iniciativas de IA?',
    tipo: 'escolha',
    opcoes: [
      { label: 'Planilhas dispersas, sem integração', level: 0 },
      { label: 'Extração manual sob demanda', level: 1 },
      { label: 'Data warehouse com consultas de TI', level: 2 },
      { label: 'Plataforma com self-service para analistas', level: 3 },
      { label: 'Plataforma self-service com catálogo, linhagem e SLA', level: 4 },
    ],
    obrigatoria: true,
    rubrica: null,
    ajuda: null,
  },
  {
    slug: 'data-conhecimento',
    dimensao: 'data',
    ordem: 32,
    texto: 'Existe base de conhecimento estruturada e autorizada para IA generativa (RAG)?',
    tipo: 'escolha',
    opcoes: [
      { label: 'Não existe — conteúdo apenas em documentos dispersos', level: 0 },
      { label: 'Repositórios ad hoc, sem curadoria', level: 1 },
      { label: 'Repositório parcial, com curadoria manual', level: 2 },
      { label: 'Base curada, versionada e com controle de acesso', level: 3 },
      { label: 'Base curada, medida por uso e com atualização contínua', level: 4 },
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
    texto: 'A plataforma de IA está definida (modelos, gateway, MLOps/LLMOps)?',
    tipo: 'escala',
    opcoes: null,
    obrigatoria: true,
    ajuda: null,
    rubrica: esc([
      'Uso ad hoc de ferramentas públicas, sem padrão.',
      'Ferramentas escolhidas por time, sem integração.',
      'Arquitetura de referência desenhada, adoção parcial.',
      'Plataforma padronizada com gateway, versionamento e CI/CD.',
      'Plataforma com observabilidade de modelos, avaliação contínua e FinOps integrado.',
    ]),
  },
  {
    slug: 'tech-componentes',
    dimensao: 'tech',
    ordem: 41,
    texto: 'Quais componentes de plataforma de IA existem hoje?',
    tipo: 'multipla',
    opcoes: [
      { label: 'Gateway/proxy de modelos com credenciais centralizadas', level: 1 },
      { label: 'Observabilidade de chamadas (logs, traces, custos)', level: 1 },
      { label: 'CI/CD e versionamento de prompts/modelos', level: 1 },
      { label: 'Base vetorial / camada de recuperação (RAG)', level: 1 },
      { label: 'Nenhum desses componentes', level: 0 },
    ],
    obrigatoria: true,
    rubrica: null,
    ajuda: 'Cada componente ativo eleva um nível (máximo L4).',
  },
  {
    slug: 'tech-integracao',
    dimensao: 'tech',
    ordem: 42,
    texto: 'Como os modelos de IA se integram aos sistemas centrais (ERP, CRM, core)?',
    tipo: 'escolha',
    opcoes: [
      { label: 'Não há integração — uso em ferramentas isoladas', level: 0 },
      { label: 'Integrações pontuais e manuais', level: 1 },
      { label: 'Integrações via API para alguns fluxos', level: 2 },
      { label: 'Integrações padronizadas com segurança e monitoração', level: 3 },
      { label: 'Camada de orquestração com catálogo de serviços e SLA', level: 4 },
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
    texto: 'Existe política de uso responsável de IA publicada e aplicada?',
    tipo: 'escala',
    opcoes: null,
    obrigatoria: true,
    ajuda: null,
    rubrica: esc([
      'Não existe política nem orientação sobre uso de IA.',
      'Orientações informais, sem documento aprovado.',
      'Política em rascunho, sem processo de exceção.',
      'Política publicada, com classificação de uso e canal de exceções.',
      'Política aplicada com auditoria, treinamento e revisão periódica.',
    ]),
  },
  {
    slug: 'security-risco',
    dimensao: 'security',
    ordem: 51,
    texto: 'Como os riscos de IA são avaliados antes de entrar em produção?',
    tipo: 'escolha',
    opcoes: [
      { label: 'Não há avaliação de risco', level: 0 },
      { label: 'Avaliação informal, caso a caso', level: 1 },
      { label: 'Checklist de risco aplicado a projetos relevantes', level: 2 },
      { label: 'Avaliação formal com aprovação de segurança/compliance', level: 3 },
      { label: 'Avaliação contínua, com registro de riscos e monitoração', level: 4 },
    ],
    obrigatoria: true,
    rubrica: null,
    ajuda: null,
  },
  {
    slug: 'security-privacidade',
    dimensao: 'security',
    ordem: 52,
    texto: 'Quais controles de privacidade e segurança são aplicados em IA generativa?',
    tipo: 'multipla',
    opcoes: [
      { label: 'Mascaramento de dados pessoais (PII)', level: 1 },
      { label: 'Bloqueio de dados sensíveis / DLP nos prompts', level: 1 },
      { label: 'Revisão humana em decisões sensíveis', level: 1 },
      { label: 'Registro e auditoria de prompts e respostas', level: 1 },
      { label: 'Nenhum controle aplicado', level: 0 },
    ],
    obrigatoria: true,
    rubrica: null,
    ajuda: null,
  },
  {
    slug: 'security-conformidade',
    dimensao: 'security',
    ordem: 53,
    texto: 'A conformidade regulatória aplicável à IA está mapeada (LGPD, AI Act, setorial)?',
    tipo: 'escala',
    opcoes: null,
    obrigatoria: true,
    ajuda: null,
    rubrica: esc([
      'Nenhum mapeamento regulatório realizado.',
      'Requisitos conhecidos informalmente, sem plano.',
      'Mapeamento parcial, com lacunas identificadas.',
      'Requisitos mapeados com controles e responsáveis definidos.',
      'Conformidade monitorada com evidências e revisão periódica.',
    ]),
  },

  // ── People & Operations ─────────────────────────────────────────────────
  {
    slug: 'people-capacitacao',
    dimensao: 'people',
    ordem: 60,
    texto: 'Existe programa de capacitação em IA por papel (negócio, técnico, liderança)?',
    tipo: 'escala',
    opcoes: null,
    obrigatoria: true,
    ajuda: null,
    rubrica: esc([
      'Nenhuma capacitação estruturada.',
      'Treinamentos pontuais, por iniciativa individual.',
      'Trilhas definidas para alguns papéis, adoção limitada.',
      'Programa por papel com metas de cobertura e materiais atualizados.',
      'Programa medido por aplicação prática, com certificação e comunidade ativa.',
    ]),
  },
  {
    slug: 'people-time',
    dimensao: 'people',
    ordem: 61,
    texto: 'Como o time de IA está estruturado hoje?',
    tipo: 'escolha',
    opcoes: [
      { label: 'Não há time dedicado', level: 0 },
      { label: 'Esforço parcial de uma ou duas pessoas', level: 1 },
      { label: 'Time pequeno, multidisciplinar e informal', level: 2 },
      { label: 'Time formal com papéis definidos (produto, dados, engenharia)', level: 3 },
      { label: 'Times federados por domínio, com CoE e carreira de IA', level: 4 },
    ],
    obrigatoria: true,
    rubrica: null,
    ajuda: null,
  },
  {
    slug: 'people-cultura',
    dimensao: 'people',
    ordem: 62,
    texto: 'Existe comunidade de prática e incentivos para adoção de IA?',
    tipo: 'escala',
    opcoes: null,
    obrigatoria: true,
    ajuda: null,
    rubrica: esc([
      'Nenhuma comunidade ou incentivo.',
      'Iniciativas espontâneas, sem apoio formal.',
      'Comunidade ativa, sem ligação com metas ou reconhecimento.',
      'Comunidade com encontros regulares e patrocínio da liderança.',
      'Adoção incentivada em metas de área e reconhecimento formal.',
    ]),
  },

  // ── Economics & AI FinOps ───────────────────────────────────────────────
  {
    slug: 'economics-visibilidade',
    dimensao: 'economics',
    ordem: 70,
    texto: 'Existe visibilidade de custos de IA por caso de uso e por área?',
    tipo: 'escala',
    opcoes: null,
    obrigatoria: true,
    ajuda: null,
    rubrica: esc([
      'Custos de IA não são conhecidos nem rastreados.',
      'Custos aparecem agregados em TI, sem detalhe.',
      'Estimativas manuais por área, sem rateio.',
      'Consumo e custo monitorados por caso de uso.',
      'Custo por transação/resultado com alertas e otimização contínua.',
    ]),
  },
  {
    slug: 'economics-orcamento',
    dimensao: 'economics',
    ordem: 71,
    texto: 'Como o orçamento de IA é gerido hoje?',
    tipo: 'escolha',
    opcoes: [
      { label: 'Não há orçamento específico', level: 0 },
      { label: 'Verba pontual, caso a caso', level: 1 },
      { label: 'Orçamento anual único, sem priorização formal', level: 2 },
      { label: 'Orçamento por iniciativa, com aprovação e acompanhamento', level: 3 },
      { label: 'Orçamento por valor esperado, com revisão trimestral e chargeback', level: 4 },
    ],
    obrigatoria: true,
    rubrica: null,
    ajuda: null,
  },
  {
    slug: 'economics-finops',
    dimensao: 'economics',
    ordem: 72,
    texto: 'Quais práticas de AI FinOps estão em uso?',
    tipo: 'multipla',
    opcoes: [
      { label: 'Rateio/chargeback de custo de IA por área', level: 1 },
      { label: 'Orçamento e alertas por caso de uso', level: 1 },
      { label: 'Otimização de tokens/modelos e cache', level: 1 },
      { label: 'Business case com custo × benefício por iniciativa', level: 1 },
      { label: 'Nenhuma prática em uso', level: 0 },
    ],
    obrigatoria: true,
    rubrica: null,
    ajuda: null,
  },

  // ── Contexto aberto (não pontua) ────────────────────────────────────────
  {
    slug: 'contexto-objetivo',
    dimensao: 'strategy',
    ordem: 80,
    texto: 'Em uma frase, qual é o principal objetivo da empresa com IA nos próximos 12 meses?',
    tipo: 'texto',
    opcoes: null,
    obrigatoria: false,
    rubrica: null,
    ajuda: 'Opcional. Este texto aparece no resumo executivo do relatório.',
  },
]

// Iniciativas sugeridas por vertical (usadas quando o cliente não declara nenhuma)
export const VERTICAL_SUGGESTIONS: Record<string, { nome: string; problema: string; beneficio: string; urgencia: number; dimensao: DimKey }[]> = {
  saude: [
    { nome: 'Triagem assistida de laudos e exames', problema: 'Volume de exames com tempo de laudo elevado.', beneficio: 'Redução de tempo de laudo e priorização de casos críticos.', urgencia: 3, dimensao: 'usecases' },
    { nome: 'Assistente de prontuário e codificação', problema: 'Documentação clínica manual e glosas.', beneficio: 'Menos retrabalho médico e melhora de faturamento.', urgencia: 2, dimensao: 'data' },
    { nome: 'Agente de agendamento e relacionamento', problema: 'Alto volume de contatos repetitivos.', beneficio: 'Atendimento 24/7 e redução de faltas.', urgencia: 2, dimensao: 'people' },
  ],
  financeiro: [
    { nome: 'Análise de crédito assistida por IA', problema: 'Análise manual lenta e inconsistente.', beneficio: 'Maior velocidade de decisão e consistência de política.', urgencia: 3, dimensao: 'usecases' },
    { nome: 'Detecção de fraude em tempo real', problema: 'Perdas por fraude e regras rígidas.', beneficio: 'Menos perdas com melhor experiência do cliente.', urgencia: 3, dimensao: 'tech' },
    { nome: 'Assistente regulatório e de compliance', problema: 'Esforço alto na interpretação de normas.', beneficio: 'Respostas mais rápidas a órgãos e auditorias.', urgencia: 2, dimensao: 'security' },
  ],
  varejo: [
    { nome: 'Recomendação e personalização de ofertas', problema: 'Baixa conversão e campanhas genéricas.', beneficio: 'Aumento de ticket médio e conversão.', urgencia: 3, dimensao: 'usecases' },
    { nome: 'Previsão de demanda e reposição', problema: 'Ruptura e excesso de estoque.', beneficio: 'Redução de capital em estoque e melhora de disponibilidade.', urgencia: 3, dimensao: 'data' },
    { nome: 'Atendimento automatizado ao consumidor', problema: 'Custo e fila no atendimento.', beneficio: 'Resolução no primeiro contato e redução de custo.', urgencia: 2, dimensao: 'people' },
  ],
  industria: [
    { nome: 'Manutenção preditiva', problema: 'Paradas não planejadas de linha.', beneficio: 'Aumento de disponibilidade e redução de manutenção corretiva.', urgencia: 3, dimensao: 'data' },
    { nome: 'Controle de qualidade por visão computacional', problema: 'Inspeção manual sujeita a erro.', beneficio: 'Menos refugo e maior consistência.', urgencia: 3, dimensao: 'tech' },
    { nome: 'Copiloto de engenharia e documentação técnica', problema: 'Tempo alto em documentação e consulta a normas.', beneficio: 'Produtividade de engenharia e padronização.', urgencia: 2, dimensao: 'people' },
  ],
  tecnologia: [
    { nome: 'Copiloto de engenharia de software', problema: 'Baixa produtividade e dívida técnica.', beneficio: 'Entrega mais rápida com padrões de código.', urgencia: 3, dimensao: 'people' },
    { nome: 'Agente de suporte N1/N2', problema: 'Volume de tickets repetitivos.', beneficio: 'Redução de MTTR e custo de suporte.', urgencia: 3, dimensao: 'usecases' },
    { nome: 'Plataforma interna de IA governada', problema: 'Uso disperso de ferramentas sem controle.', beneficio: 'Centralização de custos, segurança e observabilidade.', urgencia: 2, dimensao: 'tech' },
  ],
  educacao: [
    { nome: 'Tutoria adaptativa ao aluno', problema: 'Baixo engajamento e evasão.', beneficio: 'Melhora de aprendizagem e retenção.', urgencia: 3, dimensao: 'usecases' },
    { nome: 'Apoio à produção de material didático', problema: 'Custo e tempo de produção de conteúdo.', beneficio: 'Conteúdo atualizado com menos esforço docente.', urgencia: 2, dimensao: 'data' },
    { nome: 'Correção assistida e feedback', problema: 'Tempo alto de correção.', beneficio: 'Feedback mais rápido e consistente.', urgencia: 2, dimensao: 'people' },
  ],
  logistica: [
    { nome: 'Otimização de rotas e last mile', problema: 'Custo de combustível e atrasos.', beneficio: 'Redução de custo por entrega.', urgencia: 3, dimensao: 'usecases' },
    { nome: 'Previsão de demanda e ocupação de frota', problema: 'Capacidade ociosa ou insuficiente.', beneficio: 'Melhor uso de ativos.', urgencia: 3, dimensao: 'data' },
    { nome: 'Agente de atendimento a embarcadores', problema: 'Status e ocorrências em canais manuais.', beneficio: 'Visibilidade e redução de contatos.', urgencia: 2, dimensao: 'people' },
  ],
  energia: [
    { nome: 'Previsão de carga e geração', problema: 'Desbalanceamento e custo de energia.', beneficio: 'Melhor programação e redução de custo.', urgencia: 3, dimensao: 'data' },
    { nome: 'Inspeção de ativos por visão computacional', problema: 'Inspeção manual em campo.', beneficio: 'Segurança e detecção precoce de falhas.', urgencia: 3, dimensao: 'tech' },
    { nome: 'Assistente de normas regulatórias', problema: 'Complexidade regulatória setorial.', beneficio: 'Conformidade com menos esforço.', urgencia: 2, dimensao: 'security' },
  ],
  servicos: [
    { nome: 'Prospecção e qualificação comercial assistida', problema: 'Pipeline instável e esforço manual.', beneficio: 'Mais oportunidades qualificadas.', urgencia: 3, dimensao: 'usecases' },
    { nome: 'Assistente de propostas e contratos', problema: 'Tempo alto na elaboração de propostas.', beneficio: 'Ciclo comercial mais curto.', urgencia: 2, dimensao: 'data' },
    { nome: 'Automação de back-office', problema: 'Processos repetitivos em financeiro/administrativo.', beneficio: 'Redução de custo e erro.', urgencia: 2, dimensao: 'people' },
  ],
}

export const DEFAULT_SUGGESTIONS = VERTICAL_SUGGESTIONS.servicos

export function suggestionsFor(vertical: string | null | undefined) {
  if (!vertical) return DEFAULT_SUGGESTIONS
  const v = vertical.toLowerCase()
  const key = Object.keys(VERTICAL_SUGGESTIONS).find((k) => v.includes(k))
  return key ? VERTICAL_SUGGESTIONS[key] : DEFAULT_SUGGESTIONS
}
