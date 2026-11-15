// core: FEN, phase rule, mirroring, eval model, data loading.
import rawPst from "../data/pst_v1.json";
import rawPos from "../data/positions.json";

export type Color = "w" | "b";
export type PieceType = "p" | "n" | "b" | "r" | "q" | "k";
export type Phase = "opening" | "middlegame" | "endgame";
export interface Piece { type: PieceType; color: Color }

export interface pstPiece { base_pawns: number; squares: Record<string, number | null> }
export interface PstPhase { stats: Record<string, unknown>; tempo_pawns: number; pieces: Record<string, pstPiece> }
export interface PstFile { classic_base: Record<string, number>; measured?: unknown; phases: Record<Phase, PstPhase> }
export interface DrillPos { id: string; name: string; fen: string; truth_pawns: number }
export interface Data { pst: PstFile; drills: DrillPos[] }

const embedded: Data = { pst: rawPst as unknown as PstFile, drills: (rawPos as unknown as { positions: DrillPos[] }).positions };

export async function loadData(): Promise<Data> {
  try {
    const [pst, pos] = await Promise.all([
      fetch("./data/pst_v1.json", { cache: "no-store" }),
      fetch("./data/positions.json", { cache: "no-store" }),
    ]);
    if (!pst.ok || !pos.ok) throw new Error("offline");
    const pstJ = (await pst.json()) as PstFile;
    const posJ = (await pos.json()) as { positions: DrillPos[] };
    if (!pstJ?.phases?.opening || !Array.isArray(posJ?.positions)) throw new Error("bad shape");
    return { pst: pstJ, drills: posJ.positions };
  } catch {
    return embedded;
  }
}

// ---------- FEN ----------
export interface Parsed { board: (Piece | null)[]; turn: Color }
export const FILES = "abcdefgh";
export const sqName = (i: number) => FILES[i & 7] + ((i >> 3) + 1);
export const sqIndex = (s: string) => (s.charCodeAt(1) - 49) * 8 + (s.charCodeAt(0) - 97);
export const mirrorSq = (sq: number) => ((7 - (sq >> 3)) << 3) + (sq & 7); // rank flip

export function parseFen(fen: string): Parsed {
  const parts = fen.trim().split(/\s+/);
  const board: (Piece | null)[] = new Array(64).fill(null);
  const rows = parts[0].split("/");
  for (let r8 = 0; r8 < 8; r8++) {
    let f = 0;
    for (const ch of rows[r8] ?? "") {
      if (ch >= "1" && ch <= "8") f += +ch;
      else { board[(7 - r8) * 8 + f] = { type: ch.toLowerCase() as PieceType, color: ch === ch.toUpperCase() ? "w" : "b" }; f++; }
    }
  }
  return { board, turn: parts[1] === "b" ? "b" : "w" };
}

export function buildFen(board: (Piece | null)[], turn: Color): string {
  const rows: string[] = [];
  for (let r = 7; r >= 0; r--) {
    let row = "", e = 0;
    for (let f = 0; f < 8; f++) {
      const p = board[r * 8 + f];
      if (p) { if (e) { row += e; e = 0; } row += p.color === "w" ? p.type.toUpperCase() : p.type; } else e++;
    }
    if (e) row += e;
    rows.push(row);
  }
  return `${rows.join("/")} ${turn} - - 0 1`;
}

export const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

// spec §2: phase_score = knights + bishops + 2×rooks + 4×queens
export function detectPhase(board: (Piece | null)[]): Phase {
  let n = 0, b = 0, r = 0, q = 0;
  for (const p of board) { if (!p) continue; if (p.type === "n") n++; else if (p.type === "b") b++; else if (p.type === "r") r++; else if (p.type === "q") q++; }
  const score = n + b + 2 * r + 4 * q;
  return score >= 20 ? "opening" : score >= 13 ? "middlegame" : "endgame";
}

// ---------- the map model ----------
export interface ReceiptLine { key: string; label: string; value: number; dev: number; isNull: boolean }
export interface ReceiptGroup { id: string; title: string; lines: ReceiptLine[]; subtotal?: number }
export interface Receipt {
  phase: Phase; autoPhase: Phase;
  white: { lines: ReceiptLine[]; pile: number };
  black: { lines: ReceiptLine[]; pile: number };
  groups: ReceiptGroup[]; // empty for now — feature groups arrive with data/features.json
  tempo: number; tempoFor: Color;
  position: number; // white − black, pawns
  verdict: { word: string; cls: string };
  missing: number;
}

export function mapValue(pst: PstFile, phase: Phase, type: PieceType, square: number, color: Color): { value: number; isNull: boolean } {
  const msq = color === "w" ? square : mirrorSq(square);
  const rec = pst.phases[phase].pieces[type.toUpperCase()];
  const v = rec.squares[sqName(msq)];
  if (v === null || v === undefined) return { value: rec.base_pawns, isNull: true };
  return { value: v, isNull: false };
}

export function verdictOf(pv: number): { word: string; cls: string } {
  const d = Math.abs(pv);
  if (d < 0.5) return { word: "level", cls: "v-level" };
  if (d < 1.5) return { word: "edge", cls: "v-edge" };
  if (d <= 3.0) return { word: "better", cls: "v-better" };
  return { word: "winning", cls: "v-winning" };
}

export function computeReceipt(board: (Piece | null)[], turn: Color, pst: PstFile, phaseOverride: Phase | "auto"): Receipt {
  const autoPhase = detectPhase(board);
  const phase = phaseOverride === "auto" ? autoPhase : phaseOverride;
  const base = pst.classic_base;
  const linesFor = (color: Color): ReceiptLine[] => {
    const out: ReceiptLine[] = [];
    for (let sq = 0; sq < 64; sq++) {
      const p = board[sq];
      if (p && p.color === color) {
        const { value, isNull } = mapValue(pst, phase, p.type, sq, color);
        const letter = p.type.toUpperCase();
        out.push({
          key: `${color}-${sq}`,
          label: `[${letter}-${sqName(sq)}]`,
          value,
          dev: value - base[letter],
          isNull,
        });
      }
    }
    return out.sort((a, b) => b.value - a.value);
  };
  const white = linesFor("w"), black = linesFor("b");
  let pw = white.reduce((a, l) => a + l.value, 0);
  let pb = black.reduce((a, l) => a + l.value, 0);
  const tempo = pst.phases[phase].tempo_pawns;
  if (turn === "w") pw += tempo; else pb += tempo;
  const position = +(pw - pb).toFixed(2);
  const missing = [...white, ...black].filter((l) => l.isNull).length;
  return {
    phase, autoPhase, black: { lines: black, pile: pb }, white: { lines: white, pile: pw },
    groups: [], tempo, tempoFor: turn, position, verdict: verdictOf(position), missing,
  };
}

export const fmtP = (v: number, forceSign = true) => {
  const r = Math.round(v * 10) / 10;
  const s = r > 0 ? "+" : r < 0 ? "−" : forceSign ? "+" : "";
  return s + Math.abs(r).toFixed(1);
};
export const fmtPAbs = (v: number) => (Math.round(v * 10) / 10).toFixed(1);
