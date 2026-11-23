import { DIMENSIONS } from '../questions'
import { esc } from '../util'
import { doc } from './layout'

export type LoginOpts = {
  error?: string
  email?: string
  /** Credenciais padrão ainda ativas (primeiro acesso, nunca trocadas) */
  firstAccess?: { email: string; senha: string } | null
  notice?: string
}

export function loginPage(opts: LoginOpts = {}): string {
  const dims = DIMENSIONS.map(
    (d) => `<span><i class="fa-solid ${d.icone}" aria-hidden="true"></i>${esc(d.nome)}</span>`
  ).join('')

  const fa = opts.firstAccess

  return doc(
    { title: 'Acesso do administrador', bodyClass: 'login-body' },
    `<div class="login-wrap">
  <aside class="login-hero">
    <div>
      <a href="/login" class="logo-chip"><img src="/static/logo.png" alt="Unified Technologies"></a>
      <h1>Assessment de<br>Maturidade em IA</h1>
      <p>Diagnóstico estruturado das sete dimensões de prontidão para inteligência artificial —
      do cadastro do cliente ao relatório com notas por dimensão, radar e plano de 90 dias.</p>
      <div class="hero-dims">${dims}</div>
    </div>
    <div class="hero-foot">Unified Technologies</div>
  </aside>

  <section class="login-panel">
    <div class="login-box">
      <h2>Acesso do administrador</h2>
      <p class="lead">Área restrita à gestão da prática. Clientes acessam pelo link único enviado por e-mail.</p>

      ${
        opts.error
          ? `<div class="alert danger" role="alert"><i class="fa-solid fa-circle-exclamation" aria-hidden="true"></i><div>${esc(
              opts.error
            )}</div></div>`
          : ''
      }
      ${
        opts.notice
          ? `<div class="alert ok" role="status"><i class="fa-solid fa-circle-check" aria-hidden="true"></i><div>${esc(
              opts.notice
            )}</div></div>`
          : ''
      }

      ${
        fa
          ? `<div class="first-access">
              <strong><i class="fa-solid fa-key" aria-hidden="true"></i> Primeiro acesso</strong>
              Esta aplicação não tem tela de cadastro: o administrador é criado automaticamente na
              primeira execução, com as credenciais abaixo.
              <dl>
                <dt>E-mail</dt><dd><code>${esc(fa.email)}</code></dd>
                <dt>Senha</dt><dd><code>${esc(fa.senha)}</code></dd>
              </dl>
              <div class="tip">Entre com esses dados e troque a senha em <strong>Configurações</strong>.
              Este aviso desaparece assim que a senha for alterada.</div>
            </div>`
          : ''
      }

      <form method="post" action="/login" novalidate>
        <div class="field">
          <label for="email">E-mail</label>
          <input type="email" id="email" name="email" value="${esc(opts.email || fa?.email || '')}" autocomplete="username" required ${fa ? '' : 'autofocus'}>
        </div>
        <div class="field">
          <label for="senha">Senha</label>
          <input type="password" id="senha" name="senha" autocomplete="current-password" required ${fa ? 'autofocus' : ''}>
        </div>
        <button class="btn btn-block" type="submit">Entrar</button>
      </form>

      <p class="small muted" style="margin-top:18px">
        Esqueceu a senha? Peça a redefinição ao responsável técnico da aplicação —
        o envio automatizado de recuperação entra na próxima fase.
      </p>
      <div class="divider"></div>
      <p class="small muted">
        <strong>É cliente?</strong> Você não precisa de senha: use exatamente o link recebido por e-mail —
        ele abre o formulário da sua empresa.
      </p>
    </div>
  </section>
</div>`
  )
}
