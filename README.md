# readiness-app-lite · AI Maturity Assessment

Web application by **Unified Technologies** that delivers an AI readiness assessment end to end:
client registration → single questionnaire → automatic report → administrator dashboard.

Stack: **Hono + Cloudflare Workers/Pages + D1**, with no native dependencies (PDF via print CSS, XLSX generated inside the Worker).

## Two URLs, two audiences

The application is deliberately split into **two separate entry points**. They share the database and
the same visual identity, but they are distinct URL spaces and **nothing in the public site links to the
administrator console** — there is no "admin" button, link or menu item anywhere a client can see.

| | Public assessment site | Administrator console |
|---|---|---|
| **Root** | `/` | `/admin` |
| **Audience** | Prospects and clients (no login) | Unified Technologies staff (password) |
| **Discovery** | Button embedded on unifiedtech.com, or direct link | Typed / bookmarked by the team |
| **Routes** | `/`, `/start`, `/a/:token`, `/a/:token/report` | `/admin`, `/admin/clients/*`, `/admin/settings`, `/admin/help` |

- **Public site (preview)**: https://3000-i6kkz434e1cmpklz09rwv-b9b802c4.sandbox.novita.ai/
- **Public registration form**: https://3000-i6kkz434e1cmpklz09rwv-b9b802c4.sandbox.novita.ai/start
- **Administrator console**: https://3000-i6kkz434e1cmpklz09rwv-b9b802c4.sandbox.novita.ai/admin
- **Production**: pending a deployment path decision (Genspark hosted or the customer's own Cloudflare account)

## Visual identity

Every page uses the **layout of www.unifiedtech.com** as its template: Roboto, the navy
`#0B2545` / blue `#3E6BA5` gradient hero with a 40 px grid overlay, lime `#B0D000` as the call-to-action
accent, white cards with a 4 px lime top-left rule, and the five-column navy site footer with the
*Co-Managed Security Intelligence* signature. The design tokens live in `public/static/app.css`;
the shells (`publicShell`, `adminShell`) in `src/lib/views/layout.ts`.

## Who the clients are

The client model targets **US and Caribbean organisations** (Unified Technologies' market):

| Field | Public form (`/start`) | Admin form (`/admin/clients/new`) |
|---|---|---|
| Legal name | required | required |
| Trading name (DBA) | — *not asked* | optional |
| Tax ID (EIN / registration) | — *not asked* | optional |
| Website | optional | optional |
| Industry | 14 sectors, incl. Insurance, Hospitality, Telecommunications, Government |
| Company size | headcount bands from 1–50 to 5,000+ |
| Country / territory | 44 destinations: US, Puerto Rico, USVI, Guam, Canada, Mexico, the Caribbean, Central and South America |
| State / region | free text with a datalist of US states + DC + territories and Caribbean/LatAm regions |
| City, ZIP / postal code | free text |

The legacy Brazilian fields are **not** used by the application any more. `migrations/0004_us_caribbean_model.sql` (applied automatically by the bootstrap) adds `tax_id`, `country`, `postal_code` and `website`; seed version 3 copies any historical `cnpj` value into `tax_id` and defaults records without a country to Brazil, where they were captured.

## Self-registration (button on the UT website)

Two ways to create a client — the result is identical:

1. **Manual** — the administrator fills in *New client*.
2. **Self-registration** — the prospect fills in the public form at `/start` and the assessment is created for them.

Embed the ready-made button on unifiedtech.com. The snippet is generated for the live domain in **Settings → Public self-registration**:

```html
<a href="https://YOUR-DOMAIN/start"
   style="display:inline-block;padding:14px 30px;background:#B0D000;color:#0B2545;
          font-family:Roboto,Arial,sans-serif;font-weight:700;font-size:16px;
          text-decoration:none;border-radius:9px">
  Start your AI maturity assessment
</a>
```

Flow: prospect clicks the button → `/start` form (organisation + location + contact + consent) → the client, assessment, unique token and default targets are created → the questionnaire link is e-mailed → the confirmation page shows the link if delivery is unavailable.

**Protections on the public form:** honeypot field (bots get a 400), consent checkbox required, one active assessment per contact e-mail (409 on duplicates), 5 registrations per IP per hour (429), `signup_log` table for forensics, and every attempt recorded in the audit trail under actor `self-signup`. The administrator can switch the whole flow off in Settings (the form then shows a closed notice with an optional contact e-mail, and POST returns 403).

## Access

- **Administrator** (the only authenticated role — as specified): `/admin/login`
  - E-mail: `admin@unifiedtech.com`
  - Password: `Unified@2026`
  - While the default password is unchanged, the login screen itself shows a **"First access"** box with these credentials.
  - There is no user sign-up screen: the administrator is created automatically on first boot. To change name/e-mail/password use **Settings → Administrator access** (`/admin/settings#access`). You can also set `ADMIN_EMAIL`/`ADMIN_PASSWORD` in the environment before the first production boot.
- **Client**: no login. The client opens `/a/<token>` — a unique link generated at registration, with an expiry (30 days by default).

## How to use (guide)

An in-app 5-step guide is available at **`/ajuda`** (menu item "How to use"):

1. **Sign in as administrator** — `/admin/login` with the credentials above.
2. **Register the client** — in *New client*, including the **contact name and e-mail** — or let the prospect self-register at `/start`. The invitation goes to that e-mail address either way.
3. **Configure e-mail delivery** (once) — in *Settings → E-mail delivery*: a Resend API key (recommended) or SendGrid, a verified sender, subject, opening text and link validity. The *Test* button confirms delivery.
4. **The client answers through the link** — no password, with autosave; they can close and return until they submit.
5. **The report is generated immediately** — index, 7-dimension scorecard, current × target radar, prioritised initiatives and a 90-day plan; PDF/XLSX available to both the client and the administrator. **The client fills in no initiatives:** the method selects them from a curated library (see below).

## Endpoints

### Public site — no login

| Method | Path | Purpose |
|---|---|---|
| GET | `/` | **Landing page**: hero, the seven dimensions, how it works, deliverables |
| GET | `/start` | **Public self-registration form** (the button target from the UT website) |
| POST | `/start` | Creates the client + assessment from the public form and e-mails the questionnaire link |
| GET | `/a/:token` | Client questionnaire (autosave, progress, review, submit) |
| POST | `/api/a/:token/save` | Autosave endpoint |
| POST | `/api/a/:token/submit` | Submits, computes the scorecard and generates the report |
| GET | `/a/:token/report` | Client report (HTML) |
| GET | `/a/:token/report.pdf` | Print/PDF version of the report |
| GET | `/a/:token/report.xlsx` | Report scorecard as XLSX |
| GET | `/a/:token/answers` | Read-only record of the submitted answers |

### Administrator console — `/admin`, password required

| Method | Path | Purpose |
|---|---|---|
| GET | `/admin/login` | Sign-in (shows the first-access box) |
| POST | `/admin/login` | Authenticates and starts the session |
| POST | `/admin/logout` | Ends the session |
| GET | `/admin` | Dashboard: KPIs, dimension distribution, client table, filters, exports |
| GET | `/admin/clients/new` | New-client form |
| POST | `/admin/clients/new` | Creates the client, the assessment, the unique link and sends the e-mail |
| GET | `/admin/clients/:id` | Client record: link status, reports, scorecard, answers, targets |
| GET/POST | `/admin/clients/:id/edit` | Edits client data |
| POST | `/admin/clients/:id/resend` | Rotates the token (invalidating the old link) and re-sends the e-mail |
| POST | `/admin/clients/:id/reopen` | Reopens the questionnaire for a new response version |
| POST | `/admin/clients/:id/delete` | Logical delete |
| GET | `/admin/clients/:id/report` | Any report version of that client |
| GET | `/admin/clients/:id/report.pdf` / `.xlsx` | Report exports |
| GET | `/admin/export/clients.csv` | Full client base as CSV |
| GET | `/admin/export/workbook.xlsx` | Four-sheet workbook (clients, responses, indexes, initiatives) |
| GET | `/admin/settings` | Administrator access, e-mail delivery and public self-registration |
| POST | `/admin/settings/signup` | Enables/disables self-registration and stores the closed-registration contact e-mail |
| POST | `/admin/settings/access` | Changes name, e-mail and password |
| POST | `/admin/settings/email` | Saves the mail provider, sender, subject, intro and link validity |
| POST | `/admin/settings/test` | Sends a test e-mail |
| GET | `/admin/help` | In-app usage guide |

## Data architecture

- **Storage**: Cloudflare D1 (SQLite). 13 tables — `clients`, `assessments`, `questions`, `responses`, `dimension_targets`, `initiatives`, `reports`, `admin_users`, `sessions`, `settings`, `audit_log`, `signup_log`, `schema_meta`.
- **Bootstrap**: idempotent — `SCHEMA_SQL` + `COLUMN_MIGRATIONS` plus `ensureSeed` run once per isolate. The seed is versioned (`settings.seed_version`, currently `3`). Questions are **upserted by slug**, so existing question IDs — and the responses already collected against them — stay valid.
- **Question bank**: 7 dimensions, 23 questions (`src/lib/questions.ts`). Slugs are language-neutral so future EN/ES variants can share the same IDs.
- **Scoring**: dimension level = `floor(mean)` of the per-question levels (rubric based, never rounded up); general index = weighted average 0–4 displayed as `x.x / 5.0`; priority derived from gap × impact with floors (L0 → Critical, L1 → at least High).
- **Security**: PBKDF2-SHA256 (150k iterations) via Web Crypto, opaque session tokens in `sessions` (HttpOnly `SameSite=Lax` cookie, 12h TTL), expiring per-assessment link tokens, per-client data isolation through the token, and an append-only `audit_log`.

## Data migrations

`ensureSeed` applies content and data migrations on top of the schema:

- **Seed version 2 — localisation.** Translates `clients.vertical` and `clients.tamanho_faixa` values captured while the UI was in Portuguese, replaces the stored Portuguese mail subject/intro defaults, and updates the seeded administrator name.
- **Seed version 3 — US/Caribbean client model.** Copies historical `cnpj` values into `tax_id` and sets `country = 'Brazil'` on records that predate the country field (that is where they were captured). New records carry `country`, `postal_code` and `website`.
- **Column upgrades.** `src/lib/schema.ts` exports `COLUMN_MIGRATIONS` (`ALTER TABLE clients ADD COLUMN …`), run on every boot with duplicate-column errors ignored, so an existing database picks up `tax_id`, `country`, `postal_code` and `website` without a manual migration step. `migrations/0004_us_caribbean_model.sql` mirrors the same changes for operators who run migrations explicitly.

## Deployment

- **Platform**: Cloudflare Pages
- **Status**: ✅ running in the sandbox preview · production deploy pending the path decision
- **Tech stack**: Hono + TypeScript + D1, unifiedtech.com design system (navy `#0B2545`, blue `#3E6BA5`, lime `#B0D000`, Roboto)
- **Last updated**: 2026-11-23

## Notes

- Real e-mail delivery requires a Resend or SendGrid API key entered in *Settings → E-mail delivery*. With no key the link is still generated and can be copied and sent manually — the event is recorded in the audit trail.
- PDF is produced through the browser's print dialog (print CSS) because Workers cannot run a headless browser.
