import { esc, fmtDateTime } from '../util'
import { adminShell, alertBox, badge } from './layout'
import type { Settings } from '../settings'

export type SettingsOpts = {
  flash?: { kind: 'ok' | 'warn' | 'danger' | 'info'; text: string } | null
  mailConfigured: boolean
  admin: { nome: string; email: string }
  defaultPasswordActive: boolean
}

export function settingsPage(s: Settings, admin: { nome: string; email: string }, opts: {
  flash?: { kind: 'ok' | 'warn' | 'danger' | 'info'; text: string } | null
  mailConfigured: boolean
  defaultPasswordActive: boolean
  baseUrl?: string
  signupSnippet?: string
}): string {
  const keySet = !!s.mail_api_key

  return adminShell(
    {
      title: 'Settings',
      subtitle: 'System administration',
      active: '/admin/settings',
      admin,
      actions: `<a class="btn btn-ghost btn-sm" href="/admin/help"><i class="fa-regular fa-circle-question" aria-hidden="true"></i> How to use</a>`,
    },
    opts.flash ? alertBox(opts.flash.kind, esc(opts.flash.text)) : '',

    opts.defaultPasswordActive
      ? alertBox(
          'warn',
          `<strong>You are still using the default first-access password.</strong> Set your own password in the “Administrator access” block below before putting the application into production.`
        )
      : '',

    `<div class="grid-2" style="align-items:start;gap:18px">
      <section class="card" id="acesso">
        <div class="card-head"><div>
          <h2><i class="fa-solid fa-key" aria-hidden="true"></i> Administrator access</h2>
          <div class="sub">The only profile with a login. Clients enter through a link, without a password.</div>
        </div></div>

        <form method="post" action="/admin/settings/access" novalidate>
          <div class="field">
            <label for="nome">Name</label>
            <input type="text" id="nome" name="nome" value="${esc(admin.nome)}" maxlength="120" required>
          </div>
          <div class="field">
            <label for="email">Sign-in e-mail</label>
            <input type="email" id="email" name="email" value="${esc(admin.email)}" maxlength="160" required>
          </div>
          <div class="divider"></div>
          <div class="field">
            <label for="senha_atual">Current password <span class="req">*</span></label>
            <input type="password" id="senha_atual" name="senha_atual" autocomplete="current-password" required>
            <span class="hint">Required to confirm any change in this block.</span>
          </div>
          <div class="grid-2">
            <div class="field">
              <label for="senha_nova">New password</label>
              <input type="password" id="senha_nova" name="senha_nova" autocomplete="new-password" minlength="8" placeholder="at least 8 characters">
            </div>
            <div class="field">
              <label for="senha_conf">Confirm new password</label>
              <input type="password" id="senha_conf" name="senha_conf" autocomplete="new-password" minlength="8">
            </div>
          </div>
          <button class="btn" type="submit"><i class="fa-solid fa-floppy-disk" aria-hidden="true"></i> Save access</button>
          <span class="small muted" style="margin-left:10px">Leave the new password blank to change only name/e-mail.</span>
        </form>
      </section>

      <section class="card" id="email">
        <div class="card-head"><div>
          <h2><i class="fa-solid fa-envelope" aria-hidden="true"></i> E-mail delivery</h2>
          <div class="sub">Invitation and link resend to the client's contact.</div>
        </div>
        ${opts.mailConfigured ? badge('Configured', 'ok') : badge('Not configured', 'warn')}</div>

        ${
          opts.mailConfigured
            ? ''
            : alertBox(
                'info',
                `Without an API key the system <strong>does not send e-mail</strong> — when you register a client the link appears on screen with a <em>Copy</em> button so you can send it manually from your corporate mailbox. To automate it, enter the key below.`
              )
        }

        <form method="post" action="/admin/settings/email" novalidate>
          <div class="field">
            <label for="mail_provider">Provider</label>
            <select id="mail_provider" name="mail_provider">
              <option value="resend" ${s.mail_provider === 'resend' ? 'selected' : ''}>Resend (recommended)</option>
              <option value="sendgrid" ${s.mail_provider === 'sendgrid' ? 'selected' : ''}>SendGrid</option>
            </select>
          </div>
          <div class="field">
            <label for="mail_api_key">API key</label>
            <input type="password" id="mail_api_key" name="mail_api_key" autocomplete="off"
              placeholder="${keySet ? '•••••••••••••  (saved — leave blank to keep)' : 're_xxxxxxxxxxxxxxxx'}">
            <span class="hint">${keySet ? 'A key is already saved. Fill this in only to replace it.' : 'Resend: create one at resend.com/api-keys. SendGrid: starts with SG.…'}</span>
          </div>
          <div class="field">
            <label for="mail_from">Sender (from)</label>
            <input type="text" id="mail_from" name="mail_from" value="${esc(s.mail_from)}" maxlength="160">
            <span class="hint">Must be a domain verified with the provider. On Resend, use <span class="mono">onboarding@resend.dev</span> for testing.</span>
          </div>
          <div class="field">
            <label for="mail_subject">Invitation subject</label>
            <input type="text" id="mail_subject" name="mail_subject" value="${esc(s.mail_subject)}" maxlength="180">
            <span class="hint">Available variable: <span class="mono">{{empresa}}</span></span>
          </div>
          <div class="field">
            <label for="mail_intro">Invitation opening text</label>
            <textarea id="mail_intro" name="mail_intro" rows="4" maxlength="900">${esc(s.mail_intro)}</textarea>
            <span class="hint">Variables: <span class="mono">{{empresa}}</span>, <span class="mono">{{responsavel}}</span></span>
          </div>
          <div class="field" style="max-width:220px">
            <label for="link_ttl_days">Link validity (days)</label>
            <input type="number" id="link_ttl_days" name="link_ttl_days" min="1" max="365" value="${esc(s.link_ttl_days)}">
          </div>
          <button class="btn" type="submit"><i class="fa-solid fa-floppy-disk" aria-hidden="true"></i> Save settings</button>
        </form>

        <div class="divider"></div>
        <h3 style="font-size:13px;margin-bottom:8px">Send a test</h3>
        <form method="post" action="/admin/settings/test" style="display:flex;gap:8px;align-items:flex-end;flex-wrap:wrap">
          <div class="field" style="flex:1;min-width:220px;margin:0">
            <label for="teste_email">Send a test e-mail to</label>
            <input type="email" id="teste_email" name="teste_email" value="${esc(admin.email)}" required>
          </div>
          <button class="btn btn-ghost" type="submit"><i class="fa-solid fa-paper-plane" aria-hidden="true"></i> Test</button>
        </form>
      </section>
    </div>

    <section class="card" style="margin-top:18px" id="autocadastro">
      <div class="card-head"><div>
        <h2><i class="fa-solid fa-user-plus" aria-hidden="true"></i> Public self-registration</h2>
        <div class="sub">Lets a prospect register from the Unified Technologies website and receive the questionnaire by e-mail, with no admin action.</div>
      </div>
      ${s.self_signup !== '0' ? badge('Enabled', 'ok') : badge('Disabled', 'muted')}</div>

      <form method="post" action="/admin/settings/signup" novalidate>
        <div class="field">
          <label for="self_signup">Status</label>
          <select id="self_signup" name="self_signup">
            <option value="1" ${s.self_signup !== '0' ? 'selected' : ''}>Enabled — anyone with the link can register</option>
            <option value="0" ${s.self_signup === '0' ? 'selected' : ''}>Disabled — only the administrator registers clients</option>
          </select>
        </div>
        <div class="field">
          <label for="signup_contact_email">Contact e-mail shown when registration is closed</label>
          <input type="email" id="signup_contact_email" name="signup_contact_email" value="${esc(s.signup_contact_email || '')}" maxlength="160" placeholder="contato@unifiedtech.com">
          <span class="hint">Optional. Shown on the closed-registration page.</span>
        </div>
        <button class="btn" type="submit"><i class="fa-solid fa-floppy-disk" aria-hidden="true"></i> Save self-registration</button>
      </form>

      <div class="divider"></div>
      <h3 style="font-size:13px;margin-bottom:6px">Button for the Unified Technologies website</h3>
      <p class="small muted" style="margin-top:0">
        Paste this snippet into the site (WordPress: a <em>Custom HTML</em> block). It points at
        <span class="mono">${esc(opts.baseUrl || '')}/start</span> and opens the registration form.
      </p>
      <div class="link-box" style="align-items:flex-start">
        <i class="fa-solid fa-code" aria-hidden="true" style="margin-top:10px"></i>
        <textarea id="signup-snippet" rows="7" readonly aria-label="Button embed code" style="font-family:ui-monospace,Menlo,monospace;font-size:11.5px;line-height:1.6">${esc(
          opts.signupSnippet || ''
        )}</textarea>
        <button class="btn btn-sm btn-ghost" type="button" data-copy="signup-snippet"><i class="fa-regular fa-copy" aria-hidden="true"></i> Copy</button>
      </div>
      <p class="small muted" style="margin-top:8px">
        The public form is always open to review at <a href="/start" target="_blank" rel="noopener" class="mono">/start</a>.
        Registrations and failures are recorded in the audit trail under actor <span class="mono">self-signup</span>.
      </p>
    </section>

    <section class="card" style="margin-top:18px">
      <div class="card-head"><div><h2>How the client e-mail works</h2>
        <div class="sub">The client does <strong>not</strong> create an account. They receive a unique link.</div></div></div>
      <ol class="small" style="margin:0;padding-left:20px;line-height:1.9">
        <li>You register the client — or the prospect self-registers at <span class="mono">/start</span> — providing the <strong>contact e-mail</strong> (the person who will answer).</li>
        <li>The system creates the assessment and generates a <strong>unique link</strong> valid for ${esc(s.link_ttl_days)} days.</li>
        <li>With an API key configured, the invitation is <strong>sent automatically</strong>; without a key, the link appears on screen so you can copy it and send it from your own mailbox.</li>
        <li>The client opens the link, answers in ~30 minutes and gets the report immediately — no login.</li>
        <li>To change the recipient: edit the client. To generate another link: <em>Resend link</em> on the client record (the previous one is invalidated).</li>
      </ol>
      <div class="small muted" style="margin-top:10px">Settings last updated: ${esc(fmtDateTime(s.atualizado_em || new Date().toISOString()))}</div>
    </section>
    <script>
      document.addEventListener('click', function(e){
        var b = e.target.closest('[data-copy]');
        if (!b) return;
        var el = document.getElementById(b.getAttribute('data-copy'));
        if (!el) return;
        if (el.select) el.select();
        navigator.clipboard.writeText(el.value).then(function(){
          var old = b.innerHTML; b.innerHTML = '<i class="fa-solid fa-check"></i> Copied';
          setTimeout(function(){ b.innerHTML = old; }, 1600);
        });
      });
    </script>`
  )
}
