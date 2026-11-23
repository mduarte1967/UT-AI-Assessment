// Envio de e-mail transacional. Sem chave configurada, o link fica disponível
// para cópia e o evento é registrado na trilha de auditoria.
import type { Env } from './db'

export type MailInput = {
  to: string
  subject: string
  html: string
  text: string
}

export type MailResult = { sent: boolean; provider: string; detail: string }

export async function sendMail(env: Env, mail: MailInput): Promise<MailResult> {
  const key = env.RESEND_API_KEY
  const from = env.MAIL_FROM || 'Unified Technologies <assessment@unifiedtech.com>'

  if (!key) {
    return { sent: false, provider: 'none', detail: 'RESEND_API_KEY não configurada — link disponível para cópia manual.' }
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
    return { sent: true, provider: 'resend', detail: 'E-mail enviado.' }
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
}): MailInput {
  const { empresa, responsavel, link, expiraEm, reenvio } = opts
  const assunto = reenvio
    ? `Novo link — Assessment de Maturidade em IA · ${empresa}`
    : `Convite — Assessment de Maturidade em IA · ${empresa}`

  const html = `<!DOCTYPE html>
<html lang="pt-BR"><body style="margin:0;padding:0;background:#f4f6fa;font-family:Inter,Arial,sans-serif;color:#0f1a2b">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fa;padding:24px 12px">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:14px;overflow:hidden;border:1px solid #e2e8f0">
        <tr><td style="background:#080048;padding:24px 32px">
          <img src="https://unifiedtech.com/wp-content/uploads/2024/07/Logo-UT-Color-Head.png" alt="Unified Technologies" height="30" style="background:#fff;padding:6px 8px;border-radius:6px">
        </td></tr>
        <tr><td style="padding:30px 32px 10px">
          <div style="font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#8ab520;font-weight:800">Assessment de Maturidade em IA</div>
          <h1 style="font-size:22px;color:#080048;margin:8px 0 14px">Olá, ${responsavel.split(' ')[0]}.</h1>
          <p style="font-size:14px;line-height:1.6;color:#33415c">
            A Unified Technologies preparou o assessment de prontidão em inteligência artificial de
            <strong>${empresa}</strong>. São <strong>7 dimensões</strong> e cerca de <strong>20 perguntas</strong> —
            tempo estimado de <strong>30 minutos</strong>, em uma única sessão.
          </p>
          <p style="font-size:14px;line-height:1.6;color:#33415c">
            Suas respostas ficam salvas automaticamente: você pode fechar e retomar pelo mesmo link até enviar.
            Ao final, o relatório com índice de maturidade, scorecard, radar e plano de 90 dias é gerado na hora.
          </p>
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0">
            <tr><td style="background:#a8d432;border-radius:9px">
              <a href="${link}" style="display:inline-block;padding:13px 26px;color:#17220a;font-weight:700;text-decoration:none;font-size:15px">Iniciar o assessment</a>
            </td></tr>
          </table>
          <p style="font-size:12px;color:#64748b">Link válido até ${expiraEm}. Se o botão não funcionar, copie e cole:<br>
            <span style="color:#3a6699;word-break:break-all">${link}</span></p>
        </td></tr>
        <tr><td style="padding:18px 32px 26px;border-top:1px solid #eef2f7">
          <p style="font-size:11.5px;color:#94a3b8;margin:0">Unified Technologies · Co-Managed Security Intelligence<br>
          Este é um envio automático referente ao seu assessment.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`

  const text = `Olá, ${responsavel}.

A Unified Technologies preparou o assessment de maturidade em IA de ${empresa}.
São 7 dimensões, ~20 perguntas, cerca de 30 minutos.

Acesse: ${link}
Link válido até ${expiraEm}.

Suas respostas são salvas automaticamente. Ao enviar, o relatório é gerado na hora.`

  return { to: '', subject: assunto, html, text }
}
