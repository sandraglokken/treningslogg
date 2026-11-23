import { SEED_PROGRAM } from './seed.js';

const KEY = 'treningslogg-v1';
let state = null;

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) { state = JSON.parse(raw); return state; }
  } catch (e) { /* ignorer */ }
  state = { program: structuredClone(SEED_PROGRAM), logs: [], draft: null };
  save();
  return state;
}

export function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* ignorer */ }
}

export const get = () => state;
export const uid = (p = 'x') => p + Math.random().toString(36).slice(2, 9);

export function findSession(id) { return state.program.sessions.find(s => s.id === id); }

// Siste logg-oppføring for en øvelse (nyeste først)
export function lastEntry(exerciseId, beforeDate) {
  const logs = [...state.logs].sort((a, b) => b.date.localeCompare(a.date));
  for (const l of logs) {
    if (beforeDate && l.date >= beforeDate) continue;
    const e = l.entries.find(e => e.exerciseId === exerciseId);
    if (e && e.sets.some(s => s.done)) return { date: l.date, entry: e };
  }
  return null;
}

export const topWeight = (entry) =>
  Math.max(0, ...entry.sets.filter(s => s.done).map(s => Number(s.weight) || 0));

export function warmupWeight(w) {
  if (!w) return 0;
  return Math.max(0, Math.round((w * 0.5) / 2.5) * 2.5);
}

export function exportJson() { return JSON.stringify(state, null, 2); }
export function importJson(text) {
  const d = JSON.parse(text);
  if (!d.program || !Array.isArray(d.logs)) throw new Error('Ugyldig fil');
  state = d; save();
}
export function reset() { localStorage.removeItem(KEY); load(); }
