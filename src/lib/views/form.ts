import { DIMENSIONS, LEVEL_LABELS } from '../questions'
import type { QRow } from '../scoring'
import { isAnswered } from '../scoring'
import { esc, fmtDate } from '../util'
import { publicShell } from './layout'

export type FormContext = {
  token: string
  empresa: string
  razaoSocial: string
  responsavel: string
  vertical: string | null
  questions: QRow[]
  respostas: Record<number, unknown>
  metas: Record<string, number>
  initiatives: any[]
  estado: string
  expiraEm: string | null
  reaberto: boolean
  flash?: { kind: 'ok' | 'warn' | 'danger' | 'info'; text: string } | null
}

export function renderFormPage(ctx: FormContext): string {
  const scored = ctx.questions.filter((q) => q.tipo !== 'texto')
  const textQs = ctx.questions.filter((q) => q.tipo === 'texto')
  const answeredCount = scored.filter((q) => isAnswered(q, ctx.respostas[q.id])).length
  const pct = Math.round((answeredCount / Math.max(1, scored.length)) * 100)
  const pendentes = ctx.questions.filter((q) => q.obrigatoria && !isAnswered(q, ctx.respostas[q.id]))

  let qIndex = 0

  const sections = DIMENSIONS.map((dim, dimIdx) => {
    const qs = scored.filter((q) => q.dimensao === dim.key)
    const done = qs.filter((q) => isAnswered(q, ctx.respostas[q.id])).length
    const meta = Number.isFinite(Number(ctx.metas[dim.key])) ? Number(ctx.metas[dim.key]) : 2

    const questionsHtml = qs
      .map((q) => {
        qIndex += 1
        const valor = ctx.respostas[q.id]
        const answered = isAnswered(q, valor)
        return `<div class="q" data-q="${q.id}" data-required="${q.obrigatoria ? 1 : 0}" data-answered="${answered ? 1 : 0}">
          <div class="q-title">
            <span class="n">${qIndex}.</span>
            <span>${esc(q.texto)}${
              q.obrigatoria
                ? ' <span class="req" aria-hidden="true">*</span><span class="sr-only">(obrigatória)</span>'
                : ''
            }</span>
            <span class="q-status" data-status="${q.id}">${
              answered ? '<i class="fa-solid fa-circle-check" style="color:#12805c" aria-label="Respondida"></i>' : ''
            }</span>
          </div>
          ${q.ajuda ? `<div class="q-help">${esc(q.ajuda)}</div>` : ''}
          ${inputHtml(q, valor)}
        </div>`
      })
      .join('')

    return `<section class="section" id="dim-${dim.key}" data-section="${dim.key}">
      <div class="section-head">
        <div class="dim-icon"><i class="fa-solid ${dim.icone}" aria-hidden="true"></i></div>
        <div>
          <h2>${dimIdx + 1}. ${esc(dim.nome)}</h2>
          <div class="sub">${esc(dim.descricao)}</div>
        </div>
        <span class="count" data-count="${dim.key}">${done}/${qs.length}</span>
      </div>
      ${questionsHtml}
      <div class="divider"></div>
      <div class="flex-between">
        <div>
          <strong class="small">Meta para 12 meses nesta dimensão</strong>
          <div class="small muted">Nível desejado ao final de 12 meses — base do comparativo atual × meta do radar.</div>
        </div>
        <div class="seg" role="group" aria-label="Meta de 12 meses para ${esc(dim.nome)}">
          ${[0, 1, 2, 3, 4]
            .map(
              (lvl) =>
                `<button type="button" data-target="${dim.key}" data-level="${lvl}" class="${meta === lvl ? 'on' : ''}" aria-pressed="${
                  meta === lvl
                }">L${lvl}</button>`
            )
            .join('')}
        </div>
      </div>
    </section>`
  }).join('')

  const iniCards = [0, 1, 2, 3, 4]
    .map((idx) => {
      const ini = ctx.initiatives[idx] || {}
      return `<div class="ini-card" data-ini="${idx}">
        <div class="ini-head"><strong>Iniciativa ${idx + 1}</strong>
          <span class="small muted">Opcional</span>
        </div>
        <div class="field"><label for="ini-${idx}-nome">Nome da iniciativa</label>
          <input type="text" id="ini-${idx}-nome" data-ini-field="nome" data-ini-idx="${idx}" value="${esc(
            ini.nome || ''
          )}" placeholder="Ex.: Triagem assistida de laudos" maxlength="120">
        </div>
        <div class="grid-2">
          <div class="field"><label for="ini-${idx}-problema">Problema que resolve</label>
            <textarea id="ini-${idx}-problema" data-ini-field="problema" data-ini-idx="${idx}" maxlength="400" placeholder="Qual dor de negócio ela endereça?">${esc(
              ini.problema || ''
            )}</textarea>
          </div>
          <div class="field"><label for="ini-${idx}-beneficio">Benefício esperado</label>
            <textarea id="ini-${idx}-beneficio" data-ini-field="beneficio" data-ini-idx="${idx}" maxlength="400" placeholder="Impacto mensurável esperado">${esc(
              ini.beneficio || ''
            )}</textarea>
          </div>
        </div>
        <div class="grid-2">
          <div class="field" style="margin:0">
            <label for="ini-${idx}-urgencia">Grau de urgência</label>
            <select id="ini-${idx}-urgencia" data-ini-field="urgencia" data-ini-idx="${idx}">
              <option value="1" ${Number(ini.urgencia || 0) === 1 ? 'selected' : ''}>1 · Baixa</option>
              <option value="2" ${Number(ini.urgencia || 0) === 2 || !ini.urgencia ? 'selected' : ''}>2 · Média</option>
              <option value="3" ${Number(ini.urgencia || 0) === 3 ? 'selected' : ''}>3 · Alta</option>
            </select>
          </div>
          <div class="field" style="margin:0">
            <label for="ini-${idx}-dimensao">Dimensão que sustenta</label>
            <select id="ini-${idx}-dimensao" data-ini-field="dimensao" data-ini-idx="${idx}">
              <option value="">Não sei / várias</option>
              ${DIMENSIONS.map(
                (d) => `<option value="${d.key}" ${ini.dimensao === d.key ? 'selected' : ''}>${esc(d.nome)}</option>`
              ).join('')}
            </select>
          </div>
        </div>
      </div>`
    })
    .join('')

  const textoSec = textQs.length
    ? `<section class="section" id="contexto" data-section="contexto">
      <div class="section-head">
        <div class="dim-icon"><i class="fa-solid fa-comment-dots" aria-hidden="true"></i></div>
        <div><h2>Contexto</h2><div class="sub">Opcional · não pontua, mas aparece no resumo executivo do relatório.</div></div>
      </div>
      ${textQs
        .map(
          (q) => `<div class="q" data-q="${q.id}" data-required="0" data-answered="${
            isAnswered(q, ctx.respostas[q.id]) ? 1 : 0
          }">
          <div class="q-title"><span>${esc(q.texto)}</span></div>
          ${q.ajuda ? `<div class="q-help">${esc(q.ajuda)}</div>` : ''}
          <textarea id="q-${q.id}" data-qid="${q.id}" data-tipo="texto" rows="3" maxlength="400" placeholder="Sua resposta…">${esc(
            String((ctx.respostas[q.id] as any)?.t ?? ctx.respostas[q.id] ?? '')
          )}</textarea>
        </div>`
        )
        .join('')}
    </section>`
    : ''

  const revisao = `<section class="section" id="revisao" data-section="revisao">
    <div class="section-head">
      <div class="dim-icon"><i class="fa-solid fa-clipboard-check" aria-hidden="true"></i></div>
      <div><h2>Revisão e envio</h2><div class="sub">Confira as pendências antes de submeter. Após o envio, o formulário é bloqueado.</div></div>
    </div>
    <div id="pending-box" style="margin-top:14px" aria-live="polite">
      ${pendingHtml(ctx.questions, ctx.respostas)}
    </div>
    <div class="alert info"><i class="fa-solid fa-circle-info" aria-hidden="true"></i><div>
      Ao submeter, o relatório é gerado automaticamente com índice de maturidade, quadro de resultados das 7 dimensões, radar atual × meta,
      iniciativas priorizadas e plano de 90 dias. Alterações posteriores exigem reabertura pelo consultor da Unified.
    </div></div>
    <button class="btn btn-accent" type="button" id="btn-submit" style="height:44px;padding:0 22px">
      <i class="fa-solid fa-paper-plane" aria-hidden="true"></i> Enviar assessment e gerar relatório
    </button>
  </section>`

  const steps = [
    ...DIMENSIONS.map((d, i) => {
      const total = scored.filter((q) => q.dimensao === d.key).length
      const done = scored.filter((q) => q.dimensao === d.key && isAnswered(q, ctx.respostas[q.id])).length
      const complete = total > 0 && done === total
      return `<a href="#dim-${d.key}" class="step ${complete ? 'done' : ''}" data-step="${d.key}">${i + 1} · ${esc(
        d.short
      )}</a>`
    }),
    `<a href="#revisao" class="step" data-step="revisao">✓ · Revisão</a>`,
  ].join('')

  const body = `
<div class="progress-card">
  <div class="target">
    <span class="small" style="color:#b9c4de">Assessment de</span>
    <strong>${esc(ctx.empresa)}</strong>
    <span class="small" style="color:#b9c4de">${esc(ctx.responsavel)}${
      ctx.expiraEm ? ` · disponível até ${esc(fmtDate(ctx.expiraEm))}` : ''
    }</span>
  </div>
  <div class="progress-track">
    <div class="bar"><span id="progress-bar" style="width:${pct}%"></span></div>
    <div class="pct">
      <span id="progress-text">${answeredCount} de ${scored.length} perguntas respondidas</span>
      <span><span id="progress-pct">${pct}%</span> · <span id="save-state" class="save-state">rascunho salvo automaticamente</span></span>
    </div>
  </div>
</div>

${ctx.flash ? `<div class="alert ${ctx.flash.kind}" role="status"><i class="fa-solid fa-circle-info" aria-hidden="true"></i><div>${ctx.flash.text}</div></div>` : ''}
${
  ctx.reaberto
    ? `<div class="alert warn"><i class="fa-solid fa-rotate-left" aria-hidden="true"></i><div>
        <strong>Formulário reaberto pelo consultor.</strong> Ao enviar novamente será gerada uma nova versão do relatório — a anterior permanece acessível.
      </div></div>`
    : ''
}

<nav class="steps" aria-label="Seções do formulário">${steps}</nav>
${sections}
${textoSec}
<section class="section" id="iniciativas" data-section="iniciativas">
  <div class="section-head">
    <div class="dim-icon"><i class="fa-solid fa-lightbulb" aria-hidden="true"></i></div>
    <div><h2>Candidatos a iniciativa de IA</h2>
      <div class="sub">Até 5 iniciativas. Se deixar em branco, o relatório sugere iniciativas do seu vertical.</div></div>
  </div>
  <div style="margin-top:14px">${iniCards}</div>
</section>
${revisao}
<div class="sticky-bar no-print">
  <div class="inner">
    <span class="save-state" id="sticky-state"><i class="fa-solid fa-cloud" aria-hidden="true"></i> rascunho salvo automaticamente</span>
    <div style="display:flex;gap:8px">
      <a class="btn btn-ghost" href="#revisao">Revisar</a>
      <button class="btn" type="button" id="btn-submit-bottom"><i class="fa-solid fa-paper-plane" aria-hidden="true"></i> Enviar</button>
    </div>
  </div>
</div>
<script>${formScript(ctx.token, pendentes.length)}</script>`

  return publicShell(`Assessment · ${ctx.empresa}`, body, { backHref: undefined })
}

function pendingHtml(questions: QRow[], respostas: Record<number, unknown>): string {
  const pend = questions.filter((q) => q.obrigatoria && !isAnswered(q, respostas[q.id]))
  if (!pend.length) {
    return `<div class="alert ok"><i class="fa-solid fa-circle-check" aria-hidden="true"></i><div><strong>Tudo respondido.</strong> Você pode enviar o assessment.</div></div>`
  }
  return `<div class="alert warn"><i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i><div>
    <strong>${pend.length} pergunta(s) obrigatória(s) em branco.</strong>
    <div class="small" style="margin-top:6px">${pend
      .map((q) => `<a href="#q-${q.id}" data-jump="${q.id}">${esc(q.texto.slice(0, 70))}…</a>`)
      .join('<br>')}</div></div></div>`
}

function inputHtml(q: QRow, valor: unknown): string {
  const v = valor as any

  if (q.tipo === 'escala') {
    const labels: string[] = q.rubrica?.labels || []
    const current = v && typeof v === 'object' ? Number(v.v) : Number(valor)
    return `<div class="scale" role="radiogroup" aria-label="${esc(q.texto)}">
      ${[1, 2, 3, 4, 5]
        .map((n) => {
          const lvl = n - 1
          return `<label>
            <input type="radio" name="q-${q.id}" id="q-${q.id}-${n}" value="${n}" data-qid="${q.id}" data-tipo="escala" ${
              current === n ? 'checked' : ''
            }>
            <span class="lv">L${lvl}</span>
            <span class="lb">${esc(labels[lvl] || LEVEL_LABELS[lvl].split(' · ')[1])}</span>
          </label>`
        })
        .join('')}
    </div>`
  }

  if (q.tipo === 'escolha') {
    const current = v && typeof v === 'object' ? Number(v.i) : Number(valor)
    return `<div class="opts" role="radiogroup" aria-label="${esc(q.texto)}">
      ${(q.opcoes || [])
        .map(
          (o, i) => `<label class="opt">
          <input type="radio" name="q-${q.id}" id="q-${q.id}-${i}" value="${i}" data-qid="${q.id}" data-tipo="escolha" ${
            current === i ? 'checked' : ''
          }>
          <span>${esc(o.label)}</span>
          <span class="lvl">L${o.level}</span>
        </label>`
        )
        .join('')}
    </div>`
  }

  if (q.tipo === 'multipla') {
    const sel: number[] = Array.isArray(valor) ? valor.map(Number) : Array.isArray(v?.sel) ? v.sel.map(Number) : []
    return `<div class="opts" role="group" aria-label="${esc(q.texto)}">
      ${(q.opcoes || [])
        .map(
          (o, i) => `<label class="opt">
          <input type="checkbox" id="q-${q.id}-${i}" value="${i}" data-qid="${q.id}" data-tipo="multipla" ${
            sel.includes(i) ? 'checked' : ''
          }>
          <span>${esc(o.label)}</span>
        </label>`
        )
        .join('')}
    </div>`
  }

  return `<textarea id="q-${q.id}" data-qid="${q.id}" data-tipo="texto" rows="3" maxlength="600">${esc(
    String(v?.t ?? valor ?? '')
  )}</textarea>`
}

function formScript(token: string, pendingCount: number): string {
  return `
(function(){
  var TOKEN = ${JSON.stringify(token)};
  var pendingQ = {}, pendingIni = {}, pendingTargets = {}, inFlight = false, timer = null;

  function setState(kind, text){
    ['save-state','sticky-state'].forEach(function(id){
      var el = document.getElementById(id);
      if (!el) return;
      el.className = 'save-state ' + kind;
      el.innerHTML = text;
    });
  }

  function valFor(qid, tipo){
    if (tipo === 'escala' || tipo === 'escolha') {
      var checked = document.querySelector('input[data-qid="'+qid+'"]:checked');
      if (!checked) return null;
      return tipo === 'escala' ? { v: Number(checked.value) } : { i: Number(checked.value) };
    }
    if (tipo === 'multipla') {
      var sel = [];
      document.querySelectorAll('input[type=checkbox][data-qid="'+qid+'"]').forEach(function(c){
        if (c.checked) sel.push(Number(c.value));
      });
      return sel.length ? { sel: sel } : null;
    }
    var ta = document.getElementById('q-'+qid);
    var t = ta ? ta.value.trim() : '';
    return t ? { t: t } : null;
  }

  function isFilled(qid, tipo, val){
    if (!val) return false;
    if (tipo === 'escala') return Number(val.v) >= 1;
    if (tipo === 'escolha') return typeof val.i === 'number' && !isNaN(val.i);
    if (tipo === 'multipla') return !!(val.sel && val.sel.length);
    return !!(val.t && val.t.length);
  }

  function mark(qid, tipo, val){
    var box = document.querySelector('[data-q="'+qid+'"]');
    var st = document.querySelector('[data-status="'+qid+'"]');
    var ok = isFilled(qid, tipo, val);
    if (box) box.setAttribute('data-answered', ok ? '1' : '0');
    if (st) st.innerHTML = ok ? '<i class="fa-solid fa-circle-check" style="color:#12805c" aria-label="Respondida"></i>' : '';
    progress();
  }

  function progress(){
    var total = 0, done = 0;
    document.querySelectorAll('[data-section]').forEach(function(sec){
      var key = sec.getAttribute('data-section');
      if (key === 'revisao' || key === 'iniciativas') return;
      var qs = sec.querySelectorAll('[data-q]');
      var d = sec.querySelectorAll('[data-q][data-answered="1"]').length;
      total += qs.length; done += d;
      var c = document.querySelector('[data-count="'+key+'"]');
      if (c) c.textContent = d + '/' + qs.length;
      var step = document.querySelector('[data-step="'+key+'"]');
      if (step) step.classList.toggle('done', qs.length > 0 && d === qs.length);
    });
    var pct = Math.round((done / Math.max(1, total)) * 100);
    var bar = document.getElementById('progress-bar');
    if (bar) bar.style.width = pct + '%';
    var txt = document.getElementById('progress-text');
    if (txt) txt.textContent = done + ' de ' + total + ' perguntas respondidas';
    var pe = document.getElementById('progress-pct');
    if (pe) pe.textContent = pct + '%';

    var missing = [];
    document.querySelectorAll('[data-q][data-required="1"][data-answered="0"]').forEach(function(el){
      missing.push(Number(el.getAttribute('data-q')));
    });
    var boxEl = document.getElementById('pending-box');
    if (boxEl) {
      if (!missing.length) {
        boxEl.innerHTML = '<div class="alert ok"><i class="fa-solid fa-circle-check" aria-hidden="true"></i><div><strong>Tudo respondido.</strong> Você pode enviar o assessment.</div></div>';
      } else {
        boxEl.innerHTML = '<div class="alert warn"><i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i><div><strong>'
          + missing.length + ' pergunta(s) obrigatória(s) em branco.</strong>'
          + '<div class="small" style="margin-top:6px">Revise as seções anteriores — as pendências estão marcadas.</div></div></div>';
      }
    }
    return missing.length;
  }

  function payload(){
    var out = { respostas: [] };
    Object.keys(pendingQ).forEach(function(k){
      out.respostas.push({ question_id: Number(k), valor: pendingQ[k] });
    });
    var t = Object.keys(pendingTargets);
    if (t.length) out.targets = t.map(function(k){ return { dimensao: k, meta: pendingTargets[k] }; });
    var i = Object.keys(pendingIni);
    if (i.length) out.iniciativas = i.map(function(k){ return pendingIni[k]; });
    return out;
  }

  function flush(force){
    var p = payload();
    if (!p.respostas.length && !p.targets && !p.iniciativas) return Promise.resolve();
    if (inFlight) { if (force) setTimeout(function(){ flush(true); }, 500); return Promise.resolve(); }
    inFlight = true;
    pendingQ = {}; pendingIni = {}; pendingTargets = {};
    setState('saving', '<i class="fa-solid fa-circle-notch fa-spin"></i> salvando…');
    return fetch('/api/a/'+TOKEN+'/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(p)
    }).then(function(r){
      if (!r.ok) throw new Error('http '+r.status);
      inFlight = false;
      setState('saved', '<i class="fa-solid fa-circle-check"></i> salvo automaticamente');
      if (Object.keys(pendingQ).length || Object.keys(pendingIni).length || Object.keys(pendingTargets).length) flush(false);
    }).catch(function(){
      inFlight = false;
      p.respostas.forEach(function(r){ pendingQ[r.question_id] = r.valor; });
      if (p.targets) p.targets.forEach(function(t){ pendingTargets[t.dimensao] = t.meta; });
      if (p.iniciativas) p.iniciativas.forEach(function(x){ pendingIni[x.idx] = x; });
      setState('error', '<i class="fa-solid fa-triangle-exclamation"></i> falha ao salvar — nova tentativa em instantes');
      setTimeout(function(){ flush(false); }, 3000);
    });
  }

  function queue(){ clearTimeout(timer); timer = setTimeout(function(){ flush(false); }, 800); setState('saving', '<i class="fa-solid fa-pen"></i> alterações pendentes…'); }

  document.addEventListener('change', function(ev){
    var el = ev.target;
    if (!el) return;
    if (el.matches('[data-tipo]')) {
      var qid = Number(el.getAttribute('data-qid'));
      var tipo = el.getAttribute('data-tipo');
      var val = valFor(qid, tipo);
      pendingQ[qid] = val;
      mark(qid, tipo, val);
      queue();
      return;
    }
    if (el.matches('[data-ini-field]')) {
      var idx = Number(el.getAttribute('data-ini-idx'));
      var card = el.closest('.ini-card');
      var obj = { idx: idx, nome:'', problema:'', beneficio:'', urgencia:2, dimensao:null };
      card.querySelectorAll('[data-ini-field]').forEach(function(f){
        var fk = f.getAttribute('data-ini-field');
        obj[fk] = fk === 'urgencia' ? Number(f.value) : (f.value || null);
      });
      if (!obj.nome) { delete pendingIni[idx]; return; }
      pendingIni[idx] = obj;
      queue();
    }
  });

  document.addEventListener('input', function(ev){
    var el = ev.target;
    if (el && el.tagName === 'TEXTAREA' && el.matches('[data-tipo="texto"]')) {
      var qid = Number(el.getAttribute('data-qid'));
      var val = valFor(qid, 'texto');
      pendingQ[qid] = val;
      mark(qid, 'texto', val);
      queue();
    }
  });

  document.addEventListener('click', function(ev){
    var btn = ev.target.closest('[data-target]');
    if (btn) {
      var key = btn.getAttribute('data-target');
      var lvl = Number(btn.getAttribute('data-level'));
      btn.parentElement.querySelectorAll('[data-target]').forEach(function(b){
        var on = b === btn;
        b.classList.toggle('on', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      pendingTargets[key] = lvl;
      queue();
      return;
    }
    var jump = ev.target.closest('[data-jump]');
    if (jump) {
      var q = jump.getAttribute('data-jump');
      var target = document.querySelector('[data-q="'+q+'"]');
      if (target) {
        ev.preventDefault();
        target.scrollIntoView({ behavior:'smooth', block:'center' });
        var first = target.querySelector('input, textarea');
        if (first) setTimeout(function(){ first.focus({ preventScroll:true }); }, 350);
      }
    }
  });

  function submit(){
    var missing = progress();
    flush(true).then(function(){
      setTimeout(function(){
        if (missing > 0) {
          document.getElementById('revisao').scrollIntoView({ behavior:'smooth' });
          setState('error', '<i class="fa-solid fa-triangle-exclamation"></i> ' + missing + ' pergunta(s) obrigatória(s) pendente(s)');
          return;
        }
        setState('saving', '<i class="fa-solid fa-circle-notch fa-spin"></i> gerando relatório…');
        fetch('/api/a/'+TOKEN+'/submit', { method:'POST', headers: { 'Content-Type':'application/json' }, body: '{}' })
          .then(function(r){ return r.json().then(function(j){ return { status: r.status, body: j }; }); })
          .then(function(res){
            if (res.status === 200 && res.body.ok) { window.location.href = '/a/'+TOKEN+'/relatorio'; return; }
            setState('error', '<i class="fa-solid fa-triangle-exclamation"></i> ' + (res.body.message || 'verifique as pendências'));
            window.location.reload();
          })
          .catch(function(){ setState('error', '<i class="fa-solid fa-triangle-exclamation"></i> falha no envio — tente novamente'); });
      }, 300);
    });
  }

  var a = document.getElementById('btn-submit'); if (a) a.addEventListener('click', submit);
  var b = document.getElementById('btn-submit-bottom'); if (b) b.addEventListener('click', submit);
  window.addEventListener('beforeunload', function(){ if (Object.keys(pendingQ).length) flush(false); });
  progress();
})();
`
}
