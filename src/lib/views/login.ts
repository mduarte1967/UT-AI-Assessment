import { DIMENSIONS } from '../questions'
import { esc } from '../util'
import { doc } from './layout'

export function loginPage(error?: string, email?: string): string {
  const dims = DIMENSIONS.map(
    (d) => `<span><i class="fa-solid ${d.icone}" aria-hidden="true"></i>${esc(d.nome)}</span>`
  ).join('')

  return doc(
    { title: 'Acesso do administrador', bodyClass: 'login-body' },
    `<div class="login-wrap">
  <aside class="login-hero">
    <div>
      <a href="/login" class="logo-chip"><img src="/static/logo.png" alt="Unified Technologies"></a>
      <h1>Assessment de<br>Maturidade em IA</h1>
      <p>Diagnóstico estruturado das sete dimensões de prontidão para inteligência artificial —
      do cadastro do cliente ao relatório com scorecard, radar e plano de 90 dias.</p>
      <div class="hero-dims">${dims}</div>
    </div>
    <div class="hero-foot">Unified Technologies · Co-Managed Security Intelligence</div>
  </aside>

  <section class="login-panel">
    <div class="login-box">
      <h2>Acesso do administrador</h2>
      <p class="lead">Área restrita à gestão da prática. Clientes acessam pelo link único enviado por e-mail.</p>

      ${
        error
          ? `<div class="alert danger" role="alert"><i class="fa-solid fa-circle-exclamation" aria-hidden="true"></i><div>${esc(
              error
            )}</div></div>`
          : ''
      }

      <form method="post" action="/login" novalidate>
        <div class="field">
          <label for="email">E-mail</label>
          <input type="email" id="email" name="email" value="${esc(email || '')}" autocomplete="username" required autofocus>
        </div>
        <div class="field">
          <label for="senha">Senha</label>
          <input type="password" id="senha" name="senha" autocomplete="current-password" required>
        </div>
        <button class="btn btn-block" type="submit">Entrar</button>
      </form>

      <p class="small muted" style="margin-top:18px">
        Esqueceu a senha? Solicite a redefinição ao administrador da prática —
        o envio automatizado de recuperação entra na próxima fase.
      </p>
      <div class="divider"></div>
      <p class="small muted">
        É cliente e recebeu um link do assessment? Use exatamente o link do e-mail —
        ele abre o formulário da sua empresa, sem senha.
      </p>
    </div>
  </section>
</div>`
  )
}
