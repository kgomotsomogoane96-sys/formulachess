// Probe generation: positions that isolate one piece on one square, per phase,
// to cover cells the organic corpus never sampled. Plus paired stm-flip positions
// for an honest tempo measurement.
import { Chess } from "chess.js";
import { writeFileSync, readFileSync } from "fs";

const corpus = JSON.parse(readFileSync("scripts/corpus.json", "utf8")) as { fen: string; phase: string }[];
const PIECES = ["P", "N", "B", "R", "Q", "K"] as const;
const fidx = (p: string, sq: number) => PIECES.indexOf(p as never) * 64 + sq;
const mirror = (sq: number) => ((7 - (sq >> 3)) << 3) + (sq & 7);
const sqName = (i: number) => "abcdefgh"[i & 7] + ((i >> 3) + 1);
const sqIdx = (s: string) => (s.charCodeAt(1) - 49) * 8 + (s.charCodeAt(0) - 97);
function phaseScore(board: string) {
  let n = 0, b = 0, r = 0, q = 0;
  for (const ch of board) { const c = ch.toLowerCase(); if (c === "n") n++; else if (c === "b") b++; else if (c === "r") r++; else if (c === "q") q++; }
  const score = n + b + 2 * r + 4 * q;
  return score >= 20 ? "opening" : score >= 13 ? "middlegame" : "endgame";
}
// coverage of white-side columns (black reads mirrored → same column count)
const counts: Record<string, number[]> = { opening: new Array(385).fill(0), middlegame: new Array(385).fill(0), endgame: new Array(385).fill(0) };
for (const p of corpus) {
  const rows = p.fen.split(" ")[0].split("/");
  for (let r8 = 0; r8 < 8; r8++) { let f = 0; for (const ch of rows[r8]) { if (ch >= "1" && ch <= "8") { f += +ch; continue; } const sq = (7 - r8) * 8 + f; const c = ch === ch.toUpperCase() ? "w" : "b"; counts[p.phase][fidx(ch.toUpperCase(), c === "w" ? sq : mirror(sq))]++; f++; } }
}
// skeleton boards: {square: pieceChar} white upper, black lower
type BoardMap = Map<number, string>;
const S = (s: string) => sqIdx(s);
function makeBoard(entries: [string, string][]): BoardMap { const m = new Map(); for (const [sq, pc] of entries) m.set(S(sq), pc); return m; }
function fenOf(b: BoardMap, stm: "w" | "b" = "w") {
  let rows: string[] = [];
  for (let r = 7; r >= 0; r--) { let row = "", empty = 0; for (let f8 = 0; f8 < 8; f8++) { const pc = b.get(r * 8 + f8); if (pc) { if (empty) { row += empty; empty = 0; } row += pc; } else empty++; } if (empty) row += empty; rows.push(row); }
  return rows.join("/") + ` ${stm} - - 0 1`;
}
const SKELETONS: Record<string, (subject: string) => BoardMap> = {
  // startpos minus subject (keeps phase ≥ 20 for most subjects)
  opening: (subject) => {
    const m = makeBoard([["a1","R"],["b1","N"],["c1","B"],["d1","Q"],["e1","K"],["f1","B"],["g1","N"],["h1","R"],["a8","r"],["b8","n"],["c8","b"],["d8","q"],["e8","k"],["f8","b"],["g8","n"],["h8","r"]]);
    for (const sq of ["a2","b2","c2","d2","e2","f2","g2","h2"]) m.set(S(sq), subject === "P" && "acdefgh".includes(sq[0]) && sq[0] === "a" ? "P" : "P");
    for (const sq of ["a7","b7","c7","d7","e7","f7","g7","h7"]) m.set(S(sq), "p");
    // remove one subject (or for pawns, the file stays — subject goes on its own file)
    if (subject !== "P") { for (const [k, v] of m) if (v === subject) { m.delete(k); break; } }
    else { m.delete(S("d2")); m.delete(S("d7")); }
    return m;
  },
  middlegame: (subject) => {
    const m = makeBoard([["g1","K"],["g8","k"],["d1","Q"],["d8","q"],["a3","N"],["c5","B"],["f4","B"],["a6","n"],["a2","P"],["b2","P"],["c2","P"],["f2","P"],["g2","P"],["h2","P"],["a7","p"],["b7","p"],["c7","p"],["f7","p"],["g7","p"],["h7","p"]]);
    if (subject === "N") m.delete(S("a3"));
    if (subject === "B") m.delete(S("c5"));
    if (subject === "P") { m.delete(S("c2")); m.delete(S("c7")); }
    return m;
  },
  endgame: () => makeBoard([["e1","K"],["e8","k"],["a2","P"],["d4","P"],["e5","P"],["a7","p"],["d5","p"],["e4","p"]]),
};
const probes: { fen: string; phase: string }[] = [];
const probeSet: Record<string, Set<number>> = { opening: new Set(), middlegame: new Set(), endgame: new Set() };
for (const phase of ["opening", "middlegame", "endgame"]) {
  for (let pi = 0; pi < 6; pi++) {
    const pc = PIECES[pi];
    for (let sq = 0; sq < 64; sq++) {
      if (pc === "P" && ((sq >> 3) === 0 || (sq >> 3) === 7)) continue;
      if (counts[phase][fidx(pc, sq)] >= 4) continue;
      const sk = SKELETONS[phase](pc);
      if (sk.has(sq)) continue;
      if (pc === "K") {
        const bks = [...sk.entries()].filter(([, v]) => v === "k").map(([k]) => k);
        if (bks.some((bk) => Math.abs((bk & 7) - (sq & 7)) <= 1 && Math.abs((bk >> 3) - (sq >> 3)) <= 1)) continue;
        const wk = [...sk.entries()].find(([, v]) => v === "K");
        if (wk) sk.delete(wk[0]);
      }
      if (sk.has(sq)) continue;
      sk.set(sq, pc);
      const fen = fenOf(sk);
      if (phaseScore(fen.split(" ")[0]) !== phase) continue;
      try { const ch = new Chess(fen); if (ch.isGameOver() || ch.inCheck()) continue; probes.push({ fen: ch.fen(), phase }); probeSet[phase].add(fidx(pc, sq)); } catch { /* illegal */ }
    }
  }
}
// tempo pairs: 220 real positions, both stm variants
const tempoPairs: { a: string; b: string }[] = [];
const seenT = new Set<string>();
let ti = 0;
for (const p of corpus) {
  if (tempoPairs.length >= 220) break;
  if ((ti++ % 11) !== 0) continue;
  const parts = p.fen.split(" ");
  const stm = parts[1] === "w" ? "b" : "w";
  parts[1] = stm; parts[3] = "-";
  const f2 = parts.join(" ");
  try {
    const a = new Chess(p.fen), b = new Chess(f2);
    if (a.isGameOver() || b.isGameOver() || a.inCheck() || b.inCheck()) continue;
    if (seenT.has(p.fen)) continue; seenT.add(p.fen);
    tempoPairs.push({ a: p.fen, b: f2 });
  } catch { /* skip */ }
}
writeFileSync("scripts/probes.json", JSON.stringify({ probes, tempoPairs }));
console.log("probes:", probes.length, "tempo pairs:", tempoPairs.length);
for (const phase of ["opening", "middlegame", "endgame"]) console.log(phase, "probe cols", probeSet[phase].size);
