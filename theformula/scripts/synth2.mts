// Full-column synthetic check with WEAK prior.
import { readFileSync } from "fs";
const corpus = JSON.parse(readFileSync("scripts/corpus.json", "utf8"));
const PIECES = ["P","N","B","R","Q","K"];
const BASE: Record<string, number> = { P: 100, N: 320, B: 330, R: 500, Q: 950, K: 0 };
const mirror = (sq: number) => ((7 - (sq >> 3)) << 3) + (sq & 7);
const trueMap: Record<string, number[]> = {};
for (const p of PIECES) {
  trueMap[p] = Array.from({length: 64}, (_, i) => {
    const f = i & 7, r = i >> 3; let v = BASE[p];
    if (p === "N" || p === "B") v += (r - 0.5) * 10 + (3.5 - Math.abs(f - 3.5)) * 8;
    if (p === "R") v += r * 6;
    if (p === "P") v += (r - 1) * 30;
    return Math.round(v);
  });
}
const NC = 384;
const idx = (p: string, sq: number) => PIECES.indexOf(p) * 64 + sq;
const readX = (fen: string): Float64Array => {
  const x = new Float64Array(NC);
  const rowsB = fen.split(/\s+/)[0].split("/");
  for (let r8 = 0; r8 < 8; r8++) { let f = 0; for (const ch of rowsB[r8]) { if (ch >= "1" && ch <= "8") { f += +ch; continue; }
    const sq = (7 - r8) * 8 + f; const w = ch === ch.toUpperCase(); x[idx(ch.toUpperCase(), w ? sq : mirror(sq))] += w ? 1 : -1; f++; } }
  return x;
};
const yOf = (x: Float64Array) => { let y = 0; for (let p = 0; p < 6; p++) for (let s = 0; s < 64; s++) { const v = x[idx(PIECES[p], s)]; if (v) y += v * trueMap[PIECES[p]][s]; } return y; };
function solve(A: number[][], b: number[]): number[] {
  const n = b.length; const M = A.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < n; c++) { let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = 0; r < n; r++) { if (r === c) continue; const f = M[r][c] / M[c][c]; if (!f) continue; for (let cc = c; cc <= n; cc++) M[r][cc] -= f * M[c][cc]; } }
  return M.map((r, i) => r[n] / r[i]);
}
// no-prior, tiny damping only
const A: number[][] = Array.from({ length: NC }, () => new Array(NC).fill(0));
const b = new Array(NC).fill(0);
let used = 0;
for (const p of corpus) {
  const x = readX(p.fen); const y = yOf(x); used++;
  for (let i = 0; i < NC; i++) { const xi = x[i]; if (!xi) continue; b[i] += xi * y; for (let j = i; j < NC; j++) if (x[j]) A[i][j] += xi * x[j]; }
}
for (let i = 0; i < NC; i++) for (let j = 0; j < i; j++) A[i][j] = A[j][i];
for (let i = 0; i < NC; i++) A[i][i] += 0.1;
const w = solve(A, b);
const g = (p: string, s: string) => Math.round(w[idx(p, (s.charCodeAt(1) - 49) * 8 + (s.charCodeAt(0) - 97))]);
const t = (p: string, s: string) => trueMap[p][(s.charCodeAt(1) - 49) * 8 + (s.charCodeAt(0) - 97)];
console.log("Q d1", g("Q","d1"), t("Q","d1"), "| N f3", g("N","f3"), t("N","f3"), "| R c7", g("R","c7"), t("R","c7"), "| P e4", g("P","e4"), t("P","e4"), "| K g1", g("K","g1"), t("K","g1"), "| K e4", g("K","e4"), t("K","e4"));
// residual stats
let sae = 0; for (const p of corpus.slice(0, 200)) { const x = readX(p.fen); let pr = 0; for (let i = 0; i < NC; i++) if (x[i]) pr += x[i] * w[i]; sae += Math.abs(pr - yOf(x)); }
console.log("mae0-200", (sae / 200).toFixed(1));
