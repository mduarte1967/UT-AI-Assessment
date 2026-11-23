# readiness-app-lite · AI Maturity Assessment

Web application by **Unified Technologies** that delivers an AI readiness assessment end to end:
client registration → single questionnaire → automatic report → administrator dashboard.

Stack: **Hono + Cloudflare Workers/Pages + D1**, with no native dependencies (PDF via print CSS, XLSX generated inside the Worker).

## URLs

- **Sandbox (preview)**: https://3000-i6kkz434e1cmpklz09rwv-b9b802c4.sandbox.novita.ai
- **Production**: pending a deployment path decision (Genspark hosted or the customer's own Cloudflare account)

## Access

- **Administrator** (the only authenticated role — as specified): `/login`
  - E-mail: `admin@unifiedtech.com`
  - Password: `Unified@2026`
  - While the default password is unchanged, the login screen itself shows a **"First access"** box with these credentials.
  - There is no user sign-up screen: the administrator is created automatically on first boot. To change name/e-mail/password use **Settings → Administrator access** (`/configuracoes#acesso`). You can also set `ADMIN_EMAIL`/`ADMIN_PASSWORD` in the environment before the first production boot.
- **Client**: no login. The client opens `/a/<token>` — a unique link generated at registration, with an expiry (30 days by default).

## How to use (guide)

An in-app 5-step guide is available at **`/ajuda`** (menu item "How to use"):

1. **Sign in as administrator** — `/login` with the credentials above.
2. **Register the client** — in *New client*, including the **contact name and e-mail**. The invitation goes to that e-mail address.
3. **Configure e-mail delivery** (once) — in *Settings → E-mail delivery*: a Resend API key (recommended) or SendGrid, a verified sender, subject, opening text and link validity. The *Test* button confirms delivery.
4. **The client answers through the link** — no password, with autosave; they can close and return until they submit.
5. **The report is generated immediately** — index, 7-dimension scorecard, current × target radar, prioritised initiatives and a 90-day plan; PDF/XLSX available to both the client and the administrator.

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/login` | Administrator sign-in (shows the first-access box) |
| POST | `/login` | Authenticates and starts the session |
| GET/POST | `/logout` | Ends the session |
| GET | `/painel` | Dashboard: KPIs, dimension distribution, client table, filters, exports |
| GET | `/clientes/novo` | New-client form |
| POST | `/clientes/novo` | Creates the client, the assessment, the unique link and sends the e-mail |
| GET | `/clientes/:id` | Client record: link status, reports, scorecard, answers, targets |
| POST | `/clientes/:id/editar` | Edits client data |
| POST | `/clientes/:id/reenviar` | Rotates the token (invalidating the old link) and re-sends the e-mail |
| POST | `/clientes/:id/reabrir` | Reopens the questionnaire so the client can produce a new response version |
| POST | `/clientes/:id/excluir` | Logical delete |
| GET | `/a/:token` | Client questionnaire (autosave, progress, review, submit) |
| POST | `/api/a/:token/save` | Autosave endpoint |
| POST | `/api/a/:token/submit` | Submits, computes the scorecard and generates the report |
| GET | `/a/:token/relatorio` | Client report (HTML) |
| GET | `/a/:token/relatorio/pdf` | Print/PDF version of the report |
| GET | `/a/:token/relatorio.xlsx` | Report scorecard as XLSX |
| GET | `/relatorios/:id` | Administrator view of any report version |
| GET | `/exportar/clientes.xlsx` / `.csv` | Full client base export |
| GET | `/configuracoes` | Settings: administrator access + e-mail delivery |
| POST | `/configuracoes/acesso` | Changes name, e-mail and password |
| POST | `/configuracoes/email` | Saves the mail provider, sender, subject, intro and link validity |
| POST | `/configuracoes/testar` | Sends a test e-mail |
| GET | `/ajuda` | In-app usage guide |

## Data architecture

- **Storage**: Cloudflare D1 (SQLite). 12 tables — `clients`, `assessments`, `questions`, `responses`, `dimension_targets`, `initiatives`, `reports`, `admin_users`, `sessions`, `settings`, `audit_log`, `schema_meta`.
- **Bootstrap**: idempotent — `SCHEMA_SQL` plus `ensureSeed` run once per isolate. The seed is versioned (`settings.seed_version`); version `2` is the English question bank. Questions are **upserted by slug**, so existing question IDs — and the responses already collected against them — stay valid.
- **Question bank**: 7 dimensions, 23 questions (`src/lib/questions.ts`). Slugs are language-neutral so future EN/ES variants can share the same IDs.
- **Scoring**: dimension level = `floor(mean)` of the per-question levels (rubric based, never rounded up); general index = weighted average 0–4 displayed as `x.x / 5.0`; priority derived from gap × impact with floors (L0 → Critical, L1 → at least High).
- **Security**: PBKDF2-SHA256 (150k iterations) via Web Crypto, opaque session tokens in `sessions` (HttpOnly `SameSite=Lax` cookie, 12h TTL), expiring per-assessment link tokens, per-client data isolation through the token, and an append-only `audit_log`.

## Migrating data from the Portuguese release

`ensureSeed` (seed version 2) also normalises data captured while the UI was in Portuguese: legacy `clients.vertical` and `clients.tamanho_faixa` values are translated, the stored Portuguese mail subject/intro defaults are replaced, and the seeded administrator name is updated.

## Deployment

- **Platform**: Cloudflare Pages
- **Status**: ✅ running in the sandbox preview · production deploy pending the path decision
- **Tech stack**: Hono + TypeScript + D1, UT visual identity (navy `#080048`, blue `#4878B0`, lime `#A8D432`, Inter)
- **Last updated**: 2026-11-23

## Notes

- Real e-mail delivery requires a Resend or SendGrid API key entered in *Settings → E-mail delivery*. With no key the link is still generated and can be copied and sent manually — the event is recorded in the audit trail.
- PDF is produced through the browser's print dialog (print CSS) because Workers cannot run a headless browser.
