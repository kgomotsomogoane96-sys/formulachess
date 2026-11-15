import { type Data, type Phase, type PieceType, sqName, fmtP } from "../lib/core";
import { PIECE_SVG, copyLine, observeReveals } from "../lib/gfx";
import { markAtlas } from "../lib/store";

const PIECES: PieceType[] = ["p", "n", "b", "r", "q", "k"];
const PHASES: Phase[] = ["opening", "middlegame", "endgame"];
const $ = <T extends HTMLElement>(sel: string, root: ParentNode) => root.querySelector<T>(sel)!;

export function mountMap(root: HTMLElement, data: Data) {
  let piece: PieceType = "n";
  let phase: Phase = "middlegame";

  root.innerHTML = `
  <div class="view" style="overflow:auto">
    <div style="max-width:1120px;margin:0 auto;padding:22px;display:flex;flex-direction:column;gap:18px">
      <div class="row rv" style="justify-content:space-between;flex-wrap:wrap;gap:10px">
        <div>
          <div class="label">The atlas</div>
          <div class="h-block" style="font-size:24px">384 squares × 3 phases — every value was measured</div>
        </div>
        <div class="row">
          <div class="seg" id="phaseTabs">${PHASES.map((p) => `<button data-p="${p}">${p[0].toUpperCase()}</button>`).join("")}</div>
          <div class="seg" id="pieceTabs">${PIECES.map((p) => `<button data-q="${p}" title="${p.toUpperCase()}"><span style="width:22px;height:22px;display:block">${PIECE_SVG.w[p]}</span></button>`).join("")}</div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:minmax(320px,640px) 1fr;gap:22px;align-items:start" class="map-grid">
        <div class="panel rv" style="padding:14px"><div class="heat" id="heat"></div></div>
        <div style="display:flex;flex-direction:column;gap:14px">
          <div class="panel rv" style="padding:18px">
            <div class="label">Selected</div>
            <div id="picked" style="font-family:var(--font-mono);font-size:15px;margin-top:8px;min-height:44px"><span class="muted">Click any square — the line is copied: <b>[N-f3] = +3.4</b></span></div>
            <div class="row" style="gap:10px;margin-top:6px">
              <span class="label">base</span><span id="baseVal" style="font-family:var(--font-mono)">—</span>
              <span class="label" style="margin-left:8px">spread</span><span id="spreadVal" style="font-family:var(--font-mono)">—</span>
            </div>
          </div>
          <div class="panel rv" style="padding:18px">
            <div class="label">Legend</div>
            <div style="height:12px;border-radius:99px;margin:10px 0 6px;background:linear-gradient(90deg,#62707e,#c5cbd8,#f5ead6,#e5a94f,#c9832b,#96551a,#63361f)"></div>
            <div class="row" style="justify-content:space-between"><span class="label">below base</span><span class="label">above base</span></div>
            <p style="font-size:12.5px;color:var(--ink-soft);line-height:1.6;margin:10px 0 0">Hatched cells were never sampled — the receipt falls back to the piece's base value. Black pieces read the rank-mirrored square: a black knight on f6 reads the white map at f3.</p>
          </div>
          <div class="panel rv" style="padding:18px">
            <div class="label">This map was fitted, not guessed</div>
            <div id="mapstats" style="font-size:12.5px;color:var(--ink-soft);line-height:1.7;margin-top:8px"></div>
          </div>
        </div>
      </div>
    </div>
  </div>`;

  const heat = $("#heat", root);
  const pieceTabs = $("#pieceTabs", root);
  const phaseTabs = $("#phaseTabs", root);

  function drawHeat() {
    const rec = data.pst.phases[phase].pieces[piece.toUpperCase()];
    const base = rec.base_pawns;
    const vals: number[] = [];
    const qs: (number | null)[] = [];
    for (let i = 0; i < 64; i++) { const v = rec.squares[sqName(i)]; qs.push(v); if (v !== null && v !== undefined) vals.push(v); }
    const span = Math.max(0.01, Math.max(Math.max(...vals, base + 0.3) - base, base - Math.min(...vals, base - 0.3)));
    heat.innerHTML = "";
    for (let r8 = 0; r8 < 8; r8++) {
      for (let f = 0; f < 8; f++) {
        const i = (7 - r8) * 8 + f;
        const name = sqName(i);
        const v = qs[i];
        const cell = document.createElement("div");
        cell.className = "cell enter";
        cell.style.setProperty("--d", `${(r8 * 8 + f) * 6}ms`);
        if (v === null || v === undefined) {
          cell.classList.add("null");
          cell.innerHTML = `<span class="v">${base.toFixed(1)}</span><span class="s">${name} · base</span>`;
        } else {
          const dev = v - base;
          const t = Math.min(1, Math.abs(dev) / span);
          const mix = (a: number[], b: number[], k: number) => a.map((c, i2) => Math.round(c + (b[i2] - c) * k));
          const CREAM = [245, 234, 214], AMBER = [229, 169, 79], RUST = [201, 131, 43], WALNUT = [150, 85, 26], BARK = [99, 54, 31];
          const SLATE1 = [197, 203, 216], SLATE2 = [139, 152, 173], SLATE3 = [98, 108, 130];
          let rgb: number[];
          if (dev >= 0) {
            rgb = t < 0.34 ? mix(CREAM, AMBER, t / 0.34) : t < 0.67 ? mix(AMBER, RUST, (t - 0.34) / 0.33) : t < 0.9 ? mix(RUST, WALNUT, (t - 0.67) / 0.23) : mix(WALNUT, BARK, (t - 0.9) / 0.1);
          } else {
            rgb = t < 0.4 ? mix(CREAM, SLATE1, t / 0.4) : t < 0.75 ? mix(SLATE1, SLATE2, (t - 0.4) / 0.35) : mix(SLATE2, SLATE3, (t - 0.75) / 0.25);
          }
          cell.style.background = `rgb(${rgb})`;
          const lum = (rgb[0] * 299 + rgb[1] * 587 + rgb[2] * 114) / 1000;
          cell.style.color = lum > 150 ? "#382015" : "#fdf8ef";
          cell.innerHTML = `<span class="v">${v.toFixed(1)}</span><span class="s">${name}</span>`;
        }
        cell.addEventListener("click", () => {
          const letter = piece.toUpperCase();
          const val = v ?? base;
          copyLine(`[${letter}-${name}] = ${fmtP(val)}`);
          const dev = val - base;
          $("#picked", root).innerHTML = `<b>[${letter}-${name}] = ${fmtP(val)}</b> <span class="muted">· ${phase} · ${dev === 0 ? "= base" : fmtP(dev) + " vs base"}</span>`;
        });
        heat.appendChild(cell);
      }
    }
    $("#baseVal", root).textContent = base.toFixed(1);
    $("#spreadVal", root).textContent = `${Math.min(...vals).toFixed(1)} … ${Math.max(...vals).toFixed(1)}`;
    $("#mapstats", root).innerHTML = `${PHASES.map((p) => {
      const st = data.pst.phases[p].stats as Record<string, unknown>;
      return `<div>· <b style="text-transform:capitalize">${p}</b> — ${st.n_verify} verification positions, r² ${st.r2}, map MAE ${st.mae_pawns} pawns vs engine</div>`;
    }).join("")}<div style="margin-top:6px" class="muted">Engine: Stockfish 11 static eval. Method: paired probe ablation + ridge on ~2,800 game positions. Tactics are not in the map.</div>`;
    pieceTabs.querySelectorAll("button").forEach((b) => b.classList.toggle("active", b.dataset.q === piece));
    phaseTabs.querySelectorAll("button").forEach((b) => b.classList.toggle("active", b.dataset.p === phase));
  }

  pieceTabs.addEventListener("click", (e) => { const b = (e.target as HTMLElement).closest("button")!; if (!b.dataset.q) return; piece = b.dataset.q as PieceType; markAtlas(piece + "-" + phase); drawHeat(); });
  phaseTabs.addEventListener("click", (e) => { const b = (e.target as HTMLElement).closest("button")!; if (!b.dataset.p) return; phase = b.dataset.p as Phase; markAtlas(piece + "-" + phase); drawHeat(); });

  markAtlas(piece + "-" + phase);
  drawHeat();
  observeReveals(root);
  return { dispose: () => { root.innerHTML = ""; } };
}
