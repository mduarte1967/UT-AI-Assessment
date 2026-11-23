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
}): string {
  const keySet = !!s.mail_api_key

  return adminShell(
    {
      title: 'Configurações',
      subtitle: 'Administração do sistema',
      active: '/configuracoes',
      admin,
      actions: `<a class="btn btn-ghost btn-sm" href="/ajuda"><i class="fa-regular fa-circle-question" aria-hidden="true"></i> Como usar</a>`,
    },
    opts.flash ? alertBox(opts.flash.kind, esc(opts.flash.text)) : '',

    opts.defaultPasswordActive
      ? alertBox(
          'warn',
          `<strong>Você ainda está com a senha padrão de primeiro acesso.</strong> Defina uma senha própria no bloco “Acesso do administrador” abaixo, antes de colocar a aplicação em produção.`
        )
      : '',

    `<div class="grid-2" style="align-items:start;gap:18px">
      <section class="card" id="acesso">
        <div class="card-head"><div>
          <h2><i class="fa-solid fa-key" aria-hidden="true"></i> Acesso do administrador</h2>
          <div class="sub">Único perfil com login. Os clientes entram por link, sem senha.</div>
        </div></div>

        <form method="post" action="/configuracoes/acesso" novalidate>
          <div class="field">
            <label for="nome">Nome</label>
            <input type="text" id="nome" name="nome" value="${esc(admin.nome)}" maxlength="120" required>
          </div>
          <div class="field">
            <label for="email">E-mail de acesso</label>
            <input type="email" id="email" name="email" value="${esc(admin.email)}" maxlength="160" required>
          </div>
          <div class="divider"></div>
          <div class="field">
            <label for="senha_atual">Senha atual <span class="req">*</span></label>
            <input type="password" id="senha_atual" name="senha_atual" autocomplete="current-password" required>
            <span class="hint">Necessária para confirmar qualquer alteração neste bloco.</span>
          </div>
          <div class="grid-2">
            <div class="field">
              <label for="senha_nova">Nova senha</label>
              <input type="password" id="senha_nova" name="senha_nova" autocomplete="new-password" minlength="8" placeholder="mínimo 8 caracteres">
            </div>
            <div class="field">
              <label for="senha_conf">Confirmar nova senha</label>
              <input type="password" id="senha_conf" name="senha_conf" autocomplete="new-password" minlength="8">
            </div>
          </div>
          <button class="btn" type="submit"><i class="fa-solid fa-floppy-disk" aria-hidden="true"></i> Salvar acesso</button>
          <span class="small muted" style="margin-left:10px">Deixe a nova senha em branco para alterar apenas nome/e-mail.</span>
        </form>
      </section>

      <section class="card" id="email">
        <div class="card-head"><div>
          <h2><i class="fa-solid fa-envelope" aria-hidden="true"></i> Envio de e-mail</h2>
          <div class="sub">Convite e reenvio do link do assessment para o responsável.</div>
        </div>
        ${opts.mailConfigured ? badge('Configurado', 'ok') : badge('Não configurado', 'warn')}</div>

        ${
          opts.mailConfigured
            ? ''
            : alertBox(
                'info',
                `Sem chave de API, o sistema <strong>não envia e-mail</strong> — ao cadastrar um cliente, o link aparece na tela com botão <em>Copiar</em> para você enviar manualmente pelo seu e-mail corporativo. Para automatizar, informe a chave abaixo.`
              )
        }

        <form method="post" action="/configuracoes/email" novalidate>
          <div class="field">
            <label for="mail_provider">Provedor</label>
            <select id="mail_provider" name="mail_provider">
              <option value="resend" ${s.mail_provider === 'resend' ? 'selected' : ''}>Resend (recomendado)</option>
              <option value="sendgrid" ${s.mail_provider === 'sendgrid' ? 'selected' : ''}>SendGrid</option>
            </select>
          </div>
          <div class="field">
            <label for="mail_api_key">Chave de API</label>
            <input type="password" id="mail_api_key" name="mail_api_key" autocomplete="off"
              placeholder="${keySet ? '•••••••••••••  (salva — deixe em branco para manter)' : 're_xxxxxxxxxxxxxxxx'}">
            <span class="hint">${keySet ? 'Chave já salva. Preencha apenas se quiser substituí-la.' : 'Resend: crie em resend.com/api-keys. SendGrid: sigla SG.…'}</span>
          </div>
          <div class="field">
            <label for="mail_from">Remetente (from)</label>
            <input type="text" id="mail_from" name="mail_from" value="${esc(s.mail_from)}" maxlength="160">
            <span class="hint">Precisa ser um domínio verificado no provedor. No Resend, use <span class="mono">onboarding@resend.dev</span> para testar.</span>
          </div>
          <div class="field">
            <label for="mail_subject">Assunto do convite</label>
            <input type="text" id="mail_subject" name="mail_subject" value="${esc(s.mail_subject)}" maxlength="180">
            <span class="hint">Variável disponível: <span class="mono">{{empresa}}</span></span>
          </div>
          <div class="field">
            <label for="mail_intro">Texto de abertura do convite</label>
            <textarea id="mail_intro" name="mail_intro" rows="4" maxlength="900">${esc(s.mail_intro)}</textarea>
            <span class="hint">Variáveis: <span class="mono">{{empresa}}</span>, <span class="mono">{{responsavel}}</span></span>
          </div>
          <div class="field" style="max-width:220px">
            <label for="link_ttl_days">Validade do link (dias)</label>
            <input type="number" id="link_ttl_days" name="link_ttl_days" min="1" max="365" value="${esc(s.link_ttl_days)}">
          </div>
          <button class="btn" type="submit"><i class="fa-solid fa-floppy-disk" aria-hidden="true"></i> Salvar configurações</button>
        </form>

        <div class="divider"></div>
        <h3 style="font-size:13px;margin-bottom:8px">Testar envio</h3>
        <form method="post" action="/configuracoes/testar" style="display:flex;gap:8px;align-items:flex-end;flex-wrap:wrap">
          <div class="field" style="flex:1;min-width:220px;margin:0">
            <label for="teste_email">Enviar e-mail de teste para</label>
            <input type="email" id="teste_email" name="teste_email" value="${esc(admin.email)}" required>
          </div>
          <button class="btn btn-ghost" type="submit"><i class="fa-solid fa-paper-plane" aria-hidden="true"></i> Testar</button>
        </form>
      </section>
    </div>

    <section class="card" style="margin-top:18px">
      <div class="card-head"><div><h2>Como o e-mail do cliente funciona</h2>
        <div class="sub">O cliente <strong>não</strong> cria conta. Ele recebe um link único.</div></div></div>
      <ol class="small" style="margin:0;padding-left:20px;line-height:1.9">
        <li>Você cadastra o cliente informando o <strong>e-mail do responsável</strong> (o respondente).</li>
        <li>O sistema cria o assessment e gera um <strong>link único</strong> com validade de ${esc(s.link_ttl_days)} dias.</li>
        <li>Com chave de API configurada, o convite é <strong>enviado automaticamente</strong>; sem chave, o link aparece na tela para você copiar e enviar do seu e-mail.</li>
        <li>O cliente abre o link, responde em ~30 minutos e recebe o relatório na hora — sem login.</li>
        <li>Para trocar o destinatário: edite o cliente. Para gerar outro link: <em>Reenviar link</em> na ficha (o anterior é invalidado).</li>
      </ol>
      <div class="small muted" style="margin-top:10px">Última atualização das configurações: ${esc(fmtDateTime(s.atualizado_em || new Date().toISOString()))}</div>
    </section>`
  )
}
