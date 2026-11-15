import { Chess } from "chess.js";
import { writeFileSync } from "fs";

export function phaseScoreFromFen(fen: string) {
  const rows = fen.split(" ")[0];
  let n = 0, b = 0, r = 0, q = 0;
  for (const ch of rows) { const c = ch.toLowerCase(); if (c === "n") n++; else if (c === "b") b++; else if (c === "r") r++; else if (c === "q") q++; }
  const score = n + b + 2 * r + 4 * q;
  return { score, phase: score >= 20 ? "opening" : score >= 13 ? "middlegame" : "endgame" };
}

const STARTS = [
  "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
  "r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3",
  "r1bqk1nr/pp1ppp1b/2n3p1/2p5/3P4/2N1PN2/PP3PPP/R1BQKB1R w KQkq - 0 6",
  "rnbqkbnr/pp2pppp/3p4/2p5/3PP3/8/PPP2PPP/RNBQKBNR w KQkq - 0 3",
  "r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/2PP1N2/P2P1PPP/RNBQK2R w KQkq - 0 6",
];
const ENDS = [
  "8/5pk1/3R4/8/4K3/8/5PP1/r7 w - - 0 1", "6k1/R4ppp/8/8/8/8/r4PPP/6K1 b - - 0 1",
  "8/8/1p3k2/pP6/P7/4K3/8/r2R4 w - - 0 1", "8/5k2/6p1/8/P5P1/5K2/8/8 w - - 0 1",
  "8/3b2k1/3p2p1/2pPp1P1/2P1P3/3N2K1/8/8 w - - 0 1", "6k1/pp3ppp/2n5/8/2B5/2B5/PP3PPP/6K1 w - - 0 1",
  "6k1/5pp1/7p/8/8/5B2/1r3PPP/3Q2K1 w - - 0 1", "r5k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1",
  "8/pp3p2/4k3/8/3K4/8/PP3P2/3R1r2 w - - 0 1", "1R6/1P6/8/5k2/8/8/1r6/6K1 w - - 0 1",
  "8/8/3k4/2pP4/2P5/8/5K2/8 w - - 0 1", "6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1",
];

let seed = 1337;
const rng = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };

const seen = new Set<string>();
const out: { fen: string; phase: string }[] = [];
const push = (fen: string) => {
  const key = fen.split(" ").slice(0, 4).join(" ");
  if (seen.has(key)) return false;
  const ch = new Chess(fen);
  if (ch.isGameOver() || ch.inCheck()) return false;
  seen.add(key);
  out.push({ fen: ch.fen(), phase: phaseScoreFromFen(key).phase });
  return true;
};

function playout(startFen: string) {
  const ch = new Chess(startFen);
  const targetPlies = 2 + Math.floor(rng() * 38);
  for (let i = 0; i < targetPlies; i++) {
    const moves = ch.moves({ verbose: true });
    if (!moves.length) return;
    // structurally biased random: development/center/castle early, activity later
    const w = moves.map((m) => {
      let s = 1;
      const file = m.to.charCodeAt(0) - 97, rank = m.to.charCodeAt(1) - 48;
      const center = (file >= 2 && file <= 5 && rank >= 3 && rank <= 6) ? 3 : 1;
      if (m.san.includes("O-O")) s += 6;
      if (m.captured) s += 2;
      s *= center;
      return s * (0.2 + rng());
    });
    let total = w.reduce((a, b) => a + b, 0), r = rng() * total, j = 0;
    while (j < moves.length - 1 && (r -= w[j]) > 0) j++;
    ch.move(moves[j]);
    if (i > 6 || rng() < 0.5) push(ch.fen());
  }
  push(ch.fen());
}

for (let i = 0; i < 2400; i++) playout(STARTS[i % STARTS.length]);
for (let i = 0; i < 1300; i++) playout(ENDS[i % ENDS.length]);

const counts = { opening: 0, middlegame: 0, endgame: 0 };
for (const p of out) counts[p.phase as keyof typeof counts]++;
// balance phases: cap largest at ratio
const caps = { opening: 950, middlegame: 950, endgame: 950 };
const final = [] as typeof out;
const cc = { ...counts }; Object.keys(cc).forEach(k => (cc as any)[k] = 0);
for (const p of out) { if ((cc as any)[p.phase] < (caps as any)[p.phase]) { (cc as any)[p.phase]++; final.push(p); } }
console.log("corpus:", final.length, cc);
writeFileSync("scripts/corpus.json", JSON.stringify(final));
