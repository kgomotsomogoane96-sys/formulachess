// Assemble pst_v1.json purely from paired probe measurements: value(piece,sq) = y(with) − y(without).
import { writeFileSync, readFileSync } from "fs";
const probes = JSON.parse(readFileSync("scripts/probes2.json", "utf8")) as { base: string; probe: string; phase: string; piece: string; sq: string }[];
const pv = JSON.parse(readFileSync("scripts/probes2-targets.json", "utf8")) as Record<string, number>;
const corpus = JSON.parse(readFileSync("scripts/corpus.json", "utf8"));
const targets = { ...JSON.parse(readFileSync("scripts/targets.json", "utf8")), ...pv };

const PIECES = ["P", "N", "B", "R", "Q", "K"];
const SN = (i: number) => "abcdefgh"[i & 7] + ((i >> 3) + 1);

const out: any = { classic_base: { P: 1.0, N: 3.2, B: 3.3, R: 5.0, Q: 9.5, K: 0.0 }, measured: { engine: "Stockfish 11 (WASM), classical static eval", method: "paired probe ablation, 2 skeleton variants", probes: probes.length }, phases: {} as any };
const TEMPO: Record<string, number> = { opening: 0.1, middlegame: 0.07, endgame: 0.09 };

for (const phase of ["opening", "middlegame", "endgame"]) {
  const pieces: any = {};
  for (const pc of PIECES) {
    const cells: Record<string, number[]> = {};
    const seriesRel: Record<string, { sq: string; y: number }[]> = {};
    for (const p of probes) {
      if (p.phase !== phase || p.piece !== pc) continue;
      const yp = pv[p.probe], yb = pv[p.base];
      if (yp === undefined) continue;
      if (pc !== "K") { if (yb === undefined) continue; cells[p.sq] = cells[p.sq] ?? []; cells[p.sq].push((yp - yb) / 100); }
      else seriesRel[p.base] ??= [], seriesRel[p.base].push({ sq: p.sq, y: yp });
    }
    const squares: Record<string, number | null> = {};
    if (pc !== "K") {
      for (let sq = 0; sq < 64; sq++) {
        const name = SN(sq);
        if (pc === "P" && ((sq >> 3) === 0 || (sq >> 3) === 7)) { squares[name] = null; continue; }
        const vals = cells[name];
        squares[name] = vals && vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100 : null;
      }
    } else {
      // king: decision-invariant — offset fixed later by phase mean-centering to 0
      const all: Record<string, number[]> = {};
      for (const rel of Object.values(seriesRel)) {
        const mean = rel.reduce((a, r) => a + r.y, 0) / rel.length;
        for (const r of rel) (all[r.sq] ??= []).push((r.y - mean) / 100);
      }
      let m = 0, n = 0;
      for (const vals of Object.values(all)) { const v = vals.reduce((a, b) => a + b, 0) / vals.length; m += v; n++; }
      m /= Math.max(1, n);
      for (let sq = 0; sq < 64; sq++) { const name = SN(sq); const vals = all[name]; squares[name] = vals ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length - m) * 100) / 100 : null; }
    }
    pieces[pc] = { base_pawns: pc === "K" ? 0.0 : out.classic_base[pc], squares };
  }
  out.phases[phase] = { stats: {}, tempo_pawns: TEMPO[phase], pieces };

  // verification on real corpus positions
  const mirror = (sq: number) => ((7 - (sq >> 3)) << 3) + (sq & 7);
  let sse = 0, sae = 0, sst = 0, n = 0, ymin = 0, ybar = 0;
  const ys: number[] = [];
  const rows: { y: number; pred: number }[] = [];
  for (const p of corpus) {
    if (p.phase !== phase) continue;
    const y = targets[p.fen]; if (y === undefined || Math.abs(y) >= 1600) continue;
    const parts = p.fen.split(/\s+/); const rowsB = parts[0].split("/");
    let pred = 0;
    for (let r8 = 0; r8 < 8; r8++) { let f = 0; for (const ch of rowsB[r8]) { if (ch >= "1" && ch <= "8") { f += +ch; continue; } const sq = (7 - r8) * 8 + f; const w = ch === ch.toUpperCase(); const pc = ch.toUpperCase(); const mx = w ? sq : mirror(sq); const v = pieces[pc].squares[SN(mx)]; const val = v ?? pieces[pc].base_pawns; pred += (w ? 1 : -1) * val; f++; } }
    pred += (parts[1] === "w" ? 1 : -1) * TEMPO[phase];
    pred *= 100;
    rows.push({ y, pred }); ys.push(y);
  }
  n = rows.length; ybar = ys.reduce((a, b) => a + b, 0) / n;
  for (const r of rows) { sse += (r.pred - r.y) ** 2; sae += Math.abs(r.pred - r.y); sst += (r.y - ybar) ** 2; }
  out.phases[phase].stats = { n_verify: n, r2: Math.round((1 - sse / sst) * 1000) / 1000, mae_pawns: Math.round((sae / n / 100) * 100) / 100 };
  console.log(phase, "verify: n", n, "r2", out.phases[phase].stats.r2, "mae", out.phases[phase].stats.mae_pawns);
}
writeFileSync("public/data/pst_v1.json", JSON.stringify(out, null, 1));
writeFileSync("src/data/pst_v1.json", JSON.stringify(out));
const sq = (ph: string, pc: string, s: string) => out.phases[ph].pieces[pc].squares[s];
console.log("K:", { g1m: sq("middlegame","K","g1"), e4e: sq("endgame","K","e4"), e1e: sq("endgame","K","e1"), g6e: sq("endgame","K","g6") });
console.log("N:", { a1o: sq("opening","N","a1"), e5o: sq("opening","N","e5"), e5m: sq("middlegame","N","e5"), a1m: sq("middlegame","N","a1"), d6m: sq("middlegame","N","d6"), e4e: sq("endgame","N","e4"), h8e: sq("endgame","N","h8") });
console.log("P:", { e4o: sq("opening","P","e4"), a2o: sq("opening","P","a2"), a3o: sq("opening","P","a3"), e5m: sq("middlegame","P","e5"), a7e: sq("endgame","P","a7"), b7e: sq("endgame","P","b7"), c2e: sq("endgame","P","c2") });
console.log("R:", { a1o: sq("opening","R","a1"), c7e: sq("endgame","R","c7"), a1m: sq("middlegame","R","a1"), d7m: sq("middlegame","R","d7"), e1o: sq("opening","R","e1") });
console.log("B:", { c4o: sq("opening","B","c4"), a1o: sq("opening","B","a1"), g2m: sq("middlegame","B","g2"), a6m: sq("middlegame","B","a6") });
console.log("Q:", { d1o: sq("opening","Q","d1"), d4m: sq("middlegame","Q","d4"), d8m: sq("middlegame","Q","d8"), h5m: sq("middlegame","Q","h5") });
