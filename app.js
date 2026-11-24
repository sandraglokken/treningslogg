import * as S from './store.js';
import { TIPS } from './seed.js';

S.load();
const $app = document.getElementById('app');
const $tabs = document.getElementById('tabs');
let view = { name: 'home' };
let timer = null;

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const today = () => new Date().toISOString().slice(0, 10);
const fmtDate = (d) => new Date(d + 'T12:00').toLocaleDateString('nb-NO', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
const num = (v) => { const n = parseFloat(String(v).replace(',', '.')); return isNaN(n) ? '' : n; };
const fmtW = (w) => (w === '' || w == null ? '–' : String(w).replace('.', ',') + ' kg');

function go(v) { view = v; render(); window.scrollTo(0, 0); }

// ---------- Rendering ----------
function render() {
  const playing = view.name === 'play';
  document.body.classList.toggle('playing', playing);
  const tab = { home: 'home', log: 'log', logDetail: 'log', progress: 'progress', program: 'program', editSession: 'program', info: 'info' }[view.name];
  $tabs.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
  const fn = { home: vHome, play: vPlay, log: vLog, logDetail: vLogDetail, progress: vProgress, program: vProgram, editSession: vEditSession, info: vInfo }[view.name];
  $app.innerHTML = fn();
  if (view.name === 'progress') drawChart();
}

function vHome() {
  const d = S.get().draft;
  const last = [...S.get().logs].sort((a, b) => b.date.localeCompare(a.date))[0];
  return `<h1>Velg økt</h1>
  ${d ? `<div class="card click" data-act="resume"><b>Pågående økt</b><div class="muted">${esc(S.findSession(d.sessionId)?.name || '')} – fortsett der du slapp</div>
    <div class="row" style="margin-top:10px"><button class="primary grow" data-act="resume">Fortsett</button><button class="danger" data-act="discard">Forkast</button></div></div>` : ''}
  ${last ? `<p class="muted small">Sist trent: ${fmtDate(last.date)} (${esc(S.findSession(last.sessionId)?.name || last.sessionName || '')})</p>` : ''}
  ${S.get().program.sessions.map(s => `
    <div class="card click" data-act="start" data-id="${s.id}">
      <div class="row sp"><b style="font-size:19px">${esc(s.name)}</b><span class="pill ${s.priority === 'Må' ? 'must' : ''}">${esc(s.priority)}</span></div>
      <div>${esc(s.focus)}</div>
      <div class="muted small">ca. ${esc(s.minutes)} min · ${s.exercises.length} øvelser</div>
    </div>`).join('')}
  <p class="muted small">${esc(TIPS.week)}</p>`;
}

// ---------- Øktspiller ----------
function startSession(id) {
  const s = S.findSession(id);
  const date = today();
  S.get().draft = {
    sessionId: id, date, idx: -1, startedAt: Date.now(),
    entries: s.exercises.map(e => {
      const prev = S.lastEntry(e.id);
      const sets = Array.from({ length: e.sets }, (_, i) => ({
        weight: prev?.entry.sets[i]?.weight ?? prev?.entry.sets.at(-1)?.weight ?? '',
        reps: prev?.entry.sets[i]?.reps ?? '', done: false,
      }));
      return { exerciseId: e.id, name: e.name, type: e.type, sets, skipped: false };
    }),
  };
  S.save();
  go({ name: 'play' });
}

const setLabels = (type) => type === 'time' ? ['Min', 'Stigning / nivå'] : type === 'bodyweight' ? ['Reps', 'Ekstra kg'] : ['Vekt (kg)', 'Reps'];

function vPlay() {
  const d = S.get().draft;
  const s = S.findSession(d.sessionId);
  if (d.idx === -1) return vWarmup(d, s);
  if (d.idx >= d.entries.length) return vFinish(d, s);
  const entry = d.entries[d.idx];
  const ex = s.exercises.find(e => e.id === entry.exerciseId) || { reps: '', note: '', sets: entry.sets.length, type: entry.type };
  const prev = S.lastEntry(entry.exerciseId, d.date + 'z'); // inkluderer tidligere i dag ikke - se under
  const prevTop = prev ? S.topWeight(prev.entry) : 0;
  const allDone = prev && prev.entry.sets.length && prev.entry.sets.every(x => x.done);
  const labels = setLabels(entry.type);
  const swap = entry.type === 'bodyweight' || entry.type === 'time';
  const w = (x) => swap ? x.reps : x.weight; // kolonne 1
  const dots = d.entries.map((e, i) => `<i class="${i === d.idx ? 'cur' : e.skipped ? '' : e.sets.every(x => x.done) ? 'done' : ''}"></i>`).join('');
  const showWeightStats = entry.type === 'weight';
  return `<div class="row sp"><button class="ghost" data-act="quit">✕ Avslutt</button><span class="muted small">${d.idx + 1} / ${d.entries.length}</span></div>
  <div class="dots" style="margin-top:12px">${dots}</div>
  <div class="ex-title">${esc(entry.name)}</div>
  <div class="target">${ex.sets} × ${esc(ex.reps)}${ex.perSide ? ' per side' : ''}</div>
  ${ex.note ? `<p class="muted">${esc(ex.note)}</p>` : ''}
  ${showWeightStats ? `<div class="stats">
    <div class="stat"><b>${prev ? fmtW(prevTop) : '–'}</b><span>Sist${prev ? ' · ' + fmtDate(prev.date).split(',')[0] : ''}</span></div>
    <div class="stat"><b>${prevTop ? fmtW(S.warmupWeight(prevTop)) : '–'}</b><span>Oppvarming (≈50 %)</span></div>
  </div>
  ${allDone && prevTop ? `<div class="hint">Alle sett fullført sist – prøv ${fmtW(prevTop + 2.5)} hvis kontrollen er god.</div>` : ''}` : (prev ? `<div class="stats"><div class="stat"><b>${esc(prev.entry.sets.filter(x => x.done).map(x => swap ? x.reps : x.weight).join(' / ') || '–')}</b><span>Sist</span></div></div>` : '<div style="height:12px"></div>')}
  <div class="set head"><span></span><span>${labels[0]}</span><span>${labels[1]}</span><span></span></div>
  ${entry.sets.map((x, i) => `<div class="set">
    <span class="n">${i + 1}</span>
    <input inputmode="decimal" data-set="${i}" data-f="${swap ? 'reps' : 'weight'}" value="${esc(w(x))}" placeholder="–">
    <input inputmode="decimal" data-set="${i}" data-f="${swap ? 'weight' : 'reps'}" value="${esc(swap ? x.weight : x.reps)}" placeholder="–">
    <button class="chk ${x.done ? 'on' : ''}" data-act="toggle" data-i="${i}">✓</button></div>`).join('')}
  <div class="row" style="margin-top:6px"><button class="ghost" data-act="addset">+ Sett</button><button class="ghost" data-act="rmset">− Sett</button><span class="grow"></span><span class="timer" id="rest"></span><button class="ghost" data-act="rest">Hvile 90s</button></div>
  <div class="nav"><button data-act="prev">← Forrige</button><button class="primary" data-act="next">${d.idx === d.entries.length - 1 ? 'Fullfør' : 'Neste →'}</button></div>
  <div class="row" style="margin-top:10px"><button class="ghost grow" data-act="skip">Hopp over øvelse</button></div>`;
}

function vWarmup(d, s) {
  return `<div class="row sp"><button class="ghost" data-act="quit">✕ Avslutt</button></div>
  <h1>${esc(s.name)}</h1><p>${esc(s.focus)}</p>
  ${s.warmup ? `<div class="card"><b>Oppvarming · ${esc(s.warmup.minutes)} min</b><p>${esc(s.warmup.note)}</p></div>` : ''}
  <div class="card"><b>Øvelser</b><ol>${s.exercises.map(e => `<li>${esc(e.name)} <span class="muted small">${e.sets}×${esc(e.reps)}</span></li>`).join('')}</ol></div>
  <div class="card"><b>Husk:</b> smerte maks 3/10 – ingen økt hevelse neste dag.</div>
  <button class="primary big" data-act="next">Start første øvelse →</button>`;
}

// Et sett teller som gjort hvis det er avhuket ELLER har reps > 0. Eksplisitt 0 og 0 = ikke gjort.
const isDone = (x) => { const w = num(x.weight), r = num(x.reps); if (w === 0 && r === 0) return false; return x.done || r > 0; };

function vFinish(d, s) {
  const done = d.entries.filter(e => !e.skipped && e.sets.some(isDone)).length;
  const mins = Math.round((Date.now() - d.startedAt) / 60000);
  return `<h1>Ferdig! 💪</h1><div class="card"><div>${done} av ${d.entries.length} øvelser logget</div><div class="muted">Tid: ${mins} min</div></div>
  ${done === 0 ? '<div class="hint" style="background:#3a2a10;color:#f0b34a">Ingen sett er registrert. Gå «Tilbake», fyll inn vekt og reps og trykk ✓ på hvert sett du gjorde.</div>' : ''}
  <label>Notat (valgfritt, f.eks. kneet)</label><textarea id="notes" rows="3">${esc(d.notes || '')}</textarea>
  <div class="nav"><button data-act="prev">← Tilbake</button><button class="primary" data-act="save">Lagre i logg</button></div>`;
}

function commitSession() {
  const d = S.get().draft; const s = S.findSession(d.sessionId);
  // Et sett teller som gjort hvis det er avhuket ELLER har reps > 0. Eksplisitt 0 og 0 = ikke gjort.
  const entries = d.entries.filter(e => !e.skipped && e.sets.some(isDone))
    .map(e => ({ exerciseId: e.exerciseId, name: e.name, type: e.type, sets: e.sets.map(x => ({ weight: num(x.weight), reps: num(x.reps), done: isDone(x) })) }));
  S.get().logs.push({ id: S.uid('l'), date: d.date, sessionId: d.sessionId, sessionName: s?.name, minutes: Math.round((Date.now() - d.startedAt) / 60000), notes: d.notes || '', entries });
  S.get().draft = null; S.save();
}

// ---------- Logg ----------
function vLog() {
  const logs = [...S.get().logs].sort((a, b) => b.date.localeCompare(a.date));
  return `<h1>Logg</h1>${logs.length ? logs.map(l => `<div class="card click" data-act="logdetail" data-id="${l.id}">
    <div class="row sp"><b>${esc(l.sessionName || 'Økt')}</b><span class="muted small">${fmtDate(l.date)}</span></div>
    <div class="muted small">${l.entries.length} øvelser${l.minutes ? ' · ' + l.minutes + ' min' : ''}</div></div>`).join('') : '<p class="muted">Ingen økter logget ennå.</p>'}`;
}
function vLogDetail() {
  const l = S.get().logs.find(x => x.id === view.id);
  if (!l) return vLog();
  return `<button class="ghost" data-act="back-log">← Logg</button><h1>${esc(l.sessionName)}</h1><p class="muted">${fmtDate(l.date)}</p>
  ${l.notes ? `<div class="card">${esc(l.notes)}</div>` : ''}
  ${l.entries.map(e => `<div class="card"><b>${esc(e.name)}</b><div class="muted">${e.sets.filter(x => x.done).map(x => e.type === 'weight' ? `${x.weight === '' ? '–' : x.weight} kg × ${x.reps || '–'}` : e.type === 'time' ? `${x.reps || x.weight || '✓'}` : `${x.reps || '✓'}${x.weight ? ' +' + x.weight + ' kg' : ''}`).join(' · ') || 'Ingen fullførte sett'}</div></div>`).join('')}
  <button class="danger big" data-act="dellog" data-id="${l.id}">Slett økt fra logg</button>`;
}

// ---------- Progresjon ----------
function seriesFor(exId) {
  const pts = [];
  for (const l of [...S.get().logs].sort((a, b) => a.date.localeCompare(b.date))) {
    const e = l.entries.find(e => e.exerciseId === exId);
    if (!e) continue;
    const dn = e.sets.filter(x => x.done);
    if (!dn.length) continue;
    const useW = e.type === 'weight';
    const val = Math.max(...dn.map(x => Number(useW ? x.weight : (x.reps || x.weight)) || 0));
    pts.push({ date: l.date, val, vol: dn.reduce((a, x) => a + (Number(x.weight) || 0) * (Number(x.reps) || 0), 0), text: dn.map(x => useW ? `${x.weight}×${x.reps}` : x.reps || x.weight).join(', ') });
  }
  return pts;
}
function allExercises() {
  const m = new Map();
  S.get().program.sessions.forEach(s => s.exercises.forEach(e => m.set(e.id, { id: e.id, name: e.name, type: e.type })));
  S.get().logs.forEach(l => l.entries.forEach(e => { if (!m.has(e.exerciseId)) m.set(e.exerciseId, { id: e.exerciseId, name: e.name + ' (fjernet)', type: e.type }); }));
  return [...m.values()];
}
function vProgress() {
  const exs = allExercises().filter(e => seriesFor(e.id).length);
  if (!exs.length) return '<h1>Progresjon</h1><p class="muted">Logg noen økter først, så vises utviklingen her.</p>';
  const id = view.exId && exs.find(e => e.id === view.exId) ? view.exId : exs[0].id;
  view.exId = id;
  const ex = exs.find(e => e.id === id); const pts = seriesFor(id);
  const unit = ex.type === 'weight' ? 'kg' : ex.type === 'time' ? 'min/nivå' : 'reps';
  const best = Math.max(...pts.map(p => p.val));
  return `<h1>Progresjon</h1>
  <select data-act="pickex">${exs.map(e => `<option value="${e.id}" ${e.id === id ? 'selected' : ''}>${esc(e.name)}</option>`).join('')}</select>
  <div class="stats"><div class="stat"><b>${best} ${unit}</b><span>Rekord</span></div><div class="stat"><b>${pts.at(-1).val} ${unit}</b><span>Siste</span></div></div>
  <div class="card"><svg id="chart" class="chart" viewBox="0 0 400 220"></svg></div>
  <div class="card"><table><tr><th>Dato</th><th>Topp</th><th>Sett</th></tr>${[...pts].reverse().map(p => `<tr><td>${new Date(p.date + 'T12:00').toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' })}</td><td>${p.val}</td><td class="muted">${esc(p.text)}</td></tr>`).join('')}</table></div>`;
}
function drawChart() {
  const svg = document.getElementById('chart'); if (!svg) return;
  const pts = seriesFor(view.exId); const W = 400, H = 220, P = 34;
  const max = Math.max(...pts.map(p => p.val)) * 1.1 || 1, min = 0;
  const x = (i) => pts.length === 1 ? W / 2 : P + (i * (W - P * 2)) / (pts.length - 1);
  const y = (v) => H - P - ((v - min) / (max - min)) * (H - P * 2);
  const acc = getComputedStyle(document.body).getPropertyValue('--accent'), mut = getComputedStyle(document.body).getPropertyValue('--muted');
  let g = '';
  for (let i = 0; i <= 4; i++) { const v = (max / 4) * i; g += `<line x1="${P}" x2="${W - 10}" y1="${y(v)}" y2="${y(v)}" stroke="${mut}" opacity=".25"/><text x="${P - 6}" y="${y(v) + 4}" fill="${mut}" font-size="11" text-anchor="end">${Math.round(v * 10) / 10}</text>`; }
  g += `<polyline fill="none" stroke="${acc}" stroke-width="3" points="${pts.map((p, i) => `${x(i)},${y(p.val)}`).join(' ')}"/>`;
  g += pts.map((p, i) => `<circle cx="${x(i)}" cy="${y(p.val)}" r="5" fill="${acc}"/>`).join('');
  g += `<text x="${P}" y="${H - 8}" fill="${mut}" font-size="11">${pts[0].date.slice(5)}</text><text x="${W - 10}" y="${H - 8}" fill="${mut}" font-size="11" text-anchor="end">${pts.at(-1).date.slice(5)}</text>`;
  svg.innerHTML = g;
}

// ---------- Program ----------
function vProgram() {
  return `<h1>Program</h1>${S.get().program.sessions.map((s, i) => `<div class="card">
    <div class="row sp"><div class="grow click" data-act="editsession" data-id="${s.id}"><b>${esc(s.name)}</b> <span class="muted">${esc(s.focus)}</span><div class="muted small">${s.exercises.length} øvelser</div></div>
    <button class="ghost" data-act="sessup" data-i="${i}">↑</button><button class="ghost" data-act="sessdown" data-i="${i}">↓</button><button data-act="editsession" data-id="${s.id}">Rediger</button></div></div>`).join('')}
  <button class="big" data-act="newsession">+ Ny økt</button>`;
}
function vEditSession() {
  const s = S.findSession(view.id); if (!s) return vProgram();
  return `<button class="ghost" data-act="back-prog">← Program</button><h1>Rediger økt</h1>
  <label>Navn</label><input data-sf="name" value="${esc(s.name)}">
  <label>Fokus</label><input data-sf="focus" value="${esc(s.focus)}">
  <div class="row"><div class="grow"><label>Minutter</label><input data-sf="minutes" inputmode="numeric" value="${esc(s.minutes)}"></div>
  <div class="grow"><label>Prioritet</label><select data-sf="priority">${['Må', 'Bør', 'Valgfri'].map(p => `<option ${p === s.priority ? 'selected' : ''}>${p}</option>`).join('')}</select></div></div>
  <label>Oppvarming (notat)</label><textarea data-sf="warmup" rows="2">${esc(s.warmup?.note || '')}</textarea>
  <h2>Øvelser</h2>
  ${s.exercises.map((e, i) => `<div class="card">
    <input data-ef="name" data-i="${i}" value="${esc(e.name)}" style="font-weight:700">
    <div class="row" style="margin-top:8px"><div class="grow"><label>Sett</label><input data-ef="sets" data-i="${i}" inputmode="numeric" value="${esc(e.sets)}"></div>
    <div class="grow"><label>Reps</label><input data-ef="reps" data-i="${i}" value="${esc(e.reps)}"></div>
    <div class="grow"><label>Type</label><select data-ef="type" data-i="${i}">${[['weight', 'Vekt'], ['bodyweight', 'Kroppsvekt'], ['time', 'Tid']].map(([v, n]) => `<option value="${v}" ${v === e.type ? 'selected' : ''}>${n}</option>`).join('')}</select></div></div>
    <label>Merknad</label><input data-ef="note" data-i="${i}" value="${esc(e.note)}">
    <label class="row"><input type="checkbox" data-ef="perSide" data-i="${i}" style="width:auto" ${e.perSide ? 'checked' : ''}> per side</label>
    <div class="row" style="margin-top:8px"><button data-act="exup" data-i="${i}">↑</button><button data-act="exdown" data-i="${i}">↓</button><span class="grow"></span><button class="danger" data-act="exdel" data-i="${i}">Slett</button></div></div>`).join('')}
  <button class="big" data-act="exadd">+ Ny øvelse</button>
  <button class="danger big" style="margin-top:20px" data-act="sessdel">Slett hele økta</button>`;
}

// ---------- Info ----------
function vInfo() {
  return `<h1>Info</h1>
  <div class="card"><b>Tommelfingerregler for kneet</b><ul>${TIPS.knee.map(t => `<li>${esc(t)}</li>`).join('')}</ul></div>
  <div class="card"><b>Progresjon og variasjon</b><ul>${TIPS.progression.map(([a, b]) => `<li><b>${esc(a)}:</b> ${esc(b)}</li>`).join('')}</ul></div>
  <h2>Backup</h2><div class="row"><button class="grow" data-act="export">Eksporter JSON</button><button class="grow" data-act="import">Importer JSON</button></div>
  <input type="file" id="file" accept="application/json" hidden>
  <button class="danger big" style="margin-top:20px" data-act="reset">Nullstill alt</button>`;
}

// ---------- Hendelser ----------
function startRest() {
  clearInterval(timer); let t = 90;
  const tick = () => { const el = document.getElementById('rest'); if (!el) { clearInterval(timer); return; } el.textContent = t > 0 ? `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}` : 'Klar!'; if (t-- < 0) { clearInterval(timer); if (navigator.vibrate) navigator.vibrate(200); } };
  tick(); timer = setInterval(tick, 1000);
}

$tabs.addEventListener('click', e => { const b = e.target.closest('button'); if (b) go({ name: b.dataset.tab }); });

$app.addEventListener('click', async (e) => {
  const el = e.target.closest('[data-act]'); if (!el) return;
  if (el.tagName === 'SELECT') return;
  const a = el.dataset.act, st = S.get(), d = st.draft, i = Number(el.dataset.i);
  const sess = view.id && S.findSession(view.id);
  switch (a) {
    case 'start': if (d && !confirm('Du har en pågående økt. Forkaste den og starte ny?')) return; startSession(el.dataset.id); break;
    case 'resume': go({ name: 'play' }); break;
    case 'discard': if (confirm('Forkaste pågående økt?')) { st.draft = null; S.save(); go({ name: 'home' }); } break;
    case 'quit': if (confirm('Avslutte økta? Du kan fortsette senere fra Økter-fanen.')) go({ name: 'home' }); break;
    case 'toggle': { const x = d.entries[d.idx].sets[i]; x.done = !x.done; S.save(); const sc = scrollY; render(); scrollTo(0, sc); if (x.done) startRest(); break; }
    case 'addset': { const e2 = d.entries[d.idx]; e2.sets.push({ ...e2.sets.at(-1), done: false }); S.save(); render(); break; }
    case 'rmset': { const e2 = d.entries[d.idx]; if (e2.sets.length > 1) e2.sets.pop(); S.save(); render(); break; }
    case 'rest': startRest(); break;
    case 'next': d.idx++; if (d.entries[d.idx]) d.entries[d.idx].skipped = false; S.save(); go({ name: 'play' }); break;
    case 'prev': d.idx = Math.max(-1, d.idx - 1); S.save(); go({ name: 'play' }); break;
    case 'skip': d.entries[d.idx].skipped = true; d.idx++; S.save(); go({ name: 'play' }); break;
    case 'save': d.notes = document.getElementById('notes')?.value || ''; commitSession(); go({ name: 'log' }); break;
    case 'logdetail': go({ name: 'logDetail', id: el.dataset.id }); break;
    case 'back-log': go({ name: 'log' }); break;
    case 'dellog': if (confirm('Slette denne økta fra loggen?')) { st.logs = st.logs.filter(l => l.id !== el.dataset.id); S.save(); go({ name: 'log' }); } break;
    case 'editsession': go({ name: 'editSession', id: el.dataset.id }); break;
    case 'back-prog': go({ name: 'program' }); break;
    case 'newsession': { const n = { id: S.uid('s'), name: 'Ny økt', focus: '', minutes: 45, priority: 'Bør', warmup: null, exercises: [] }; st.program.sessions.push(n); S.save(); go({ name: 'editSession', id: n.id }); break; }
    case 'sessup': case 'sessdown': { const arr = st.program.sessions, j = a === 'sessup' ? i - 1 : i + 1; if (arr[j]) { [arr[i], arr[j]] = [arr[j], arr[i]]; S.save(); render(); } break; }
    case 'sessdel': if (confirm('Slette hele økta? Logg beholdes.')) { st.program.sessions = st.program.sessions.filter(s => s.id !== view.id); S.save(); go({ name: 'program' }); } break;
    case 'exadd': sess.exercises.push({ id: S.uid('e'), name: 'Ny øvelse', sets: 3, reps: '10', note: '', type: 'weight', perSide: false }); S.save(); render(); break;
    case 'exdel': if (confirm('Slette øvelsen? Historikk beholdes i loggen.')) { sess.exercises.splice(i, 1); S.save(); render(); } break;
    case 'exup': case 'exdown': { const arr = sess.exercises, j = a === 'exup' ? i - 1 : i + 1; if (arr[j]) { [arr[i], arr[j]] = [arr[j], arr[i]]; S.save(); render(); } break; }
    case 'export': { const blob = new Blob([S.exportJson()], { type: 'application/json' }); const aEl = document.createElement('a'); aEl.href = URL.createObjectURL(blob); aEl.download = `treningslogg-${today()}.json`; aEl.click(); break; }
    case 'import': document.getElementById('file').click(); break;
    case 'reset': if (confirm('Slette ALT (logg og program)? Kan ikke angres.')) { S.reset(); go({ name: 'home' }); } break;
  }
});

// Inndata (uten full re-render så tastaturet blir)
$app.addEventListener('input', (e) => {
  const t = e.target, st = S.get();
  if (t.dataset.set !== undefined) { const x = st.draft.entries[st.draft.idx].sets[Number(t.dataset.set)]; x[t.dataset.f] = t.value; S.save(); }
  else if (t.dataset.sf) { const s = S.findSession(view.id); if (t.dataset.sf === 'warmup') s.warmup = t.value ? { minutes: s.warmup?.minutes || '5', note: t.value } : null; else s[t.dataset.sf] = t.dataset.sf === 'minutes' ? num(t.value) || 0 : t.value; S.save(); }
  else if (t.dataset.ef) { const ex = S.findSession(view.id).exercises[Number(t.dataset.i)]; const f = t.dataset.ef; ex[f] = f === 'perSide' ? t.checked : f === 'sets' ? Math.max(1, parseInt(t.value) || 1) : t.value; S.save(); }
});
$app.addEventListener('change', (e) => {
  const t = e.target;
  if (t.dataset.act === 'pickex') { view.exId = t.value; render(); }
  if (t.id === 'file') {
    const f = t.files[0]; if (!f) return;
    f.text().then(txt => { try { S.importJson(txt); alert('Importert!'); go({ name: 'home' }); } catch (err) { alert('Kunne ikke importere: ' + err.message); } });
  }
});

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
render();
