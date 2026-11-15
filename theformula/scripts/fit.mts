import { writeFileSync, readFileSync } from "fs";
import { Chess } from "chess.js";

const corpus = JSON.parse(readFileSync("scripts/corpus.json", "utf8")) as { fen: string; phase: string }[];
const targets = JSON.parse(readFileSync("scripts/targets.json", "utf8")) as Record<string, number>;

const PIECES = ["P", "N", "B", "R", "Q", "K"] as const;
const BASE_CP: Record<string, number> = { P: 100, N: 320, B: 330, R: 500, Q: 950, K: 0 };
const COLS = PIECES.length * 64 + 1; // + tempo
const TEMPO = PIECES.length * 64;
const fidx = (p: string, sq: number) => PIECES.indexOf(p as never) * 64 + sq;
const mirror = (sq: number) => ((7 - (sq >> 3)) << 3) + (sq & 7);

function row(fen: string): Float64Array | null {
  const x = new Float64Array(COLS);
  const parts = fen.split(/\s+/);
  const rows = parts[0].split("/");
  for (let r8 = 0; r8 < 8; r8++) {
    let f = 0;
    for (const ch of rows[r8]) {
      if (ch >= "1" && ch <= "8") { f += +ch; continue; }
      const sq = (7 - r8) * 8 + f;
      const color = ch === ch.toUpperCase() ? "w" : "b";
      const t = ch.toUpperCase();
      const msq = color === "w" ? sq : mirror(sq);
      x[fidx(t, msq)] += color === "w" ? 1 : -1;
      f++;
    }
  }
  x[TEMPO] = parts[1] === "w" ? 1 : -1;
  return x;
}

function solve(A: number[][], b: number[]): number[] | null {
  const n = b.length;
  const M = A.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    if (Math.abs(M[p][c]) < 1e-9) return null;
    [M[c], M[p]] = [M[p], M[c]];
    const inv = 1 / M[c][c];
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = M[r][c] * inv;
      if (!f) continue;
      for (let cc = c; cc <= n; cc++) M[r][cc] -= f * M[c][cc];
    }
    for (let cc = c; cc <= n; cc++) M[c][cc] *= inv;
  }
  return M.map((r) => r[n]);
}

const PHASES = ["opening", "middlegame", "endgame"] as const;
const sqName = (i: number) => "abcdefgh"[i & 7] + ((i >> 3) + 1);

const out: any = {
  classic_base: { P: 1.0, N: 3.2, B: 3.3, R: 5.0, Q: 9.5, K: 0.0 },
  phases: {} as any,
};

for (const phase of PHASES) {
  const rows: { x: Float64Array; y: number }[] = [];
  for (const p of corpus) {
    if (p.phase !== phase) continue;
    const y = targets[p.fen];
    if (y === undefined || Math.abs(y) >= 1000) continue;
    const x = row(p.fen); if (x) rows.push({ x, y });
  }
  const n = rows.length;
  // ridge toward classic base * 100
  const lam = 30;
  const A: number[][] = Array.from({ length: COLS }, () => new Array(COLS).fill(0));
  const b: number[] = new Array(COLS).fill(0);
  const samples = new Array(COLS).fill(0);
  for (const { x, y } of rows) {
    for (let i = 0; i < COLS; i++) {
      const xi = x[i];
      if (!xi) continue;
      samples[i] += Math.abs(xi);
      b[i] += xi * y;
      for (let j = i; j < COLS; j++) { const xj = x[j]; if (xj) A[i][j] += xi * xj; }
    }
  }
  for (let i = 0; i < COLS; i++) for (let j = 0; j < i; j++) A[i][j] = A[j][i];
  for (let i = 0; i < PIECES.length * 64; i++) { A[i][i] += lam; b[i] += lam * (BASE_CP[PIECES[(i / 64) | 0]] ); }
  A[TEMPO][TEMPO] += lam + 1; // tempo prior ≈ 0-ish, mild shrink
  const w = solve(A, b);
  if (!w) { console.error(phase, "solve failed"); continue; }
  // metrics
  let sse = 0, sae = 0, sst = 0, ybar = rows.reduce((a, r) => a + r.y, 0) / n;
  for (const { x, y } of rows) {
    let p = 0;
    for (let i = 0; i < COLS; i++) if (x[i]) p += x[i] * w[i];
    sse += (p - y) ** 2; sae += Math.abs(p - y); sst += (y - ybar) ** 2;
  }
  const r2 = 1 - sse / sst, mae = sae / n / 100;
  // to JSON
  const pieces: any = {};
  for (const pt of PIECES) {
    const squares: Record<string, number | null> = {};
    for (let i = 0; i < 64; i++) {
      const col = fidx(pt, i);
      squares[sqName(i)] = samples[col] < 4 ? null : Math.round(w[col]) / 100;
    }
    pieces[pt] = { base_pawns: (BASE_CP as any)[pt] / 100, squares };
  }
  const tempo = Math.max(0.05, Math.min(0.8, Math.round(w[TEMPO]) / 100));
  out.phases[phase] = { stats: { n, r2: Math.round(r2 * 1000) / 1000, mae_pawns: Math.round(mae * 10000) / 10000 }, tempo_pawns: tempo, pieces };
  console.log(phase, "n", n, "r2", r2.toFixed(3), "mae(pawns)", mae.toFixed(4), "tempo", tempo);
}

// drills: 20 (name, fen, truth SF pawns), spread phases and magnitude
const drills: any[] = [];
const buckets: Record<string, { fen: string; y: number }[]> = { opening: [], middlegame: [], endgame: [] };
for (const p of corpus) {
  const y = targets[p.fen]; if (y === undefined || Math.abs(y) >= 900) continue;
  buckets[p.phase].push({ fen: p.fen, y });
}
const want: Record<string, number> = { opening: 6, middlegame: 8, endgame: 6 };
for (const ph of PHASES) {
  const arr = buckets[ph].sort((a, b) => a.y - b.y);
  for (let k = 0; k < want[ph]; k++) {
    const i = Math.floor((k + 0.5) * arr.length / want[ph]);
    const it = arr[i];
    drills.push({ fen: it.fen, truth: Math.round(it.y) / 100 });
  }
}
let dseed = 7; const shuf = drills.map(d => [Math.sin(dseed++), d] as const).sort((a, b) => a[0] - b[0]).map(([, d]) => d, 0);
writeFileSync("public/data/positions.json", JSON.stringify({ positions: shuf.map((d, i) => ({ id: `dp${i + 1}`, name: `Study position ${i + 1}`, fen: d.fen, truth_pawns: d.truth })) }, null, 1));
writeFileSync("public/data/pst_v1.json", JSON.stringify(out, null, 1));
writeFileSync("src/data/pst_v1.json", JSON.stringify(out));
writeFileSync("src/data/positions.json", readFileSync("public/data/positions.json"));
console.log("drills", shuf.length, "pst bytes", JSON.stringify(out).length * 2);

// sanity: report example values
const mid = out.phases.middlegame.pieces;
console.log("W K-g1 mid:", mid.K.squares.g1, "| N-f3 mid:", mid.N.squares.f3, "| N-a1 mid:", mid.N.squares.a1, "| R-c7 end:", out.phases.endgame.pieces.R.squares.c7, "| P-a7 vs P-a2 end:", out.phases.endgame.pieces.P.squares.a7, out.phases.endgame.pieces.P.squares.a2);
