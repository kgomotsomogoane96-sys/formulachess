// App-wide study state: streaks, daily goal, badges, leaderboard, drill log.
import type { Phase } from "./core";

const KEY = "formula.app.v1";
const LEGACY = "formula.drill";
export const GOAL_DEFAULT = 10;

export interface LogEntry {
  t: number; err: number; errTruth: number; guess: number; truth: number; phase: Phase; dead: boolean; verdict?: boolean;
}
export interface AppState {
  name: string;
  streak: number; lastDay: string;
  day: { date: string; drills: number; dead: number; atlasKeys: string[]; claimed: string[] };
  goal: number;
  lessonsDone: string[];
  drill: { n: number; score: number; streak: number; best: number; maeSum: number; dead: number; log: LogEntry[] };
  badges: Record<string, number>;
  atlasSeen: Record<string, number>;
  startedAt: number;
}

export const dayKey = (offset = 0) => { const d = new Date(); d.setDate(d.getDate() - offset); return d.toISOString().slice(0, 10); };

const defaultState = (): AppState => ({
  name: "Studious", streak: 0, lastDay: "",
  day: { date: dayKey(), drills: 0, dead: 0, atlasKeys: [], claimed: [] },
  goal: GOAL_DEFAULT, lessonsDone: [],
  drill: { n: 0, score: 0, streak: 0, best: 0, maeSum: 0, dead: 0, log: [] },
  badges: {}, atlasSeen: {}, startedAt: Date.now(),
});

function load(): AppState {
  let s = defaultState();
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) s = { ...s, ...JSON.parse(raw) };
  } catch { /* fresh */ }
  // one-time migration from the old drill-only store
  try {
    const old = JSON.parse(localStorage.getItem(LEGACY) ?? "{}");
    if (old && old.n) {
      s.drill.score += old.score ?? 0; s.drill.n += old.n ?? 0;
      s.drill.best = Math.max(s.drill.best, old.best ?? 0); s.drill.maeSum += old.maeSum ?? 0;
      localStorage.removeItem(LEGACY);
    }
  } catch { /* ignore */ }
  return s;
}

let state: AppState = load();
const subs = new Set<() => void>();
export const getState = () => state;
export function onChange(cb: () => void) { subs.add(cb); return () => { subs.delete(cb); }; }
function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* quota */ } subs.forEach((f) => f()); }

export function resetDayIfNeeded() {
  if (state.day.date !== dayKey()) { state.day = { date: dayKey(), drills: 0, dead: 0, atlasKeys: [], claimed: [] }; save(); }
}

export interface DrillResult { milestone: boolean; goalHit: boolean; badges: string[] }
export function addDrill(e: { err: number; errTruth: number; guess: number; truth: number; phase: Phase; dead: boolean; verdict?: boolean }): DrillResult {
  resetDayIfNeeded();
  const d = state.drill;
  d.n++;
  if (!e.verdict) d.maeSum += e.err;
  if (e.dead) d.dead++;
  const inBand = e.verdict ? e.dead : e.err <= 0.7;
  if (inBand) d.streak++; else d.streak = 0;
  d.best = Math.max(d.best, d.streak);
  d.score += e.verdict ? (e.dead ? 2 : 0) : e.err <= 0.3 ? 2 : e.err <= 0.7 ? 1 : 0;
  d.log.push({ t: Date.now(), err: e.err, errTruth: e.errTruth, guess: e.guess, truth: e.truth, phase: e.phase, dead: e.dead, verdict: e.verdict });
  if (d.log.length > 600) d.log = d.log.slice(-600);
  state.day.drills++;
  if (e.dead) state.day.dead++;
  if (state.lastDay !== dayKey()) { state.streak = state.lastDay === dayKey(1) ? state.streak + 1 : 1; state.lastDay = dayKey(); }
  save();
  const badges = checkBadges();
  return { milestone: d.streak > 0 && d.streak % 5 === 0, goalHit: state.day.drills === state.goal, badges };
}

// ---------- badges & dailies ----------
export interface BadgeDef { id: string; name: string; desc: string; test: (s: AppState) => boolean }
export const BADGES: BadgeDef[] = [
  { id: "first", name: "First Receipt", desc: "Reveal your first position", test: (s) => s.drill.n >= 1 },
  { id: "streak5", name: "On Fire", desc: "A five-drill streak", test: (s) => s.drill.best >= 5 },
  { id: "dead10", name: "Sharp Eye", desc: "Ten dead-on calls (≤ 0.3)", test: (s) => s.drill.dead >= 10 },
  { id: "score25", name: "Measurer", desc: "Earn 25 study score", test: (s) => s.drill.score >= 25 },
  { id: "book13", name: "The Whole Book", desc: "Finish all 13 lessons", test: (s) => s.lessonsDone.length >= 13 },
  { id: "atlas9", name: "Cartographer", desc: "Read 9 of the 18 charts", test: (s) => Object.keys(s.atlasSeen).length >= 9 },
  { id: "phase3", name: "Three Maps", desc: "Drill all three phases", test: (s) => new Set(s.drill.log.map((l) => l.phase)).size >= 3 },
  { id: "habit", name: "Daily Habit", desc: "Hit the daily goal", test: (s) => s.day.drills >= s.goal },
];
export function checkBadges(): string[] {
  const fresh: string[] = [];
  for (const b of BADGES) if (!state.badges[b.id] && b.test(state)) { state.badges[b.id] = Date.now(); fresh.push(b.id); }
  if (fresh.length) save();
  return fresh;
}

export interface DailyDef { id: string; pts: number; name: string; test: (s: AppState) => boolean; progress: (s: AppState) => [number, number] }
export const DAILIES: DailyDef[] = [
  { id: "d3", pts: 2, name: "Three drills today", test: (s) => s.day.drills >= 3, progress: (s) => [Math.min(3, s.day.drills), 3] },
  { id: "ddead", pts: 2, name: "One dead-on call today", test: (s) => s.day.dead >= 1, progress: (s) => [Math.min(1, s.day.dead), 1] },
  { id: "datlas", pts: 2, name: "Read 3 atlas charts today", test: (s) => s.day.atlasKeys.length >= 3, progress: (s) => [Math.min(3, s.day.atlasKeys.length), 3] },
];
export function claimDaily(id: string): boolean {
  resetDayIfNeeded();
  if (state.day.claimed.includes(id)) return false;
  const d = DAILIES.find((x) => x.id === id);
  if (!d || !d.test(state)) return false;
  state.day.claimed.push(id);
  state.drill.score += d.pts;
  save();
  return true;
}

export function markLesson(k: string): boolean {
  if (state.lessonsDone.includes(k)) return false;
  state.lessonsDone.push(k); save(); checkBadges();
  return true;
}
export function markAtlas(key: string) {
  state.atlasSeen[key] = Date.now();
  resetDayIfNeeded();
  if (!state.day.atlasKeys.includes(key)) state.day.atlasKeys.push(key);
  save(); checkBadges();
}

// ---------- leaderboard (study hall) ----------
export function leaderboard(): { name: string; score: number; you: boolean }[] {
  const rivals: [string, number][] = [["Sophie", 58], ["Daniel", 44], ["Maya", 37], ["Liam", 26], ["Priya", 17], ["Otto", 8]];
  const doy = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  const rows = rivals.map(([name, base], i) => ({ name, score: base + Math.floor((doy / 24) * (1 + i * 0.35)), you: false }));
  rows.push({ name: state.name, score: state.drill.score, you: true });
  return rows.sort((a, b) => b.score - a.score);
}

export function greeting(): string {
  const h = new Date().getHours();
  return h < 5 ? "Good night" : h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}
