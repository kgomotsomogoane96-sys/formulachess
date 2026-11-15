import { Chess } from "chess.js";
import { writeFileSync } from "fs";
const SI = (s: string) => (s.charCodeAt(1) - 49) * 8 + (s.charCodeAt(0) - 97);
const SN = (i: number) => "abcdefgh"[i & 7] + ((i >> 3) + 1);
type Entry = [string, string]; // [square, piece] — piece char case = color

const P_EGA = [["a2","c2","f2","h2"], ["a7","c7","f7","h7"]];
const P_EGB = [["b2","d2","e2","g2"], ["b7","d7","e7","g7"]];

// series skeletons WITHOUT the white subject; black subject kept. v = variant 0/1
const SKEL: Record<string, Record<string, Entry[][]>> = {
  opening: {
    N: [
      [["g1","K"],["g8","k"],["d1","Q"],["d8","q"],["a1","R"],["h1","R"],["a8","r"],["h8","r"],["c4","B"],["f4","B"],["c5","b"],["f5","b"],["f3","N"],["c6","n"],["f6","n"]],
      [["e1","K"],["e8","k"],["e2","Q"],["e7","q"],["b1","R"],["c1","R"],["b8","r"],["c8","r"],["d3","B"],["g5","B"],["e6","b"],["d6","n"],["h6","n"]],
    ],
    B: [
      [["g1","K"],["g8","k"],["d1","Q"],["d8","q"],["a1","R"],["h1","R"],["a8","r"],["h8","r"],["c3","N"],["f3","N"],["c5","b"],["f5","b"],["c6","n"],["f6","n"]],
      [["e1","K"],["e8","k"],["e2","Q"],["e7","q"],["b1","R"],["c1","R"],["b8","r"],["c8","r"],["d2","N"],["b1","n"],["d6","n"],["e7","b"]],
    ],
    R: [
      [["g1","K"],["g8","k"],["d1","Q"],["d8","q"],["a1","R"],["c4","B"],["f4","B"],["c5","b"],["f5","b"],["c3","N"],["f3","N"],["a8","r"],["h8","r"],["c6","n"],["f6","n"]],
      [["e1","K"],["e8","k"],["e2","Q"],["e7","q"],["b1","R"],["c1","R"],["d3","B"],["g5","B"],["d2","N"],["e6","b"],["b8","r"],["d6","n"]],
    ],
    Q: [
      [["g1","K"],["g8","k"],["a1","R"],["h1","R"],["a8","r"],["h8","r"],["c4","B"],["f4","B"],["c5","b"],["f5","b"],["c3","N"],["f3","N"],["c6","n"],["f6","n"]],
      [["e1","K"],["e8","k"],["b1","R"],["c1","R"],["b8","r"],["c8","r"],["d3","B"],["g5","B"],["d2","N"],["b6","n"],["d6","n"],["e7","b"]],
    ],
    K: [
      [["a8","k"],["d1","Q"],["d8","q"],["a1","R"],["h1","R"],["a7","r"],["h8","r"],["c4","B"],["f4","B"],["c5","b"],["f5","b"],["c3","N"],["f3","N"],["c6","n"],["f6","n"]],
      [["h8","k"],["e2","Q"],["e7","q"],["b1","R"],["c1","R"],["b7","r"],["c8","r"],["d3","B"],["g5","B"],["d2","N"],["b6","n"],["d6","n"],["e7","b"]],
    ],
  },
  middlegame: {
    N: [
      [["g1","K"],["g8","k"],["d1","Q"],["d8","q"],["a1","R"],["h1","R"],["a8","r"],["h8","r"],["c4","B"],["f4","B"],["c5","b"],["f5","b"],["c6","n"]],
      [["e1","K"],["e8","k"],["e2","Q"],["e7","q"],["b1","R"],["c1","R"],["b8","r"],["c8","r"],["d3","B"],["g5","B"],["e6","b"],["d6","n"]],
    ],
    B: [
      [["g1","K"],["g8","k"],["d1","Q"],["d8","q"],["a1","R"],["h1","R"],["a8","r"],["h8","r"],["c3","N"],["c5","b"],["f5","b"],["c6","n"]],
      [["e1","K"],["e8","k"],["e2","Q"],["e7","q"],["b1","R"],["c1","R"],["b8","r"],["c8","r"],["d2","N"],["d6","n"],["e7","b"]],
    ],
    R: [
      [["g1","K"],["g8","k"],["d1","Q"],["d8","q"],["h1","R"],["c4","B"],["f4","B"],["c5","b"],["f5","b"],["c3","N"],["c6","n"]],
      [["e1","K"],["e8","k"],["e2","Q"],["e7","q"],["b1","R"],["d3","B"],["g5","B"],["d2","N"],["b8","r"],["d6","n"],["e6","b"]],
    ],
    Q: [
      [["g1","K"],["g8","k"],["a1","R"],["h1","R"],["a8","r"],["h8","r"],["c4","B"],["f4","B"],["c5","b"],["f5","b"],["c3","N"],["c6","n"]],
      [["e1","K"],["e8","k"],["b1","R"],["c1","R"],["b8","r"],["c8","r"],["d3","B"],["g5","B"],["d2","N"],["d6","n"],["e7","b"],["d8","q"]],
    ],
    K: [
      [["a8","k"],["d1","Q"],["d8","q"],["a1","R"],["h1","R"],["a7","r"],["h8","r"],["c4","B"],["f4","B"],["c5","b"],["f5","b"],["c3","N"],["c6","n"]],
      [["h8","k"],["e2","Q"],["e7","q"],["b1","R"],["c1","R"],["b7","r"],["c8","r"],["d3","B"],["g5","B"],["d2","N"],["d6","n"],["e7","b"]],
    ],
  },
  endgame: {
    N: [[["d3","K"],["e6","k"]], [["e2","K"],["e7","k"]]],
    B: [[["d3","K"],["e6","k"]], [["e2","K"],["e7","k"]]],
    R: [[["d3","K"],["e6","k"]], [["e2","K"],["e7","k"]]],
    Q: [[["d3","K"],["e6","k"]], [["e2","K"],["e7","k"]]],
    K: [[["a6","k"]], [["b6","k"]]],
  },
};

const PW: Record<string, string[][]> = {
  opening: [["a2","b2","c2","d2","e2","f2","g2","h2"], ["b2","c2","d2","e2","f2","g2","a3","h2"]],
  middlegame: [["a2","b2","c2","d2","f2","g2","h2"], ["a3","b2","c2","d2","f2","g2","h2"]],
  endgame: [P_EGA[0], P_EGB[0]],
};
const mirrorS = (i: number) => ((7 - (i >> 3)) << 3) + (i & 7);
const fenOf = (b: Map<number, string>) => {
  const rows: string[] = [];
  for (let r = 7; r >= 0; r--) { let row = "", e = 0; for (let f = 0; f < 8; f++) { const pc = b.get(r * 8 + f); if (pc) { if (e) { row += e; e = 0; } row += pc; } else e++; } if (e) row += e; rows.push(row); }
  return rows.join("/") + " w - - 0 1";
};
const legal = (fen: string) => { try { const c = new Chess(fen); return !c.isGameOver() && !c.inCheck() && !!c.get("e1") || true; } catch { return false; } };
const legal2 = (fen: string) => { try { const c = new Chess(fen); return !c.isGameOver() && !c.inCheck(); } catch { return false; } };

interface Probe { base: string; probe: string; phase: string; piece: string; sq: string }
const items: Probe[] = [];
const errors: string[] = [];
for (const phase of ["opening", "middlegame", "endgame"]) {
  for (const pc of ["N", "B", "R", "Q", "K"]) {
    for (let v = 0; v < 2; v++) {
      const b = new Map<number, string>();
      for (const [s, p] of SKEL[phase][pc][v]) b.set(SI(s), p);
      // pawns (mirrored)
      const wP = PW[phase][v];
      for (const s of wP) { if (!b.has(SI(s))) b.set(SI(s), "P"); if (!b.has(mirrorS(SI(s)))) b.set(mirrorS(SI(s)), "p"); }
      const baseFen = fenOf(b);
      if (!legal2(baseFen)) { errors.push(`${phase}|${pc}|${v}|${baseFen}`); continue; }
      const whiteOcc = new Set([...b.entries()].filter(([, p]) => p === p.toUpperCase()).map(([k]) => k));
      const blackKing = [...b.entries()].find(([, p]) => p === "k")?.[0];
      for (let sq = 0; sq < 64; sq++) {
        if (whiteOcc.has(sq)) continue;
        if (pc === "K" && blackKing !== undefined) {
          if (Math.abs((blackKing & 7) - (sq & 7)) <= 1 && Math.abs((blackKing >> 3) - (sq >> 3)) <= 1) continue;
        }
        const pb = new Map(b); pb.set(sq, pc);
        const pFen = fenOf(pb);
        if (!legal2(pFen)) continue;
        items.push({ base: baseFen, probe: pFen, phase, piece: pc, sq: SN(sq) });
      }
    }
  }
  // pawns: strip the file pair, probe pawn
  const ref = SKEL[phase].N;
  for (let v = 0; v < 2; v++) {
    const b = new Map<number, string>();
    for (const [s, p] of ref[v]) b.set(SI(s), p);
    const wP = PW[phase][v];
    for (const s of wP) { if (!b.has(SI(s))) b.set(SI(s), "P"); if (!b.has(mirrorS(SI(s)))) b.set(mirrorS(SI(s)), "p"); }
    for (let file = 0; file < 8; file++) {
      const strip = new Map(b);
      for (let r = 0; r < 8; r++) { if (strip.get(r * 8 + file) === "P") strip.delete(r * 8 + file); if (strip.get(r * 8 + file) === "p") strip.delete(r * 8 + file); }
      const stripFen = fenOf(strip);
      if (!legal2(stripFen)) { errors.push(`strip|${phase}|${v}|${file}|${stripFen}`); continue; }
      for (let r = 1; r <= 6; r++) {
        const pb = new Map(strip); pb.set(r * 8 + file, "P");
        const pFen = fenOf(pb);
        if (!legal2(pFen)) continue;
        items.push({ base: stripFen, probe: pFen, phase, piece: "P", sq: SN(r * 8 + file) });
      }
    }
  }
}
writeFileSync("scripts/probes2.json", JSON.stringify(items));
const byPhase: Record<string, number> = {}; const byPiece: Record<string, number> = {};
for (const i of items) { byPhase[i.phase] = (byPhase[i.phase] ?? 0) + 1; byPiece[i.piece] = (byPiece[i.piece] ?? 0) + 1; }
console.log("probes2:", items.length, byPhase, byPiece, "skeleton errors:", errors.length);
if (errors.length) console.log(errors.slice(0, 3));
