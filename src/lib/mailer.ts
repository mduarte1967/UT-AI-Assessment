// Transactional e-mail delivery. With no key configured the link stays available
// for copying and the event is recorded in the audit trail.
import type { Env } from './db'

export type MailInput = {
  to: string
  subject: string
  html: string
  text: string
}

export type MailResult = { sent: boolean; provider: string; detail: string }

export type MailConfig = {
  provider: string
  apiKey: string
  from: string
}

const SEM_CHAVE = 'No API key configured — the link stays available for copying and manual sending.'

export async function sendMail(cfg: MailConfig, mail: MailInput): Promise<MailResult> {
  const key = cfg.apiKey
  const from = cfg.from || 'Unified Technologies <onboarding@resend.dev>'

  if (!key) {
    return { sent: false, provider: 'none', detail: SEM_CHAVE }
  }

  if (cfg.provider === 'sendgrid') {
    return sendViaSendGrid(key, from, mail)
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [mail.to],
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
      }),
    })
    if (!res.ok) {
      const detail = await res.text()
      return { sent: false, provider: 'resend', detail: `HTTP ${res.status}: ${detail.slice(0, 200)}` }
    }
    return { sent: true, provider: 'resend', detail: 'E-mail sent.' }
  } catch (err: any) {
    return { sent: false, provider: 'resend', detail: String(err?.message || err).slice(0, 200) }
  }
}

export function inviteEmail(opts: {
  empresa: string
  responsavel: string
  link: string
  expiraEm: string
  vertical?: string | null
  reenvio?: boolean
  assunto?: string
  intro?: string
}): MailInput {
  const { empresa, responsavel, link, expiraEm, reenvio, assunto: assuntoTpl, intro: introTpl } = opts
  const vars = { empresa, responsavel, link, expira: expiraEm }
  const render = (tpl: string) => tpl.replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, k) => (vars as any)[k] ?? '')

  const assuntoPadrao = reenvio
    ? `New link — AI Maturity Assessment · ${empresa}`
    : `Invitation — AI Maturity Assessment · ${empresa}`
  const assunto = assuntoTpl ? render(assuntoTpl) : assuntoPadrao
  const intro = introTpl
    ? render(introTpl)
    : `Unified Technologies has prepared the artificial intelligence readiness assessment for ${empresa}. It covers 7 dimensions and around 20 questions — an estimated 30 minutes, in a single session.`

  const html = `<!DOCTYPE html>
<html lang="en"><body style="margin:0;padding:0;background:#f4f6fa;font-family:Inter,Arial,sans-serif;color:#0f1a2b">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fa;padding:24px 12px">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:14px;overflow:hidden;border:1px solid #e2e8f0">
        <tr><td style="background:#080048;padding:24px 32px">
          <img src="https://unifiedtech.com/wp-content/uploads/2024/07/Logo-UT-Color-Head.png" alt="Unified Technologies" height="30" style="background:#fff;padding:6px 8px;border-radius:6px">
        </td></tr>
        <tr><td style="padding:30px 32px 10px">
          <div style="font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#8ab520;font-weight:800">AI Maturity Assessment</div>
          <h1 style="font-size:22px;color:#080048;margin:8px 0 14px">Hello, ${responsavel.split(' ')[0]}.</h1>
          <p style="font-size:14px;line-height:1.6;color:#33415c">${intro}</p>
          <p style="font-size:14px;line-height:1.6;color:#33415c">
            Your answers are saved automatically: you can close this page and resume through the same link until you submit.
            As soon as you submit, the report with the business outcome map, the AI Maturity Index, the scorecard, the radar and the prioritised initiative portfolio is generated on the spot.
          </p>
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0">
            <tr><td style="background:#a8d432;border-radius:9px">
              <a href="${link}" style="display:inline-block;padding:13px 26px;color:#17220a;font-weight:700;text-decoration:none;font-size:15px">Start the assessment</a>
            </td></tr>
          </table>
          <p style="font-size:12px;color:#64748b">Link valid until ${expiraEm}. If the button does not work, copy and paste:<br>
            <span style="color:#3a6699;word-break:break-all">${link}</span></p>
        </td></tr>
        <tr><td style="padding:18px 32px 26px;border-top:1px solid #eef2f7">
          <p style="font-size:11.5px;color:#94a3b8;margin:0">Unified Technologies · Co-Managed Security Intelligence<br>
          This is an automated message about your assessment.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`

  const text = `Hello, ${responsavel}.

${intro}

Open: ${link}
Link valid until ${expiraEm}.

Your answers are saved automatically. As soon as you submit, the report is generated on the spot.`

  return { to: '', subject: assunto, html, text }
}


async function sendViaSendGrid(key: string, from: string, mail: MailInput): Promise<MailResult> {
  const nome = from.match(/^(.*)<(.+)>$/)?.[1].trim() || 'Unified Technologies'
  const email = from.match(/^(.*)<(.+)>$/)?.[2].trim() || from.trim()
  try {
    const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: mail.to }] }],
        from: { email, name: nome },
        subject: mail.subject,
        content: [
          { type: 'text/plain', value: mail.text },
          { type: 'text/html', value: mail.html },
        ],
      }),
    })
    if (!res.ok) {
      const detail = await res.text()
      return { sent: false, provider: 'sendgrid', detail: `HTTP ${res.status}: ${detail.slice(0, 200)}` }
    }
    return { sent: true, provider: 'sendgrid', detail: 'E-mail sent.' }
  } catch (err: any) {
    return { sent: false, provider: 'sendgrid', detail: String(err?.message || err).slice(0, 200) }
  }
}

export function testEmail(destino: string): MailInput {
  return {
    to: destino,
    subject: 'Test delivery — AI Maturity Assessment',
    html: `<!DOCTYPE html><html lang="en"><body style="margin:0;padding:24px;background:#f4f6fa;font-family:Inter,Arial,sans-serif">
      <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:14px;padding:28px;border:1px solid #e2e8f0">
        <img src="https://unifiedtech.com/wp-content/uploads/2024/07/Logo-UT-Color-Head.png" alt="Unified Technologies" height="28" style="background:#fff;padding:6px 8px;border-radius:6px;border:1px solid #eef2f7">
        <h1 style="font-size:20px;color:#080048;margin:18px 0 10px">Delivery is working</h1>
        <p style="font-size:14px;color:#33415c;line-height:1.6">
          This is a test message from the <strong>AI Maturity Assessment</strong> by Unified Technologies.
          If you received this e-mail, automatic delivery of client invitations is configured correctly.
        </p>
        <p style="font-size:12px;color:#64748b;margin-top:20px">No action is required.</p>
      </div></body></html>`,
    text: 'Delivery is working. Automatic sending of AI Maturity Assessment invitations is configured correctly.',
  }
}
