// Synthetic validation: build corpus rows from a KNOWN map; check recovery.
import { readFileSync } from "fs";
const corpus = JSON.parse(readFileSync("scripts/corpus.json", "utf8"));
const PIECES = ["P","N","B","R","Q","K"];
const BASE: Record<string, number> = { P: 100, N: 320, B: 330, R: 500, Q: 950, K: 0 };
const mirror = (sq: number) => ((7 - (sq >> 3)) << 3) + (sq & 7);
// true map: base + simple rank bonus for minors: +(rank-1)*8cp from center bias etc.
const trueMap: Record<string, number[]> = {};
for (const p of PIECES) {
  trueMap[p] = new Array(64).fill(0).map((_, i) => {
    const f = i & 7, r = i >> 3;
    let v = BASE[p];
    if (p === "N" || p === "B") v += (r - 0.5) * 10 + (3.5 - Math.abs(f - 3.5)) * 8;
    if (p === "R") v += r * 6; // rank 7 rook: +36
    if (p === "P") v += (r - 1) * 30; // rank 7 pawn: +180
    if (p === "K") v += r >= 1 && r <= 3 && f >= 2 && f <= 5 ? 60 : (r === 0 ? 20 : 0); // endgame-ish active king, back-rank +20
    return Math.round(v);
  });
}
const row = (fen: string) => {
  const parts = fen.split(/\s+/);
  const rows = parts[0].split("/");
  let y = 0;
  for (let r8 = 0; r8 < 8; r8++) { let f = 0; for (const ch of rows[r8]) { if (ch >= "1" && ch <= "8") { f += +ch; continue; } const sq = (7 - r8) * 8 + f; const c = ch === ch.toUpperCase() ? "w" : "b"; const msq = c === "w" ? sq : mirror(sq); y += (c === "w" ? 1 : -1) * trueMap[ch.toUpperCase()][msq]; f++; } }
  return y;
};
const NC = 384;
const A: number[][] = Array.from({ length: NC }, () => new Array(NC).fill(0));
const b: number[] = new Array(NC).fill(0);
const lam = 22;
let used = 0;
for (const p of corpus.slice(0, 1200)) {
  const y = row(p.fen);
  const parts = p.fen.split(/\s+/);
  const rows = parts[0].split("/");
  const x = new Float64Array(NC);
  for (let r8 = 0; r8 < 8; r8++) { let f = 0; for (const ch of rows[r8]) { if (ch >= "1" && ch <= "8") { f += +ch; continue; } const sq = (7 - r8) * 8 + f; const c = ch === ch.toUpperCase() ? "w" : "b"; x[PIECES.indexOf(ch.toUpperCase()) * 64 + (c === "w" ? sq : mirror(sq))] += c === "w" ? 1 : -1; f++; } }
  used++;
  for (let i = 0; i < NC; i++) { const xi = x[i]; if (!xi) continue; b[i] += xi * y; for (let j = i; j < NC; j++) if (x[j]) A[i][j] += xi * x[j]; }
}
for (let i = 0; i < NC; i++) for (let j = 0; j < i; j++) A[i][j] = A[j][i];
for (let i = 0; i < NC; i++) { A[i][i] += lam * 2; b[i] += lam * BASE[PIECES[(i / 64) | 0]]; }
function solve(A: number[][], b: number[]): number[] | null {
  const n = b.length; const M = A.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < n; c++) { let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    if (Math.abs(M[p][c]) < 1e-9) return null; [M[c], M[p]] = [M[p], M[c]];
    for (let r = 0; r < n; r++) { if (r === c) continue; const f = M[r][c] / M[c][c]; if (!f) continue; for (let cc = c; cc <= n; cc++) M[r][cc] -= f * M[c][cc]; } }
  return M.map((r, i) => r[n] / r[i]);
}
const w = solve(A, b)!;
const erri = (p: string, sq: string) => { const i = PIECES.indexOf(p) * 64 + (sq.charCodeAt(1) - 49) * 8 + (sq.charCodeAt(0) - 97); return { truth: trueMap[p][(sq.charCodeAt(1) - 49) * 8 + (sq.charCodeAt(0) - 97)], fitted: Math.round(w[i]) }; };
console.log("used rows", used);
console.log("K g1", erri("K","g1"), "K e4", erri("K","e4"));
console.log("N e5", erri("N","e5"), "N a1", erri("N","a1"), "N f3", erri("N","f3"));
console.log("Q d1", erri("Q","d1"), "Q d4", erri("Q","d4"));
console.log("R a1", erri("R","a1"), "R c7", erri("R","c7"));
console.log("P e4", erri("P","e4"), "P a7", erri("P","a7"));
console.log("B c4", erri("B","c4"));
