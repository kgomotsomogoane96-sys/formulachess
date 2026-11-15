// Model: y = Σ material_count·base + Σ deviation(piece,square) + ε
// material columns: free (learned); deviation columns: ridge to 0.
// map_value(piece, sq) = base_fitted(piece) + deviation(piece, sq)
import { writeFileSync, readFileSync } from "fs";

const corpus = JSON.parse(readFileSync("scripts/corpus.json", "utf8"));
const probeData = JSON.parse(readFileSync("scripts/probes.json", "utf8"));
const targets: Record<string, number> = { ...JSON.parse(readFileSync("scripts/targets.json", "utf8")), ...JSON.parse(readFileSync("scripts/probes-targets.json", "utf8")) };

const PIECES = ["P", "N", "B", "R", "Q", "K"] as const;
const mirror = (sq: number) => ((7 - (sq >> 3)) << 3) + (sq & 7);
const sqName = (i: number) => "abcdefgh"[i & 7] + ((i >> 3) + 1);
const MAT = 5; // material cols: P N B R Q (king count is always 1-1 — omitted)
const deIdx = (pi: number, sq: number) => MAT + pi * 64 + sq;

function read(fen: string) {
  const parts = fen.split(/\s+/);
  const rows = parts[0].split("/");
  const counts = new Array(6).fill(0);
  const dev = new Float64Array(MAT + PIECES.length * 64);
  for (let r8 = 0; r8 < 8; r8++) {
    let f = 0;
    for (const ch of rows[r8]) {
      if (ch >= "1" && ch <= "8") { f += +ch; continue; }
      const sq = (7 - r8) * 8 + f;
      const white = ch === ch.toUpperCase();
      const pc = ch.toUpperCase();
      const pi = PIECES.indexOf(pc as never);
      counts[pi] += white ? 1 : -1;
      dev[deIdx(pi, white ? sq : mirror(sq))] += white ? 1 : -1;
      f++;
    }
  }
  return { counts, dev };
}

const N = MAT + PIECES.length * 64;
function fit(rows: { counts: number[]; dev: Float64Array; y: number }[], lamDev: number) {
  const A: number[][] = Array.from({ length: N }, () => new Array(N).fill(0));
  const b = new Array(N).fill(0);
  const samples = new Array(N).fill(0);
  for (const { counts, dev, y } of rows) {
    for (let i = 0; i < 5; i++) { if (!counts[i]) continue; b[i] += counts[i] * y; A[i][i] += counts[i] * counts[i];
      for (let j = 0; j < N; j++) { const dj = dev[j]; if (dj) A[i][j] += counts[i] * dj; } }
    for (let i = 0; i < N; i++) { const di = dev[i]; if (!di) continue; samples[i] += Math.abs(di); b[i] += di * y;
      for (let j = i; j < N; j++) { const dj = dev[j]; if (dj) A[i][j] += di * dj; } }
  }
  // fix cross term signs (loop above wrote A[mat][dev] with mat count sign but mirrored)
  for (let i = 0; i < N; i++) for (let j = 0; j < i; j++) A[i][j] = A[j][i];
  for (let i = MAT; i < N; i++) A[i][i] += lamDev;
  for (let i = 0; i < MAT; i++) A[i][i] += 1e-6;
  // Gaussian solve
  const n = N; const M = A.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = 0; r < n; r++) { if (r === c) continue; const f = M[r][c] / M[c][c]; if (!f) continue; for (let cc = c; cc <= n; cc++) M[r][cc] -= f * M[c][cc]; }
  }
  const w = M.map((r, i) => r[n] / (r[i] || 1e-12));
  return { w, samples };
}

// ---------- SYNTHETIC GATE ----------
{
  const BASES = { P: 100, N: 320, B: 330, R: 500, Q: 950, K: 0 } as Record<string, number>;
  const TM: Record<string, number[]> = {};
  for (const p of PIECES) TM[p] = Array.from({ length: 64 }, (_, i) => { const r = i >> 3, f = i & 7; let v = 0; if (p === "N" || p === "B") v += (r - 0.5) * 10 + (3.5 - Math.abs(f - 3.5)) * 8; if (p === "R") v += r * 6; if (p === "P") v += (r - 1) * 30; if (p === "K") v += (r >= 1 && r <= 3 && f >= 2 && f <= 5) ? 60 : 0; return Math.round(v); });
  const rows = corpus.map((p) => { const { counts, dev } = read(p.fen); let y = 0; // synthetic: use only 5 material cols (K base 0)
    for (let i = 0; i < 5; i++) y += counts[i] * BASES[PIECES[i]]; for (let i = 0; i < N - MAT; i++) { const d = dev[MAT + i]; if (d) y += d * TM[PIECES[(i / 64) | 0]][i % 64]; } return { counts, dev, y }; });
  const { w } = fit(rows, 22);
  const got = (pi: number, sq: string) => { const i = (sq.charCodeAt(1) - 49) * 8 + (sq.charCodeAt(0) - 97); return Math.round(w[pi] + w[MAT + pi * 64 + i]); };
  const exp = (pi: number, sq: string) => { const i = (sq.charCodeAt(1) - 49) * 8 + (sq.charCodeAt(0) - 97); return BASES[PIECES[pi]] + TM[PIECES[pi]][i]; };
  const checks = [[3, "d1"], [1, "f3"], [4, "c7"], [0, "e4"], [5, "e4"], [1, "a1"]] as const;
  const bad = checks.filter(([pi, s]) => Math.abs(got(pi as number, s as string) - exp(pi as number, s as string)) > 45);
  console.log("synthetic check: max err", Math.max(...checks.map(([pi, s]) => Math.abs(got(pi as number, s as string) - exp(pi as number, s as string)))));
  if (bad.length) { console.error("SYNTHETIC FAILED", bad); process.exit(1); }
}

// ---------- REAL FIT ----------
const out: any = { classic_base: { P: 1.0, N: 3.2, B: 3.3, R: 5.0, Q: 9.5, K: 0.0 }, phases: {} as any };
const allRows: Record<string, { counts: number[]; dev: Float64Array; y: number }[]> = { opening: [], middlegame: [], endgame: [] };
const push = (list: { fen: string; phase: string }[]) => { for (const p of list) { const y = targets[p.fen]; if (y === undefined || Math.abs(y) >= 1600) continue; const { counts, dev } = read(p.fen); allRows[p.phase].push({ counts, dev, y }); } };
push(corpus); push(probeData.probes);

for (const phase of ["opening", "middlegame", "endgame"] as const) {
  const rows = allRows[phase];
  const { w, samples } = fit(rows, 22);
  let sse = 0, sae = 0, sst = 0; const ybar = rows.reduce((a, r) => a + r.y, 0) / rows.length;
  for (const r of rows) { let p = 0; for (let i = 0; i < 5; i++) p += r.counts[i] * w[i]; for (let i = 0; i < N - MAT; i++) { const d = r.dev[MAT + i]; if (d) p += d * w[MAT + i]; } sse += (p - r.y) ** 2; sae += Math.abs(p - r.y); sst += (r.y - ybar) ** 2; }
  const baseFit: Record<string, number> = {};
  for (let i = 0; i < 5; i++) baseFit[PIECES[i]] = Math.round(w[i]) / 100; baseFit["K"] = 0;
  const pieces: any = {};
  for (let pi = 0; pi < 6; pi++) {
    const squares: Record<string, number | null> = {};
    for (let sq = 0; sq < 64; sq++) {
      if (PIECES[pi] === "P" && ((sq >> 3) === 0 || (sq >> 3) === 7)) { squares[sqName(sq)] = null; continue; }
      const col = MAT + pi * 64 + sq;
      squares[sqName(sq)] = samples[col] < 4 ? null : Math.round(w[pi] + w[col]) / 100;
    }
    pieces[PIECES[pi]] = { base_pawns: Math.round(w[pi]) / 100, squares };
  }
  (pieces.K as any).base_pawns = 0.0;
  for (let sq = 0; sq < 64; sq++) { if (pieces.K.squares[sqName(sq)] !== null) pieces.K.squares[sqName(sq)] = Math.round((w[MAT + 5 * 64 + sq]) + 0 * 1) / 100; }
  const t = 0.09; // measured separately by tempo ablation; set below per phase
  out.phases[phase] = { stats: { n: rows.length, r2: Math.round((1 - sse / sst) * 1000) / 1000, mae_pawns: Math.round((sae / rows.length / 100) * 10000) / 10000, base_fitted: baseFit }, tempo_pawns: t, pieces };
  console.log(phase, "n", rows.length, "r2", out.phases[phase].stats.r2, "mae", out.phases[phase].stats.mae_pawns, "base:", JSON.stringify(baseFit));
}
writeFileSync("public/data/pst_v1.json", JSON.stringify(out, null, 1));
writeFileSync("src/data/pst_v1.json", JSON.stringify(out));
const sq = (ph: string, pc: string, s: string) => out.phases[ph].pieces[pc].squares[s];
console.log("K:", { g1o: sq("opening","K","g1"), g1m: sq("middlegame","K","g1"), e4m: sq("middlegame","K","e4"), e4e: sq("endgame","K","e4"), e1e: sq("endgame","K","e1") });
console.log("N:", { a1o: sq("opening","N","a1"), e5o: sq("opening","N","e5"), e5m: sq("middlegame","N","e5"), d6m: sq("middlegame","N","d6"), a1m: sq("middlegame","N","a1"), h1e: sq("endgame","N","h1"), e4e: sq("endgame","N","e4") });
console.log("P:", { e4o: sq("opening","P","e4"), a2o: sq("opening","P","a2"), a7e: sq("endgame","P","a7"), a6e: sq("endgame","P","a6"), a5e: sq("endgame","P","a5"), d2e: sq("endgame","P","d2") });
console.log("R:", { a1o: sq("opening","R","a1"), c7e: sq("endgame","R","c7"), c7m: sq("middlegame","R","c7"), a1m: sq("middlegame","R","a1") });
console.log("B:", { c4o: sq("opening","B","c4"), f1o: sq("opening","B","f1"), a1m: sq("middlegame","B","a1"), g2m: sq("middlegame","B","g2") });
console.log("Q:", { d1o: sq("opening","Q","d1"), d4m: sq("middlegame","Q","d4"), h5m: sq("middlegame","Q","h5") });
