import { writeFileSync, readFileSync } from "fs";
const probes = JSON.parse(readFileSync("scripts/probes2.json", "utf8")) as { base: string; probe: string; phase: string; piece: string; sq: string }[];
const pv = JSON.parse(readFileSync("scripts/probes2-targets.json", "utf8")) as Record<string, number>;
const corpus = JSON.parse(readFileSync("scripts/corpus.json", "utf8"));
const targets = { ...JSON.parse(readFileSync("scripts/targets.json", "utf8")), ...JSON.parse(readFileSync("scripts/probes-targets.json", "utf8")) };
const PIECES = ["P", "N", "B", "R", "Q", "K"];

const SN = (i: number) => "abcdefgh"[i & 7] + ((i >> 3) + 1);
const SI = (s: string) => (s.charCodeAt(1) - 49) * 8 + (s.charCodeAt(0) - 97);
const mirror = (sq: number) => ((7 - (sq >> 3)) << 3) + (sq & 7);
const TEMPO: Record<string, number> = { opening: 0.1, middlegame: 0.07, endgame: 0.09 };

const out: any = { classic_base: { P: 1.0, N: 3.2, B: 3.3, R: 5.0, Q: 9.5, K: 0.0 }, measured: { engine: "Stockfish 11 (WASM), classical static eval", method: "paired probe ablation (2 skeleton variants) + corpus ridge for edge cells", probes: probes.length }, phases: {} as any };

for (const phase of ["opening", "middlegame", "endgame"]) {
  const pieces: any = {};
  // ---- probe deltas: piece value ON square minus base
  const allDevs: Record<string, Record<string, number[]>> = {};
  for (const pc of PIECES) {
    allDevs[pc] = {};
    const cells: Record<string, number[]> = {};
    const kingSeries: Record<string, { sq: string; y: number }[]> = {};
    for (const p of probes) {
      if (p.phase !== phase || p.piece !== pc) continue;
      const yp = pv[p.probe], yb = pv[p.base];
      if (yp === undefined) continue;
      if (pc !== "K") { if (yb === undefined) continue; (cells[p.sq] ??= []).push(yp - yb); }
      else (kingSeries[p.base] ??= []).push({ sq: p.sq, y: yp });
    }
    if (pc !== "K") {
      const base = out.classic_base[pc] * 100;
      for (const [sq, vals] of Object.entries(cells)) allDevs[pc][sq] = [vals.reduce((a, b) => a + b, 0) / vals.length - base];
    } else {
      const all: Record<string, number[]> = {};
      for (const rel of Object.values(kingSeries)) {
        const m = rel.reduce((a, r) => a + r.y, 0) / rel.length;
        for (const r of rel) (all[r.sq] ??= []).push(r.y - m);
      }
      // king: anchor g1 = 0 for opening/mid, e1 for endgame — then everything is relative to it.
      // center by mean over covered squares so typical castled/back-rank spreads read intuitively.
      for (const [sq, vals] of Object.entries(all)) allDevs.K[sq] = [vals.reduce((a, b) => a + b, 0) / vals.length];
      const m = Object.values(allDevs.K).map((v) => v[0]);
      const mean = m.reduce((a, b) => a + b, 0) / m.length;
      for (const k of Object.keys(allDevs.K)) allDevs.K[k][0] -= mean;
    }
  }
  for (const pc of PIECES) {
    const squares: Record<string, number | null> = {};
    const values: number[] = [];
    for (let sq = 0; sq < 64; sq++) {
      const name = SN(sq);
      if (pc === "P" && ((sq >> 3) === 0 || (sq >> 3) === 7)) { squares[name] = null; continue; }
      squares[name] = allDevs[pc][name] ? allDevs[pc][name][0] / 100 : null;
      if (squares[name] !== null) values.push(squares[name]!);
    }
    const mean = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
    const sd = values.length ? Math.sqrt(values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length) : 1;
    (pieces as any)[pc] = { base_pawns: out.classic_base[pc], squares, _dev: allDevs[pc], _mean: mean, _sd: Math.max(0.08, sd) };
  }
  // ---- ridge per piece cols on corpus+probes for coverage fill (deviation model)
  const rows: { x: Map<number, number>; y: number }[] = [];
  const pushRow = (fen: string, ycp: number) => {
    const parts = fen.split(/\s+/); const rowsB = parts[0].split("/");
    const x = new Map<number, number>();
    let y = ycp;
    const counts: Record<string, number> = {};
    for (let r8 = 0; r8 < 8; r8++) { let f = 0; for (const ch of rowsB[r8]) { if (ch >= "1" && ch <= "8") { f += +ch; continue; } const sq = (7 - r8) * 8 + f; const w = ch === ch.toUpperCase(); const pc = ch.toUpperCase(); counts[pc] = (counts[pc] ?? 0) + (w ? 1 : -1);
      const msq = w ? sq : mirror(sq); y -= 0; // keep y; material mean handled in dev space below
      const pi = PIECES.indexOf(pc); x.set(pi * 64 + msq, (x.get(pi * 64 + msq) ?? 0) + (w ? 1 : -1)); f++; } }
    // dev-space: subtract classic base × count, subtract probe dev where present (measured) to regress only residual mapping noise
    let yDev = ycp;
    for (const pc of PIECES) yDev -= (counts[pc] ?? 0) * out.classic_base[pc] * 100;
    for (const [col, v] of x) { const pc = PIECES[(col / 64) | 0]; const name = SN(col % 64); const dv = (pieces as any)[pc]._dev[name]; if (dv) yDev -= v * dv[0]; }
    yDev -= (parts[1] === "w" ? 1 : -1) * TEMPO[phase] * 100;
    rows.push({ x, y: yDev });
  };
  for (const p of corpus) { const y = targets[p.fen]; if (y === undefined || Math.abs(y) >= 1600) continue; pushRow(p.fen, y); }
  for (const p of probes) { const y = pv[p.probe]; if (y === undefined) continue; pushRow(p.probe, y); }
  const NC = 384;
  const A: number[][] = Array.from({ length: NC }, () => new Array(NC).fill(0));
  const b: number[] = new Array(NC).fill(0);
  const samples = new Array(NC).fill(0);
  for (const { x, y } of rows) {
    for (const [i, xi] of x) { samples[i] += Math.abs(xi); b[i] += xi * y; for (const [j, xj] of x) if (j >= i) A[i][j] += xi * xj; }
  }
  for (let i = 0; i < NC; i++) for (let j = 0; j < i; j++) A[i][j] = A[j][i];
  const lam = 40;
  for (let i = 0; i < NC; i++) { A[i][i] += lam; }
  const n = NC; const M = A.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < n; c++) { let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r; [M[c], M[p]] = [M[p], M[c]];
    for (let r = 0; r < n; r++) { if (r === c) continue; const f = M[r][c] / M[c][c]; if (!f) continue; for (let cc = c; cc <= n; cc++) M[r][cc] -= f * M[c][cc]; } }
  const wR = M.map((r, i) => r[n] / (r[i] || 1e-12));
  // presence mask (organic only — probes flag cells separately)
  const org: number[] = new Array(NC).fill(0);
  for (const p of corpus) { const parts = p.fen.split(/\s+/); const rowsB = parts[0].split("/");
    for (let r8 = 0; r8 < 8; r8++) { let f = 0; for (const ch of rowsB[r8]) { if (ch >= "1" && ch <= "8") { f += +ch; continue; } const sq = (7 - r8) * 8 + f; const w = ch === ch.toUpperCase(); const msq = w ? sq : mirror(sq); org[PIECES.indexOf(ch.toUpperCase()) * 64 + msq]++; f++; } } }
  // ---- stitch
  for (let pi = 0; pi < 6; pi++) {
    const pc = PIECES[pi];
    const rec = (pieces as any)[pc];
    for (let sq = 0; sq < 64; sq++) {
      const name = SN(sq);
      if (pc === "P" && ((sq >> 3) === 0 || (sq >> 3) === 7)) continue;
      const hasDev = rec._dev[name] !== undefined;
      const covered = hasDev || org[pi * 64 + sq] >= 4;
      let devCp: number;
      if (hasDev) {
        const dm = rec._dev[name][0], sd = rec._sd * 100, mean = rec._mean * 100;
        const z = Math.max(-3, Math.min(3, (dm - mean) / sd));
        const sdShrink = rec._sd * 100;
        devCp = z * Math.min(1, sdShrink / 60) * 40;
        if (org[pi * 64 + sq] >= 4) {
          // blend with regression-residual where it disagrees in a bold way
          devCp = devCp + Math.max(-30, Math.min(30, wR[pi * 64 + sq])) * 0.25;
        }
      } else if (covered) {
        devCp = Math.max(-80, Math.min(80, wR[pi * 64 + sq] * 0.8));
      } else continue; // null
      const v = (out.classic_base[pc] * 100 + devCp) / 100;
      const mn = pc === "K" ? -1.5 : 0.1, mx = pc === "K" ? 1.5 : out.classic_base[pc] * 1.9;
      rec.squares[name] = Math.round(Math.max(mn, Math.min(mx, v)) * 100) / 100;
    }
    delete rec._dev; delete rec._mean; delete rec._sd;
  }
  // verification
  let sse = 0, sae = 0, sst = 0, nn = 0; const ys: number[] = [];
  const rowsV: { y: number; pred: number }[] = [];
  for (const p of corpus) { if (p.phase !== phase) continue; const y = targets[p.fen]; if (y === undefined || Math.abs(y) >= 1600) continue;
    const parts = p.fen.split(/\s+/); const rowsB = parts[0].split("/"); let pred = 0;
    for (let r8 = 0; r8 < 8; r8++) { let f = 0; for (const ch of rowsB[r8]) { if (ch >= "1" && ch <= "8") { f += +ch; continue; } const sq = (7 - r8) * 8 + f; const w = ch === ch.toUpperCase(); const pc = ch.toUpperCase();
      const v = (pieces as any)[pc].squares[SN(w ? sq : mirror(sq))]; pred += (w ? 1 : -1) * (v ?? (pieces as any)[pc].base_pawns); f++; } }
    pred += (parts[1] === "w" ? 1 : -1) * TEMPO[phase];
    pred *= 100; rowsV.push({ y, pred }); ys.push(y); }
  nn = rowsV.length; const ybar = ys.reduce((a, b) => a + b, 0) / nn;
  for (const r of rowsV) { sse += (r.pred - r.y) ** 2; sae += Math.abs(r.pred - r.y); sst += (r.y - ybar) ** 2; }
  out.phases[phase] = { stats: { n_verify: nn, r2: Math.round((1 - sse / sst) * 1000) / 1000, mae_pawns: Math.round((sae / nn / 100) * 100) / 100, note: "verification on organic corpus positions; model = map + tempo, no tactics" }, tempo_pawns: TEMPO[phase], pieces };
  console.log(phase, "verify n", nn, "r2", out.phases[phase].stats.r2, "mae", out.phases[phase].stats.mae_pawns);
}
delete (out.measured as any).probes;
writeFileSync("public/data/pst_v1.json", JSON.stringify(out, null, 1));
writeFileSync("src/data/pst_v1.json", JSON.stringify(out));
const sq = (ph: string, pc: string, s: string) => out.phases[ph].pieces[pc].squares[s];
console.log("K:", { g1m: sq("middlegame","K","g1"), e4e: sq("endgame","K","e4"), e1e: sq("endgame","K","e1"), g6e: sq("endgame","K","g6"), e2o: sq("opening","K","e2") });
console.log("N:", { a1o: sq("opening","N","a1"), e5o: sq("opening","N","e5"), e5m: sq("middlegame","N","e5"), d6m: sq("middlegame","N","d6"), e4e: sq("endgame","N","e4"), h8e: sq("endgame","N","h8"), b1e: sq("endgame","N","b1") });
console.log("P:", { e4o: sq("opening","P","e4"), a2o: sq("opening","P","a2"), a3o: sq("opening","P","a3"), e5m: sq("middlegame","P","e5"), a7e: sq("endgame","P","a7"), c6e: sq("endgame","P","c6"), c2e: sq("endgame","P","c2") });
console.log("R:", { a1o: sq("opening","R","a1"), c7e: sq("endgame","R","c7"), a1m: sq("middlegame","R","a1"), d7m: sq("middlegame","R","d7") });
console.log("B:", { c4o: sq("opening","B","c4"), a1o: sq("opening","B","a1"), g2m: sq("middlegame","B","g2"), a1m: sq("middlegame","B","a1") });
console.log("Q:", { d1o: sq("opening","Q","d1"), d4m: sq("middlegame","Q","d4"), d8m: sq("middlegame","Q","d8"), h5m: sq("middlegame","Q","h5"), a4e: sq("endgame","Q","a4") });
