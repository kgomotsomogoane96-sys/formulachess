import { writeFileSync, readFileSync } from "fs";

const corpus = JSON.parse(readFileSync("scripts/corpus.json", "utf8")) as { fen: string; phase: string }[];
const probeData = JSON.parse(readFileSync("scripts/probes.json", "utf8")) as { probes: { fen: string; phase: string }[]; tempoPairs: { a: string; b: string }[] };
const targets = { ...(JSON.parse(readFileSync("scripts/targets.json", "utf8")) as Record<string, number>), ...(JSON.parse(readFileSync("scripts/probes-targets.json", "utf8")) as Record<string, number>) };

const PIECES = ["P", "N", "B", "R", "Q", "K"] as const;
const BASE_CP: Record<string, number> = { P: 100, N: 320, B: 330, R: 500, Q: 950, K: 0 };
const COLS = PIECES.length * 64 + 1;
const TEMPO = PIECES.length * 64;
const fidx = (p: string, sq: number) => PIECES.indexOf(p as never) * 64 + sq;
const mirror = (sq: number) => ((7 - (sq >> 3)) << 3) + (sq & 7);
const sqName = (i: number) => "abcdefgh"[i & 7] + ((i >> 3) + 1);

function row(fen: string, withTempo: boolean): Float64Array {
  const x = new Float64Array(COLS);
  const parts = fen.split(/\s+/);
  const rows = parts[0].split("/");
  for (let r8 = 0; r8 < 8; r8++) { let f = 0; for (const ch of rows[r8]) { if (ch >= "1" && ch <= "8") { f += +ch; continue; } const sq = (7 - r8) * 8 + f; const color = ch === ch.toUpperCase() ? "w" : "b"; x[fidx(ch.toUpperCase(), color === "w" ? sq : mirror(sq))] += color === "w" ? 1 : -1; f++; } }
  if (withTempo) x[TEMPO] = parts[1] === "w" ? 1 : -1;
  return x;
}
function solve(A: number[][], b: number[]): number[] | null {
  const n = b.length; const M = A.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < n; c++) { let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    if (Math.abs(M[p][c]) < 1e-9) return null; [M[c], M[p]] = [M[p], M[c]];
    for (let r = 0; r < n; r++) { if (r === c) continue; const f = M[r][c] / M[c][c]; if (!f) continue; for (let cc = c; cc <= n; cc++) M[r][cc] -= f * M[c][cc]; } }
  return M.map((r, i) => r[n] / r[i]);
}

// ---- tempo: paired stm-flip ablation (ablation averaging on controlled pairs)
let tsum = 0, tn = 0;
const tempoByPhase: Record<string, { s: number; n: number }> = { opening: { s: 0, n: 0 }, middlegame: { s: 0, n: 0 }, endgame: { s: 0, n: 0 } };
for (const pr of probeData.tempoPairs) {
  const ya = targets[pr.a], yb = targets[pr.b];
  if (ya === undefined || yb === undefined || Math.abs(ya) >= 900 || Math.abs(yb) >= 900) continue;
  const stmW = pr.a.split(" ")[1] === "w";
  const d = stmW ? (ya - yb) / 2 : (yb - ya) / 2; // white-to-move advantage, cp
  const ph = corpus.find((c) => c.fen === pr.a)?.phase ?? probeData.probes.find((c) => c.fen === pr.a)?.phase;
  const phase = ph ?? (pr.a.split(" ")[0].match(/[qQrR]/) ? "middlegame" : "endgame");
  tempoByPhase[phase].s += d; tempoByPhase[phase].n++;
  tsum += d; tn++;
}
console.log("tempo (white to move):", (tsum / tn / 100).toFixed(3), "pawns  n=", tn);
for (const ph of ["opening", "middlegame", "endgame"]) console.log(" ", ph, (tempoByPhase[ph].s / tempoByPhase[ph].n / 100).toFixed(3), "n=", tempoByPhase[ph].n);

// ---- per-phase ridged fit WITHOUT tempo column (tempo fixed separately)
const out: any = { classic_base: { P: 1.0, N: 3.2, B: 3.3, R: 5.0, Q: 9.5, K: 0.0 }, phases: {} as any };
const allRows: Record<string, { x: Float64Array; y: number; probe: boolean }[]> = { opening: [], middlegame: [], endgame: [] };
const addRows = (list: { fen: string; phase: string }[], probe: boolean) => {
  for (const p of list) {
    const y = targets[p.fen]; if (y === undefined || Math.abs(y) >= 1000) continue;
    allRows[p.phase].push({ x: row(p.fen, false), y, probe });
  }
};
addRows(corpus, false); addRows(probeData.probes, true);

for (const phase of ["opening", "middlegame", "endgame"] as const) {
  const rows = allRows[phase];
  const n = rows.length;
  if (!n) continue;
  const lamCover = 22, lamPrior = 22;
  const NC = PIECES.length * 64;
  const A: number[][] = Array.from({ length: NC }, () => new Array(NC).fill(0));
  const b: number[] = new Array(NC).fill(0);
  const samples = new Array(NC).fill(0);
  for (const { x, y } of rows) {
    for (let i = 0; i < NC; i++) { const xi = x[i]; if (!xi) continue; samples[i] += Math.abs(xi); b[i] += xi * y;
      for (let j = i; j < NC; j++) { const xj = x[j]; if (xj) A[i][j] += xi * xj; } }
  }
  for (let i = 0; i < NC; i++) for (let j = 0; j < i; j++) A[i][j] = A[j][i];
  for (let i = 0; i < NC; i++) { const prior = BASE_CP[PIECES[(i / 64) | 0]]; A[i][i] += lamCover + lamPrior; b[i] += lamPrior * prior; }
  const w = solve(A, b); if (!w) { console.error(phase, "failed"); continue; }
  let sse = 0, sae = 0, sst = 0; const ybar = rows.reduce((a, r) => a + r.y, 0) / n;
  for (const { x, y } of rows) { let p = 0; for (let i = 0; i < NC; i++) if (x[i]) p += x[i] * w[i]; sse += (p - y) ** 2; sae += Math.abs(p - y); sst += (y - ybar) ** 2; }
  const pieces: any = {};
  for (const pt of PIECES) { const squares: Record<string, number | null> = {};
    for (let i = 0; i < 64; i++) { if (pt === "P" && ((i >> 3) === 0 || (i >> 3) === 7)) { squares[sqName(i)] = null; continue; }
      const col = fidx(pt, i); squares[sqName(i)] = samples[col] < 4 ? null : Math.round(w[col]) / 100; }
    pieces[pt] = { base_pawns: BASE_CP[pt] / 100, squares }; }
  const t = tempoByPhase[phase].n >= 10 ? tempoByPhase[phase].s / tempoByPhase[phase].n / 100 : tsum / tn / 100;
  out.phases[phase] = { stats: { n, r2: Math.round((1 - sse / sst) * 1000) / 1000, mae_pawns: Math.round((sae / n / 100) * 10000) / 10000 }, tempo_pawns: Math.round(Math.max(0.05, Math.min(0.8, t)) * 100) / 100, pieces };
  console.log(phase, "n", n, "r2", out.phases[phase].stats.r2, "mae", out.phases[phase].stats.mae_pawns, "tempo", out.phases[phase].tempo_pawns);
}

writeFileSync("public/data/pst_v1.json", JSON.stringify(out, null, 1));
writeFileSync("src/data/pst_v1.json", JSON.stringify(out));

// report a few headline cells
const sq = (ph: string, pc: string, s: string) => out.phases[ph].pieces[pc].squares[s];
console.log("W K g1:", { o: sq("opening","K","g1"), m: sq("middlegame","K","g1"), e: sq("endgame","K","g1") });
console.log("N:", { a1: sq("middlegame","N","a1"), e5: sq("middlegame","N","e5"), d6: sq("middlegame","N","d6"), h1: sq("endgame","N","h1"), e4: sq("endgame","N","e4") });
console.log("P:", { a2o: sq("opening","P","a2"), e4o: sq("opening","P","e4"), e4m: sq("middlegame","P","e4"), a7e: sq("endgame","P","a7"), a5e: sq("endgame","P","a5"), d2e: sq("endgame","P","d2") });
console.log("R:", { c7e: sq("endgame","R","c7"), a1e: sq("endgame","R","a1"), c2e: sq("endgame","R","c2"), d4m: sq("middlegame","R","d4"), a1m: sq("middlegame","R","a1"), h1o: sq("opening","R","h1") });
console.log("B:", { c4o: sq("opening","B","c4"), g2m: sq("middlegame","B","g2"), a1m: sq("middlegame","B","a1") });
console.log("Q:", { d1o: sq("opening","Q","d1"), d4m: sq("middlegame","Q","d4"), e6m: sq("middlegame","Q","e6"), h5o: sq("opening","Q","h5") });
console.log("B K g8 reads mirror g1 =", sq("middlegame","K","g1"), "(rank-flipped)");
