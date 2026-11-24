import { DIMENSIONS, MATURITY_MATRIX, MATURITY_LABELS, PERSONA_DESC, PERSONA_LABEL } from '../questions'
import type { DimKey } from '../questions'
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
  /** Kept for backwards compatibility with older call sites — unused. */
  initiatives?: unknown[]
  estado: string
  expiraEm: string | null
  reaberto: boolean
  flash?: { kind: 'ok' | 'warn' | 'danger' | 'info'; text: string } | null
}

/** Evidence text of a hybrid answer (or plain text answer). */
function textOf(valor: unknown): string {
  if (valor === null || valor === undefined) return ''
  if (typeof valor === 'object' && valor !== null) return String((valor as any).t ?? '')
  return String(valor)
}

/** Maturity level of a scale/hybrid answer, or null. */
function levelOf(valor: unknown): number | null {
  if (valor === null || valor === undefined || valor === '') return null
  const raw = typeof valor === 'object' && valor !== null ? Number((valor as any).v) : Number(valor)
  if (!Number.isFinite(raw) || raw < 1) return null
  return Math.max(1, Math.min(5, Math.round(raw)))
}

export function renderFormPage(ctx: FormContext): string {
  const total = ctx.questions.length
  const answeredCount = ctx.questions.filter((q) => isAnswered(q, ctx.respostas[q.id])).length
  const pct = Math.round((answeredCount / Math.max(1, total)) * 100)
  const pendentes = ctx.questions.filter((q) => q.obrigatoria && !isAnswered(q, ctx.respostas[q.id]))

  const seq: Record<number, number> = {}
  ctx.questions.forEach((q, i) => {
    seq[q.id] = i + 1
  })

  const sections = DIMENSIONS.map((dim, dimIdx) => {
    const all = ctx.questions.filter((q) => q.dimensao === dim.key)
    if (!all.length) return ''
    const discoveries = all.filter((q) => q.persona === 'O')
    const scored = all.filter((q) => q.persona !== 'O')
    const done = all.filter((q) => isAnswered(q, ctx.respostas[q.id])).length
    const metaRaw = Number(ctx.metas[dim.key])
    const meta = Number.isFinite(metaRaw) && metaRaw >= 1 ? Math.min(5, Math.round(metaRaw)) : 3

    const descobrirHtml = discoveries.length
      ? `<div class="subblock">
          <div class="subblock-head">
            <span class="pill pill-discovery"><i class="fa-solid fa-magnifying-glass-chart" aria-hidden="true"></i> ${esc(
              PERSONA_LABEL.O
            )}</span>
            <div class="small muted">${esc(PERSONA_DESC.O)}</div>
          </div>
          ${discoveries.map((q) => questionBlock(q, ctx, seq)).join('')}
        </div>`
      : ''

    const maturidadeHtml = scored.length
      ? `<div class="subblock">
          <div class="subblock-head">
            <span class="pill pill-maturity"><i class="fa-solid fa-gauge-high" aria-hidden="true"></i> ${esc(
              PERSONA_LABEL.M
            )}${scored.some((q) => q.persona === 'H') ? ' + Hybrid' : ''}</span>
            <div class="small muted">${esc(PERSONA_DESC.M)}</div>
          </div>
          ${scored.map((q) => questionBlock(q, ctx, seq)).join('')}
        </div>`
      : ''

    return `<section class="section" id="dim-${dim.key}" data-section="${dim.key}">
      <div class="section-head">
        <div class="dim-icon"><i class="fa-solid ${dim.icone}" aria-hidden="true"></i></div>
        <div>
          <h2>${dimIdx + 1}. ${esc(dim.nome)}</h2>
          <div class="sub">${esc(dim.objetivo)}</div>
          <div class="small muted" style="margin-top:4px">
            <strong>Weight in the index:</strong> ${Math.round(dim.peso * 100)}% ·
            <strong>Expected outcomes:</strong> ${esc(dim.expectedOutcomes)}
          </div>
        </div>
        <span class="count" data-count="${dim.key}">${done}/${all.length}</span>
      </div>
      ${descobrirHtml}
      ${maturidadeHtml}
      <div class="divider"></div>
      <div class="flex-between">
        <div>
          <strong class="small">12-month target for this dimension</strong>
          <div class="small muted">Desired maturity level at the end of 12 months — the basis of the current × target comparison in the radar.</div>
        </div>
        <div class="seg" role="group" aria-label="12-month target for ${esc(dim.nome)}">
          ${[1, 2, 3, 4, 5]
            .map(
              (lvl) =>
                `<button type="button" data-target="${dim.key}" data-level="${lvl}" class="lvl-${lvl} ${meta === lvl ? 'on' : ''}" aria-pressed="${
                  meta === lvl
                }" title="${esc(MATURITY_LABELS[lvl - 1])}">L${lvl}</button>`
            )
            .join('')}
        </div>
      </div>
    </section>`
  }).join('')

  const methodCard = `<section class="card method-card" id="metodo">
    <div class="card-head"><div>
      <h2>UT — Outcome-Driven AI Assessment Framework</h2>
      <div class="sub">${total} questions · 7 dimensions · maturity scale 1–5</div>
    </div></div>
    <p class="small" style="margin:0 0 14px">
      The questionnaire is one instrument with three kinds of question. Your <strong>business outcomes</strong>
      shape the strategy; the <strong>maturity</strong> answers measure the capability you already have; the
      <strong>hybrid</strong> answers do both and keep the evidence you give. Maturity is determined from the
      evidence collected, not only from perception.
    </p>
    <div class="method-grid">
      <div class="method-item">
        <span class="pill pill-discovery"><i class="fa-solid fa-magnifying-glass-chart" aria-hidden="true"></i> ${esc(
          PERSONA_LABEL.O
        )}</span>
        <p class="small">Identifies objectives, problems, KPIs and opportunities. <strong>Not scored</strong> — feeds the business outcome map and the initiative portfolio.</p>
      </div>
      <div class="method-item">
        <span class="pill pill-maturity"><i class="fa-solid fa-gauge-high" aria-hidden="true"></i> ${esc(
          PERSONA_LABEL.M
        )}</span>
        <p class="small">Evaluates existing capabilities, processes and controls. <strong>Scored 1–5</strong> — feeds the AI Maturity Index.</p>
      </div>
      <div class="method-item">
        <span class="pill pill-hybrid"><i class="fa-solid fa-layer-group" aria-hidden="true"></i> ${esc(
          PERSONA_LABEL.H
        )}</span>
        <p class="small">Identifies opportunities and provides maturity evidence. <strong>Scored 1–5</strong>, keeping the evidence text you write.</p>
      </div>
    </div>
    <div class="divider"></div>
    <strong class="small">Maturity scale</strong>
    <div class="scale-legend">
      ${MATURITY_LABELS.map(
        (label, i) => `<div class="legend-item"><span class="lvl-chip l${i + 1}">${i + 1}</span><span class="small">${esc(
          label.split(' · ')[1]
        )}</span></div>`
      ).join('')}
    </div>
    <div class="small muted" style="margin-top:10px">
      Each maturity question shows the five anchors of its own dimension. The dimension level is the mean of its
      scored answers — so the index rests on evidence rather than on a single perception score.
    </div>
  </section>`

  const revisao = `<section class="section" id="revisao" data-section="revisao">
    <div class="section-head">
      <div class="dim-icon"><i class="fa-solid fa-clipboard-check" aria-hidden="true"></i></div>
      <div><h2>Review and submit</h2><div class="sub">Check the outstanding items before submitting. Once submitted, the questionnaire is locked.</div></div>
    </div>
    <div id="pending-box" style="margin-top:14px" aria-live="polite">
      ${pendingHtml(ctx.questions, ctx.respostas)}
    </div>
    <div class="alert info"><i class="fa-solid fa-circle-info" aria-hidden="true"></i><div>
      On submit, the report is generated automatically with the business outcome map, the weighted AI Maturity Index,
      the scorecard of the 7 dimensions, the current × target radar, the initiative portfolio split into
      <strong>business transformation</strong> and <strong>AI enabling</strong> initiatives, the P0–P4 prioritisation
      and the AI Transformation Roadmap. Later changes require the Unified Technologies consultant to reopen it.
    </div></div>
    <button class="btn btn-accent" type="button" id="btn-submit" style="height:44px;padding:0 22px">
      <i class="fa-solid fa-paper-plane" aria-hidden="true"></i> Submit assessment and generate report
    </button>
  </section>`

  const steps = [
    `<a href="#metodo" class="step">0 · Method</a>`,
    ...DIMENSIONS.map((d, i) => {
      const all = ctx.questions.filter((q) => q.dimensao === d.key)
      const done = all.filter((q) => isAnswered(q, ctx.respostas[q.id])).length
      const complete = all.length > 0 && done === all.length
      return `<a href="#dim-${d.key}" class="step ${complete ? 'done' : ''}" data-step="${d.key}">${i + 1} · ${esc(
        d.short
      )}</a>`
    }),
    `<a href="#revisao" class="step" data-step="revisao">✓ · Review</a>`,
  ].join('')

  const body = `
<div class="progress-card">
  <div class="target">
    <span class="small" style="color:#b9c4de">Assessment for</span>
    <strong>${esc(ctx.empresa)}</strong>
    <span class="small" style="color:#b9c4de">${esc(ctx.responsavel)}${
      ctx.expiraEm ? ` · available until ${esc(fmtDate(ctx.expiraEm))}` : ''
    }</span>
  </div>
  <div class="progress-track">
    <div class="bar"><span id="progress-bar" style="width:${pct}%"></span></div>
    <div class="pct">
      <span id="progress-text">${answeredCount} of ${total} questions answered</span>
      <span><span id="progress-pct">${pct}%</span> · <span id="save-state" class="save-state">draft saved automatically</span></span>
    </div>
  </div>
</div>

${ctx.flash ? `<div class="alert ${ctx.flash.kind}" role="status"><i class="fa-solid fa-circle-info" aria-hidden="true"></i><div>${ctx.flash.text}</div></div>` : ''}
${
  ctx.reaberto
    ? `<div class="alert warn"><i class="fa-solid fa-rotate-left" aria-hidden="true"></i><div>
        <strong>Questionnaire reopened by the consultant.</strong> Submitting again generates a new report version — the previous one stays accessible.
      </div></div>`
    : ''
}

<nav class="steps" aria-label="Questionnaire sections">${steps}</nav>
${methodCard}
${sections}
<section class="section" id="iniciativas" data-section="iniciativas">
  <div class="section-head">
    <div class="dim-icon"><i class="fa-solid fa-lightbulb" aria-hidden="true"></i></div>
    <div><h2>Recommended initiatives</h2>
      <div class="sub">Nothing to fill in here — the framework proposes them for you.</div></div>
  </div>
  <div class="alert info" style="margin-top:14px">
    <i class="fa-solid fa-wand-magic-sparkles" aria-hidden="true"></i>
    <div>
      <strong>You do not need to list any initiatives.</strong>
      Your answers feed an initiative engine built on a catalogue of 28 initiatives. The report maps each dimension
      and maturity gap to the recommended initiative, scores it on the seven prioritisation criteria
      (business outcome impact, strategic alignment, maturity gap, economic value, feasibility, time to value and
      risk &amp; dependency criticality) and classifies it <strong>P0–P4</strong>.
      <div class="small muted" style="margin-top:8px">
        The portfolio is then split into <strong>business transformation initiatives</strong> — the ones that deliver
        business results — and <strong>AI enabling initiatives</strong> — the ones that establish the conditions for
        those results. The roadmap is organised as mandatory foundations · quick wins · strategic initiatives.
      </div>
    </div>
  </div>
</section>
${revisao}
<div class="sticky-bar no-print">
  <div class="inner">
    <span class="save-state" id="sticky-state"><i class="fa-solid fa-cloud" aria-hidden="true"></i> draft saved automatically</span>
    <div style="display:flex;gap:8px">
      <a class="btn btn-ghost" href="#revisao">Review</a>
      <button class="btn" type="button" id="btn-submit-bottom"><i class="fa-solid fa-paper-plane" aria-hidden="true"></i> Submit</button>
    </div>
  </div>
</div>
<script>${formScript(ctx.token)}</script>`

  return publicShell(`Assessment · ${ctx.empresa}`, body, {
    hero: {
      kicker: 'Questionnaire',
      title: ctx.empresa,
      lede: 'Answers are saved automatically. Estimated time: about 30 minutes.',
      breadcrumb: `Assessment · ${esc(ctx.responsavel)}`,
    },
    wide: false,
    bodyClass: 'public-shell assessment-shell',
  })
}

function questionBlock(q: QRow, ctx: FormContext, seq: Record<number, number>): string {
  const valor = ctx.respostas[q.id]
  const answered = isAnswered(q, valor)
  return `<div class="q" data-q="${q.id}" data-required="${q.obrigatoria ? 1 : 0}" data-answered="${answered ? 1 : 0}">
    <div class="q-title">
      <span class="n">${seq[q.id]}.</span>
      <span class="ref-chip">${esc(q.ref || q.slug)}</span>
      <span>${esc(q.texto)}${
        q.obrigatoria
          ? ' <span class="req" aria-hidden="true">*</span><span class="sr-only">(required)</span>'
          : ''
      }</span>
      <span class="q-status" data-status="${q.id}">${
        answered ? '<i class="fa-solid fa-circle-check" style="color:#12805c" aria-label="Answered"></i>' : ''
      }</span>
    </div>
    ${q.ajuda ? `<div class="q-help">${esc(q.ajuda)}</div>` : ''}
    ${inputHtml(q, valor)}
  </div>`
}

function pendingHtml(questions: QRow[], respostas: Record<number, unknown>): string {
  const pend = questions.filter((q) => q.obrigatoria && !isAnswered(q, respostas[q.id]))
  if (!pend.length) {
    return `<div class="alert ok"><i class="fa-solid fa-circle-check" aria-hidden="true"></i><div><strong>Everything answered.</strong> You can submit the assessment.</div></div>`
  }
  return `<div class="alert warn"><i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i><div>
    <strong>${pend.length} required question(s) left blank.</strong>
    <div class="small" style="margin-top:6px">${pend
      .map((q) => `<a href="#q-${q.id}" data-jump="${q.id}">${esc((q.ref ? q.ref + ' · ' : '') + q.texto.slice(0, 66))}…</a>`)
      .join('<br>')}</div></div></div>`
}

/** 1–5 maturity scale with the dimension's own anchors. */
function scaleHtml(q: QRow, current: number | null, tipo: 'escala' | 'hibrido'): string {
  const labels: string[] = q.rubrica?.labels || MATURITY_MATRIX[q.dimensao as DimKey] || []
  return `<div class="scale" role="radiogroup" aria-label="${esc(q.texto)}">
    ${[1, 2, 3, 4, 5]
      .map((n) => {
        const anchor = labels[n - 1] || MATURITY_LABELS[n - 1].split(' · ')[1]
        return `<label>
          <input type="radio" name="q-${q.id}" id="q-${q.id}-${n}" value="${n}" data-qid="${q.id}" data-tipo="${tipo}" ${
            current === n ? 'checked' : ''
          }>
          <span class="lv">L${n}</span>
          <span class="lb">${esc(anchor)}</span>
        </label>`
      })
      .join('')}
  </div>`
}

function inputHtml(q: QRow, valor: unknown): string {
  const v = valor as any

  if (q.tipo === 'escala') {
    return scaleHtml(q, levelOf(valor), 'escala')
  }

  if (q.tipo === 'hibrido') {
    return `<div class="hybrid">
      ${scaleHtml(q, levelOf(valor), 'hibrido')}
      <label class="ev-field" for="q-${q.id}-ev">
        <span class="ev-label"><i class="fa-solid fa-clipboard-list" aria-hidden="true"></i> Evidence that supports the level you selected <span class="muted">(recommended)</span></span>
        <textarea id="q-${q.id}-ev" data-qid="${q.id}" data-tipo="hibrido" rows="2" maxlength="600" placeholder="Systems, documents, teams, controls or metrics that justify the score…">${esc(
          textOf(valor)
        )}</textarea>
      </label>
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

  return `<textarea id="q-${q.id}" data-qid="${q.id}" data-tipo="texto" rows="3" maxlength="600" placeholder="Your answer…">${esc(
    textOf(valor)
  )}</textarea>`
}

function formScript(token: string): string {
  return `
(function(){
  var TOKEN = ${JSON.stringify(token)};
  var pendingQ = {}, pendingTargets = {}, inFlight = false, timer = null;

  function setState(kind, text){
    ['save-state','sticky-state'].forEach(function(id){
      var el = document.getElementById(id);
      if (!el) return;
      el.className = 'save-state ' + kind;
      el.innerHTML = text;
    });
  }

  function radioVal(qid){
    var c = document.querySelector('input[data-qid="'+qid+'"]:checked');
    return c ? Number(c.value) : 0;
  }

  function evText(qid){
    var ta = document.getElementById('q-'+qid+'-ev');
    return ta ? ta.value.trim() : '';
  }

  function valFor(qid, tipo){
    if (tipo === 'escala') {
      var v = radioVal(qid);
      return v ? { v: v } : null;
    }
    if (tipo === 'hibrido') {
      var hv = radioVal(qid), ht = evText(qid);
      if (!hv && !ht) return null;
      return { v: hv || 0, t: ht };
    }
    if (tipo === 'escolha') {
      var checked = document.querySelector('input[data-qid="'+qid+'"]:checked');
      return checked ? { i: Number(checked.value) } : null;
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

  function isFilled(tipo, val){
    if (!val) return false;
    if (tipo === 'escala' || tipo === 'hibrido') return Number(val.v) >= 1;
    if (tipo === 'escolha') return typeof val.i === 'number' && !isNaN(val.i);
    if (tipo === 'multipla') return !!(val.sel && val.sel.length);
    return !!(val.t && val.t.length);
  }

  function mark(qid, tipo, val){
    var box = document.querySelector('[data-q="'+qid+'"]');
    var st = document.querySelector('[data-status="'+qid+'"]');
    var ok = isFilled(tipo, val);
    if (box) box.setAttribute('data-answered', ok ? '1' : '0');
    if (st) st.innerHTML = ok ? '<i class="fa-solid fa-circle-check" style="color:#12805c" aria-label="Answered"></i>' : '';
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
    if (txt) txt.textContent = done + ' of ' + total + ' questions answered';
    var pe = document.getElementById('progress-pct');
    if (pe) pe.textContent = pct + '%';

    var missing = [];
    document.querySelectorAll('[data-q][data-required="1"][data-answered="0"]').forEach(function(el){
      missing.push(Number(el.getAttribute('data-q')));
    });
    var boxEl = document.getElementById('pending-box');
    if (boxEl) {
      if (!missing.length) {
        boxEl.innerHTML = '<div class="alert ok"><i class="fa-solid fa-circle-check" aria-hidden="true"></i><div><strong>Everything answered.</strong> You can submit the assessment.</div></div>';
      } else {
        boxEl.innerHTML = '<div class="alert warn"><i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i><div><strong>'
          + missing.length + ' required question(s) left blank.</strong>'
          + '<div class="small" style="margin-top:6px">Review the sections above — the outstanding items are marked.</div></div></div>';
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
    return out;
  }

  function flush(force){
    var p = payload();
    if (!p.respostas.length && !p.targets) return Promise.resolve();
    if (inFlight) { if (force) setTimeout(function(){ flush(true); }, 500); return Promise.resolve(); }
    inFlight = true;
    pendingQ = {}; pendingTargets = {};
    setState('saving', '<i class="fa-solid fa-circle-notch fa-spin"></i> saving…');
    return fetch('/api/a/'+TOKEN+'/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(p)
    }).then(function(r){
      if (!r.ok) throw new Error('http '+r.status);
      inFlight = false;
      setState('saved', '<i class="fa-solid fa-circle-check"></i> saved automatically');
      if (Object.keys(pendingQ).length || Object.keys(pendingTargets).length) flush(false);
    }).catch(function(){
      inFlight = false;
      p.respostas.forEach(function(r){ pendingQ[r.question_id] = r.valor; });
      if (p.targets) p.targets.forEach(function(t){ pendingTargets[t.dimensao] = t.meta; });
      setState('error', '<i class="fa-solid fa-triangle-exclamation"></i> could not save — retrying shortly');
      setTimeout(function(){ flush(false); }, 3000);
    });
  }

  function queue(){ clearTimeout(timer); timer = setTimeout(function(){ flush(false); }, 800); setState('saving', '<i class="fa-solid fa-pen"></i> unsaved changes…'); }

  document.addEventListener('change', function(ev){
    var el = ev.target;
    if (!el || !el.matches || !el.matches('[data-tipo]')) return;
    var qid = Number(el.getAttribute('data-qid'));
    var tipo = el.getAttribute('data-tipo');
    var val = valFor(qid, tipo);
    pendingQ[qid] = val;
    mark(qid, tipo, val);
    queue();
  });

  document.addEventListener('input', function(ev){
    var el = ev.target;
    if (!el || el.tagName !== 'TEXTAREA' || !el.matches('[data-tipo]')) return;
    var tipo = el.getAttribute('data-tipo');
    if (tipo !== 'texto' && tipo !== 'hibrido') return;
    var qid = Number(el.getAttribute('data-qid'));
    var val = valFor(qid, tipo);
    pendingQ[qid] = val;
    mark(qid, tipo, val);
    queue();
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
          setState('error', '<i class="fa-solid fa-triangle-exclamation"></i> ' + missing + ' required question(s) outstanding');
          return;
        }
        setState('saving', '<i class="fa-solid fa-circle-notch fa-spin"></i> generating report…');
        fetch('/api/a/'+TOKEN+'/submit', { method:'POST', headers: { 'Content-Type':'application/json' }, body: '{}' })
          .then(function(r){ return r.json().then(function(j){ return { status: r.status, body: j }; }); })
          .then(function(res){
            if (res.status === 200 && res.body.ok) { window.location.href = '/a/'+TOKEN+'/report'; return; }
            setState('error', '<i class="fa-solid fa-triangle-exclamation"></i> ' + (res.body.message || 'please check the outstanding items'));
            window.location.reload();
          })
          .catch(function(){ setState('error', '<i class="fa-solid fa-triangle-exclamation"></i> submission failed — please try again'); });
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
