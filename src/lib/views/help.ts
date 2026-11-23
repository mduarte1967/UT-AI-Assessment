import { esc } from '../util'
import { adminShell, alertBox, badge } from './layout'

export type HelpOpts = {
  admin: { nome: string; email: string }
  mailConfigured: boolean
  ttlDays: number
  demoToken: string | null
  baseUrl: string
}

const STEP = (n: number, titulo: string, corpo: string, acoes = '') => `
<div class="help-step">
  <div class="help-num">${n}</div>
  <div>
    <h3>${titulo}</h3>
    <div class="help-body">${corpo}</div>
    ${acoes ? `<div class="help-actions">${acoes}</div>` : ''}
  </div>
</div>`

export function helpPage(o: HelpOpts): string {
  const conteudo = `
<section class="card" style="margin-bottom:18px">
  <div class="card-head"><div>
    <h2>Como usar o sistema — guia em 5 passos</h2>
    <div class="sub">Do cadastro do cliente ao relatório entregue. Leva cerca de 5 minutos para o primeiro cliente.</div>
  </div></div>

  ${STEP(
    1,
    'Entre como administrador',
    `Acesse <span class="mono">/login</span> com o e-mail <strong>${esc(o.admin.email)}</strong>.
     ${o.mailConfigured ? '' : 'A senha inicial é de primeiro acesso — troque em <a href="/configuracoes#acesso">Configurações</a>.'}
     Não existe tela de cadastro de usuário: o administrador é o <strong>único perfil com login</strong>, criado automaticamente na primeira execução.
     Se precisar de mais administradores, fale com o responsável técnico.`,
    `<a class="btn btn-sm btn-ghost" href="/configuracoes#acesso">Alterar minha senha</a>`
  )}

  ${STEP(
    2,
    'Cadastre o cliente (e o e-mail de quem vai responder)',
    `Em <strong>Novo cliente</strong>, informe razão social, vertical, porte e — o mais importante — o
     <strong>nome e o e-mail do responsável</strong>. É para esse e-mail que o convite vai.
     O sistema cria o assessment, gera um link único e (se o envio estiver configurado) dispara o e-mail na hora.
     Sem envio configurado, o link aparece na tela com botão <em>Copiar</em> — você envia do seu e-mail corporativo.`,
    `<a class="btn btn-sm" href="/clientes/novo"><i class="fa-solid fa-user-plus" aria-hidden="true"></i> Cadastrar cliente</a>
     <a class="btn btn-sm btn-ghost" href="/configuracoes#email">Configurar envio de e-mail</a>`
  )}

  ${STEP(
    3,
    'Configure o envio de e-mail (uma vez só)',
    `Em <a href="/configuracoes#email">Configurações → Envio de e-mail</a>, informe a chave de API do
     Resend (recomendado) ou SendGrid, o remetente verificado e a validade do link (${o.ttlDays} dias).
     Use o botão <em>Testar</em> para confirmar que o e-mail chega.
     ${o.mailConfigured ? badge('Envio configurado', 'ok') : badge('Ainda não configurado', 'warn')}`
  )}

  ${STEP(
    4,
    'O cliente responde pelo link (sem senha)',
    `O cliente abre o link no navegador, responde as 7 dimensões (~30 min) e as respostas são
     <strong>salvas automaticamente</strong> — pode fechar e voltar depois, até enviar.
     Na última etapa ele revisa as pendências, declara metas para 12 meses e até 5 iniciativas candidatas.`
  )}

  ${STEP(
    5,
    'O relatório é gerado na hora',
    `Ao enviar, o sistema calcula o índice, monta o quadro de resultados das 7 dimensões, o radar atual × meta,
     as iniciativas priorizadas e o plano de 90 dias. O cliente vê e baixa em PDF/XLSX;
     você acompanha tudo no <a href="/painel">Painel</a>, com exportação da base completa.
     Para corrigir respostas depois do envio, use <em>Reabrir formulário</em> na ficha do cliente — isso gera uma nova versão do relatório e preserva a anterior.`,
    `<a class="btn btn-sm btn-ghost" href="/painel"><i class="fa-solid fa-gauge-high" aria-hidden="true"></i> Abrir o painel</a>`
  )}
</section>

<div class="grid-2" style="align-items:start;gap:18px">
  <section class="card">
    <div class="card-head"><div><h2>Perguntas frequentes</h2></div></div>
    <div class="faq">
      <details open>
        <summary>O cliente precisa criar conta ou senha?</summary>
        <p>Não. O acesso é por um <strong>link único com token</strong> que expira em ${o.ttlDays} dias.
        O link abre apenas o assessment daquela empresa. Quem tem o link responde; ninguém mais vê os dados.</p>
      </details>
      <details>
        <summary>Como troco o e-mail do destinatário?</summary>
        <p>Na ficha do cliente, <em>Editar</em> e altere “Responsável → E-mail”. Depois use <em>Reenviar link</em>
        para disparar um novo convite — o link anterior é invalidado automaticamente.</p>
      </details>
      <details>
        <summary>O cliente perdeu o e-mail. E agora?</summary>
        <p>Abra a ficha do cliente e clique em <em>Reenviar link</em>. Um novo token é gerado e o antigo deixa de funcionar.
        Você também pode copiar o link e enviar por WhatsApp ou outro canal.</p>
      </details>
      <details>
        <summary>Posso corrigir respostas depois de enviado?</summary>
        <p>Sim, com <em>Reabrir formulário</em>. O cliente volta a editar e, ao reenviar, é criada a versão v2 do relatório.
        A v1 continua acessível no histórico — nada é sobrescrito.</p>
      </details>
      <details>
        <summary>Excluir um cliente apaga os dados?</summary>
        <p>Não. A exclusão é <strong>lógica</strong>: o cliente sai das listagens, mas clientes, respostas e relatórios
        permanecem no banco para auditoria. A exportação em XLSX/CSV garante a portabilidade da base.</p>
      </details>
      <details>
        <summary>O índice é calculado como?</summary>
        <p>O nível de cada dimensão é o <strong>piso da média</strong> das respostas (sem arredondar para cima),
        na escala L0–L4. O índice geral é a média das 7 dimensões, exibida em escala 0–5.
        O gap é a meta declarada menos o nível atual, e a prioridade sai da matriz gap × urgência.</p>
      </details>
      <details>
        <summary>Como exporto os dados?</summary>
        <p>No painel: <em>Exportar XLSX</em> (4 abas: clientes, respostas, índices, iniciativas) ou
        <span class="mono">/painel/export.csv</span>. Em cada relatório há exportação de PDF e XLSX do scorecard.</p>
      </details>
    </div>
  </section>

  <section class="card">
    <div class="card-head"><div><h2>Testar o fluxo agora</h2>
      <div class="sub">Abra o link de um assessment existente para ver a experiência do cliente.</div></div></div>
    ${
      o.demoToken
        ? `<div class="link-box" style="margin-bottom:12px">
            <i class="fa-solid fa-link" aria-hidden="true"></i>
            <input type="text" id="demo-link" value="${esc(o.baseUrl)}/a/${esc(o.demoToken)}" readonly aria-label="Link de teste">
            <button class="btn btn-sm btn-ghost" type="button" data-copy="demo-link"><i class="fa-regular fa-copy" aria-hidden="true"></i> Copiar</button>
          </div>
          <a class="btn btn-sm" href="/a/${esc(o.demoToken)}" target="_blank" rel="noopener">
            <i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i> Abrir o formulário do cliente
          </a>`
        : `<p class="small muted">Nenhum cliente cadastrado ainda. Cadastre um cliente para gerar um link de teste.</p>`
    }
    <div class="divider"></div>
    <h3 style="font-size:13px;margin-bottom:8px">Mapa do sistema</h3>
    <table class="data" style="font-size:12.5px">
      <tbody>
        <tr><td class="mono">/login</td><td>Entrada do administrador</td></tr>
        <tr><td class="mono">/painel</td><td>Indicadores, clientes e exportações</td></tr>
        <tr><td class="mono">/clientes/novo</td><td>Cadastro + geração do link</td></tr>
        <tr><td class="mono">/clientes/:id</td><td>Ficha, respostas, relatórios e ações</td></tr>
        <tr><td class="mono">/a/:token</td><td>Formulário do cliente (sem login)</td></tr>
        <tr><td class="mono">/a/:token/relatorio</td><td>Relatório do cliente (PDF/XLSX)</td></tr>
        <tr><td class="mono">/configuracoes</td><td>Senha do admin e envio de e-mail</td></tr>
      </tbody>
    </table>
  </section>
</div>

<script>
  document.addEventListener('click', function(e){
    var b = e.target.closest('[data-copy]');
    if (!b) return;
    var el = document.getElementById(b.getAttribute('data-copy'));
    if (!el) return;
    el.select();
    navigator.clipboard.writeText(el.value).then(function(){
      var old = b.innerHTML; b.innerHTML = '<i class="fa-solid fa-check"></i> Copiado';
      setTimeout(function(){ b.innerHTML = old; }, 1600);
    });
  });
</script>`

  return adminShell(
    {
      title: 'Como usar',
      subtitle: 'Guia da prática',
      active: '/ajuda',
      admin: o.admin,
      actions: `<a class="btn btn-sm" href="/clientes/novo"><i class="fa-solid fa-plus" aria-hidden="true"></i> Novo cliente</a>`,
    },
    conteudo
  )
}
