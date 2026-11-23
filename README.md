# readiness-app-lite · Assessment de Maturidade em IA

Aplicação web da **Unified Technologies** para oferecer assessment de prontidão em IA de forma automatizada:
cadastro do cliente → questionário único → relatório automático → dashboard do administrador.

Stack: **Hono + Cloudflare Workers/Pages + D1**, sem dependências nativas (PDF via print CSS, XLSX gerado no Worker).

## URLs

- **Sandbox (preview)**: https://3000-i6kkz434e1cmpklz09rwv-b9b802c4.sandbox.novita.ai
- **Produção**: pendente de definição do caminho de deploy (Genspark hospedado ou conta Cloudflare própria)

## Acessos

- **Administrador** (único perfil autenticado — conforme definido): `/login`
  - E-mail: `admin@unifiedtech.com`
  - Senha: `Unified@2026`
  - Enquanto a senha padrão não for trocada, a própria tela de login exibe o bloco **"Primeiro acesso"** com essas credenciais.
  - Não existe tela de cadastro de usuário: o administrador é criado automaticamente no primeiro boot. Para trocar nome/e-mail/senha use **Configurações → Acesso do administrador** (`/configuracoes#acesso`). Também é possível definir `ADMIN_EMAIL`/`ADMIN_PASSWORD` no ambiente antes do primeiro boot em produção.
- **Cliente**: não faz login. Acessa `/a/<token>` — link único gerado no cadastro, com expiração (padrão 30 dias).

## Como usar (guia)

Há um guia em 5 passos dentro do sistema em **`/ajuda`** (menu "Como usar"):

1. **Entrar como administrador** — `/login` com as credenciais acima.
2. **Cadastrar o cliente** — em *Novo cliente*, com nome **e e-mail do responsável**. É para esse e-mail que o convite vai.
3. **Configurar o envio de e-mail** (uma vez) — em *Configurações → Envio de e-mail*: chave de API do Resend (recomendado) ou SendGrid, remetente verificado, assunto, texto e validade do link. O botão *Testar* confirma a entrega.
4. **O cliente responde pelo link** — sem senha, com autosave; pode fechar e voltar até enviar.
5. **O relatório é gerado na hora** — índice, quadro das 7 dimensões, radar atual × meta, iniciativas priorizadas e plano de 90 dias; PDF/XLSX disponíveis para o cliente e para o administrador.

### Como o e-mail do cliente é criado

O cliente **não tem conta de e-mail no sistema**. O "e-mail do cliente" é o *convite* enviado ao e-mail do responsável:

- Se a chave de API estiver configurada em `/configuracoes#email`, o convite é disparado automaticamente no cadastro (e no *Reenviar link*).
- Sem chave configurada, o link aparece na tela após o cadastro e na ficha do cliente, com botão **Copiar** — nesse caso você envia do seu e-mail corporativo.
- O assunto e o corpo do convite são editáveis em Configurações, com as variáveis `{{empresa}}`, `{{responsavel}}`, `{{link}}` e `{{expira}}`.

## Identidade visual

Extraída do site institucional (unifiedtech.com): navy `#080048`, azul `#4878B0`, acento lima `#A8D432`,
logo oficial em `public/static/logo.png`, tipografia Inter. Layout de relatório e login seguem o padrão corporativo UT.

## Fluxo implementado (MVP completo)

| Módulo | Requisitos | Estado |
|---|---|---|
| A — Cadastro de cliente | RF-A1..A4 | ✅ cadastro, link único, reenvio com rotação de token, edição, exclusão lógica, e-mail (Resend, com fallback para cópia manual) |
| B — Formulário | RF-B1..B6 | ✅ 7 dimensões / 22 perguntas, escala 1–5 com âncoras, escolha, múltipla, texto, metas por dimensão, 5 iniciativas, autosave, progresso, revisão com bloqueio, travamento pós-envio |
| C — Relatório | RF-C1..C5 | ✅ motor de cálculo (piso da média), capa, resumo executivo, scorecard, radar SVG atual×meta, iniciativas priorizadas, plano de 90 dias, aviso de autoavaliação, versionamento v1/v2, PDF e XLSX |
| D — Dashboard | RF-D1..D4 | ✅ KPIs, distribuição das 7 dimensões, tabela com busca/filtros/ações, visão do relatório, exportação CSV/XLSX da base completa |
| Fase 2 | RF-A5, B7, D5 | ⏳ auto-cadastro público, editor de perguntas/pesos, gráficos de evolução, lembrete automático, benchmark |

## Regras de cálculo (implementadas)

- **Nível da dimensão** = `floor(média das perguntas da dimensão)`, sem arredondar para cima.
- **Pergunta escala**: opção 1→L0, 2→L1, 3→L2, 4→L3, 5→L4 (âncoras da rubrica visíveis).
- **Múltipla escolha (mecanismos)**: cada mecanismo ativo = +1 nível; "nenhum" = L0.
- **Índice geral** = média das 7 dimensões, exibido em escala 0–5 (`média4 × 1,25`).
- **Gap** = meta declarada − nível atual; **prioridade** pela matriz gap × urgência, com piso: L0 → Crítica, L1 → no mínimo Alta.
- **Iniciativas**: priorizadas por urgência × dimensão de suporte; se a dimensão estiver `Critical` recebem a nota *"executar após resolver [dimensão]"*.
- **Confiança reduzida**: dimensões com perguntas obrigatórias em branco ganham selo com contagem `respondidas/total`.

## Modelo de dados (D1)

`clients`, `assessments`, `questions`, `responses`, `dimension_targets`, `initiatives`, `reports`,
`admin_users`, `sessions`, `report_access_log`, `audit_log`, `settings`.

- Exclusão é **lógica** (`clients.ativo = 0`, `excluido_em`, `excluido_por`) — nada é apagado.
- Perguntas são versionadas (`questions.versao`); cada assessment guarda a versão com que nasceu (RF-B7).
- Trilha de auditoria em `audit_log` (ator, ação, entidade, detalhe, timestamp).
- Acessos ao relatório registrados em `report_access_log` (origem cliente/admin, IP, user-agent).

## Endpoints

| Rota | Método | Perfil | Função |
|---|---|---|---|
| `/login`, `/logout` | GET/POST | Admin | Autenticação (sessão HttpOnly, 12 h) |
| `/ajuda` | GET | Admin | Guia "Como usar" em 5 passos + FAQ |
| `/configuracoes` | GET | Admin | Acesso do administrador + envio de e-mail + teste |
| `/configuracoes/acesso` | POST | Admin | Troca de nome/e-mail/senha (exige senha atual) |
| `/configuracoes/email` | POST | Admin | Provedor, chave de API, remetente, assunto, texto, validade do link |
| `/configuracoes/testar` | POST | Admin | Envia e-mail de teste com a configuração salva |
| `/painel` | GET | Admin | Dashboard, KPIs, filtros |
| `/painel/export.csv` · `.xlsx` | GET | Admin | Base completa (clientes, respostas, índices, iniciativas) |
| `/clientes/novo` | GET/POST | Admin | Cadastro + geração de link + e-mail |
| `/clientes/:id` | GET | Admin | Ficha, respostas, relatórios, ações |
| `/clientes/:id/editar` | GET/POST | Admin | Edição |
| `/clientes/:id/reenviar` | POST | Admin | Novo token (invalida anterior) |
| `/clientes/:id/reabrir` | POST | Admin | Reabre formulário → nova versão do relatório |
| `/clientes/:id/excluir` | POST | Admin | Exclusão lógica |
| `/clientes/:id/relatorio` · `.pdf` · `.xlsx` | GET | Admin | Relatório por versão (`?v=`) |
| `/a/:token` | GET | Cliente | Formulário |
| `/api/a/:token/save` | POST | Cliente | Autosave (respostas, metas, iniciativas) |
| `/api/a/:token/submit` | POST | Cliente | Valida pendências e gera relatório |
| `/a/:token/relatorio` · `.pdf` · `.xlsx` | GET | Cliente | Relatório e exportações |
| `/a/:token/respostas` | GET | Cliente | Respostas em modo somente leitura |

## Comandos

```bash
npm run build                 # vite build → dist/_worker.js
npm run typecheck             # tsc --noEmit
pm2 start ecosystem.config.cjs  # dev local em :3000 (wrangler pages dev + D1 local)
npx wrangler d1 migrations apply readiness-app-lite --local
```

## Variáveis / secrets

| Nome | Onde | Uso |
|---|---|---|
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | env/secret | Administrador criado no primeiro boot |
| `RESEND_API_KEY` | secret | Envio de convite/reenvio (sem ela, o link fica copiável na tela) |
| `MAIL_FROM` | var | Remetente verificado no provedor |
| `LINK_TTL_DAYS` | var (30) | Expiração do link |

## Próximos passos

1. Definir o caminho de deploy (hospedagem Genspark vs. conta Cloudflare própria) e publicar com D1 de produção.
2. Configurar `RESEND_API_KEY` (ou SendGrid) para ativar o envio automático e o lembrete de véspera.
3. Trocar a senha do administrador e criar usuários adicionais da prática.
4. Fase 2: auto-cadastro com aprovação, editor de perguntas/pesos, gráficos de evolução, benchmark anônimo.
