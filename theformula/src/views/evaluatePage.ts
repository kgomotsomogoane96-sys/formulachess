import { type Data, type Phase, type Piece, computeReceipt, fmtP, parseFen, START_FEN, type Color, type PieceType } from "../lib/core";
import { createBoard, type BoardHandle } from "../lib/board";
import { PIECE_SVG, NOTE_LETTER, ICONS, toast, tweenNumber, observeReveals } from "../lib/gfx";

const $ = <T extends HTMLElement>(sel: string, root: ParentNode) => root.querySelector<T>(sel)!;

export function mountEvaluate(root: HTMLElement, data: Data) {
  let palette: Piece | null = null;
  let phaseOverride: Phase | "auto" = "auto";
  let lastPosition = NaN;

  root.innerHTML = `
  <div class="view" style="overflow:auto">
    <div class="eval-grid" style="flex:1;min-height:0;display:grid;grid-template-columns:minmax(300px,620px) minmax(320px,440px);gap:22px;align-items:start;padding:20px;justify-content:center">
      <div style="display:flex;flex-direction:column;gap:12px;min-width:0">
        <div class="row" style="justify-content:space-between">
          <div class="label">Board · click to place / drag to move · click a piece to clear</div>
          <div class="row">
            <button class="iconbtn" data-a="home" title="Start position">${ICONS.home}</button>
            <button class="iconbtn" data-a="clear" title="Clear board">${ICONS.trash}</button>
            <button class="iconbtn" data-a="flip" title="Flip">${ICONS.flip}</button>
            <button class="iconbtn" data-a="rand" title="Study position">${ICONS.dice}</button>
          </div>
        </div>
        <div class="palette" id="palette"></div>
        <div class="board-wrap" id="boardwrap"></div>
        <div class="panel" style="padding:12px 16px">
          <div class="row" style="gap:8px;flex-wrap:wrap">
            <input id="fenin" class="field" placeholder="Paste FEN…" spellcheck="false" />
            <button class="btn small" id="loadfen">Load</button>
            <div class="seg" id="side">
              <button data-c="w" class="active">White</button><button data-c="b">Black</button>
            </div>
            <span class="label" style="margin-left:auto">to move</span>
          </div>
        </div>
        <div class="panel" style="padding:16px 18px;display:flex;align-items:center;justify-content:space-between;gap:14px">
          <div>
            <div class="label">Position</div>
            <div id="bignum" class="num-tween" style="font-size:52px;font-weight:800;font-family:var(--font-mono);letter-spacing:-0.03em;line-height:1">+0.0</div>
          </div>
          <div style="text-align:right;display:flex;flex-direction:column;align-items:flex-end;gap:8px">
            <span id="verdict" class="verdict-chip v-level">level</span>
            <span class="label" id="forside">white has it</span>
          </div>
        </div>
      </div>
      <div class="panel" style="display:flex;flex-direction:column;max-height:calc(100vh - 132px);min-height:420px;position:sticky;top:84px">
        <div style="padding:14px 18px 10px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:center;gap:8px">
          <span class="h-block" style="font-size:15px">Receipt</span>
          <div class="seg" id="phaseSeg">
            <button data-p="auto" class="active">Auto</button><button data-p="opening">O</button><button data-p="middlegame">M</button><button data-p="endgame">E</button>
          </div>
        </div>
        <div id="receipt" class="receipt" style="flex:1;overflow:auto;padding:12px 18px 16px"></div>
      </div>
    </div>
  </div>`;

  const pal = $("#palette", root);
  const order: PieceType[] = ["p", "n", "b", "r", "q", "k"];
  pal.innerHTML =
    [...order.map((t) => ({ t, c: "w" as Color })), ...order.map((t) => ({ t, c: "b" as Color }))]
      .map(({ t, c }) => `<button data-pt="${t}" data-pc="${c}" title="${c === "w" ? "White" : "Black"} ${NOTE_LETTER[t]}">${PIECE_SVG[c][t]}</button>`)
      .join("") + `<button data-pt="" data-pc="" title="Eraser (or: click an occupied square)">✕</button>`;
  pal.addEventListener("click", (e) => {
    const b = (e.target as HTMLElement).closest("button")!;
    const t = b.dataset.pt as PieceType;
    const deselect = () => { palette = null; pal.querySelectorAll(".active").forEach((x) => x.classList.remove("active")); };
    if (!t || b.classList.contains("active")) { deselect(); if (!t) toast("click a piece to clear it"); return; }
    pal.querySelectorAll(".active").forEach((x) => x.classList.remove("active"));
    b.classList.add("active");
    palette = { type: t, color: b.dataset.pc as Color };
  });

  let boardH: BoardHandle;
  let currentFen = START_FEN;
  let suppressed = false;

  const receiptEl = $("#receipt", root);
  const bigEl = $("#bignum", root);
  const verdictEl = $("#verdict", root);
  const fenInput = $("#fenin", root) as HTMLInputElement;
  const forside = $("#forside", root);
  const phaseSeg = $("#phaseSeg", root);

  function render(fen: string) {
    const { board, turn } = parseFen(fen);
    const rec = computeReceipt(board, turn, data.pst, phaseOverride);
    const groupHtml = (title: string, lines: typeof rec.white.lines, pile: number) => `
      <div class="receipt-group" style="padding:10px 0 6px">
        <h3 style="display:flex;justify-content:space-between"><span>${title}</span></h3>
        <div style="margin-top:6px">
          ${lines.map((l) => `<div class="pile-row ${l.dev > 0.049 ? "above" : l.dev < -0.049 ? "below" : ""}${l.isNull ? " nulls" : ""}"><span class="notation">${l.label}</span><span class="val">= ${fmtP(l.value)}</span></div>`).join("")}
        </div>
        <div class="pile-total"><span>${title} pile</span><span class="num-tween">${fmtP(pile, false)}</span></div>
      </div>`;
    receiptEl.innerHTML = `
      ${groupHtml("White", rec.white.lines, rec.white.pile - (rec.tempoFor === "w" ? rec.tempo : 0))}
      ${rec.tempoFor === "w" ? `<div class="tempo-row"><span>rows / tempo</span><span>${fmtP(rec.tempo)}</span></div>` : ""}
      <div style="height:10px"></div>
      ${groupHtml("Black", rec.black.lines, rec.black.pile - (rec.tempoFor === "b" ? rec.tempo : 0))}
      ${rec.tempoFor === "b" ? `<div class="tempo-row"><span>rows / tempo</span><span>${fmtP(rec.tempo)}</span></div>` : ""}
      ${rec.groups.map((g) => `<div class="receipt-group" style="padding:10px 0 6px"><h3>${g.title}</h3><div style="margin-top:6px">${g.lines.map((l) => `<div class="pile-row"><span class="notation">${l.label}</span><span class="val">${fmtP(l.value)}</span></div>`).join("")}</div></div>`).join("")}
      <div class="position-line"><span>POSITION</span><span class="num">${fmtP(rec.position)}</span></div>
      <div class="row" style="justify-content:space-between;margin-top:10px">
        <span class="verdict-chip ${rec.verdict.cls}">${rec.verdict.word}</span>
        <span class="label">${rec.phase}${phaseOverride === "auto" ? " (auto)" : ""}</span>
      </div>
      <p class="gate-line" style="margin-top:14px">${ICONS.flag} Check tactics first — this formula judges positions, not moves.</p>`;
    if (!Number.isNaN(lastPosition) && lastPosition !== rec.position) tweenNumber(bigEl, lastPosition, rec.position, (v) => fmtP(v), 300);
    else bigEl.textContent = fmtP(rec.position);
    lastPosition = rec.position;
    verdictEl.className = `verdict-chip ${rec.verdict.cls}`;
    verdictEl.textContent = rec.verdict.word;
    forside.textContent = rec.position > 0.049 ? "white has it" : rec.position < -0.049 ? "black has it" : "level";
    if (document.activeElement !== fenInput && !suppressed) fenInput.value = fen;
    $("#side", root).querySelectorAll("button").forEach((b) => b.classList.toggle("active", b.dataset.c === turn));
    phaseSeg.querySelector('[data-p="auto"]')!.textContent = `Auto · ${rec.autoPhase[0].toUpperCase()}`;
    phaseSeg.title = `phase score rule → ${rec.autoPhase}`;
  }

  document.addEventListener("formula:placed", () => { palette = null; pal.querySelectorAll(".active").forEach((x) => x.classList.remove("active")); });
  boardH = createBoard({
    fen: START_FEN,
    paletteRef: () => palette,
    onChange: (fen) => { suppressed = true; currentFen = fen; render(fen); suppressed = false; },
  });
  $("#boardwrap", root).appendChild(boardH.el);

  root.querySelector('[data-a="flip"]')!.addEventListener("click", () => boardH.setFlipped(!boardH.flipped));
  root.querySelector('[data-a="clear"]')!.addEventListener("click", () => { currentFen = "8/8/8/8/8/8/8/8 w - - 0 1"; boardH.set(currentFen); render(currentFen); });
  root.querySelector('[data-a="home"]')!.addEventListener("click", () => { currentFen = START_FEN; boardH.set(currentFen); render(currentFen); });
  root.querySelector('[data-a="rand"]')!.addEventListener("click", () => {
    const p = data.drills[Math.floor(Math.random() * data.drills.length)];
    currentFen = p.fen; boardH.set(currentFen); render(currentFen); toast(p.name);
  });
  const loadFen = () => {
    const raw = fenInput.value.trim();
    if (!raw) return;
    try {
      parseFen(raw);
      const full = raw.split(/\s+/).length >= 2 ? raw : raw + " w - - 0 1";
      currentFen = full;
      boardH.set(full);
      render(full);
    } catch { toast("invalid FEN"); }
  };
  $("#loadfen", root).addEventListener("click", loadFen);
  fenInput.addEventListener("keydown", (e) => { if (e.key === "Enter") loadFen(); });
  fenInput.addEventListener("paste", () => setTimeout(loadFen, 0));
  $("#side", root).addEventListener("click", (e) => {
    const b = (e.target as HTMLElement).closest("button")!;
    const parts = currentFen.split(/\s+/);
    parts[1] = b.dataset.c!;
    parts[3] = "-";
    currentFen = parts.join(" ");
    boardH.set(currentFen);
    render(currentFen);
  });
  phaseSeg.addEventListener("click", (e) => {
    const b = (e.target as HTMLElement).closest("button")!;
    phaseOverride = b.dataset.p as Phase | "auto";
    phaseSeg.querySelectorAll("button").forEach((x) => x.classList.toggle("active", x === b));
    render(currentFen);
  });

  render(START_FEN);
  observeReveals(root);
  return { dispose: () => { root.innerHTML = ""; } };
}
