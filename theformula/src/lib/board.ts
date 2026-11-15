import { type Color, type Piece, type PieceType, sqName } from "./core";
import { PIECE_SVG } from "./gfx";

export interface BoardHandle {
  el: HTMLElement;
  set(fen: string): void;
  getFen(): string;
  setFlipped(f: boolean): void;
  flipped: boolean;
  onChange: ((fen: string) => void) | null;
}

export interface BoardOptions {
  fen: string;
  flipped?: boolean;
  interactive?: boolean;
  paletteRef?: () => Piece | null; // current palette selection (null = none → click clears)
  onChange?: (fen: string) => void;
  highlight?: (sqName: string) => string | null; // tone class hook (heatmap/preview)
}

export function createBoard(opts: BoardOptions): BoardHandle {
  import("./core").then(() => undefined);
  const wrap = document.createElement("div");
  wrap.className = "board";
  let flipped = !!opts.flipped;
  let board: (Piece | null)[] = [];
  let turn: Color = "w";
  let dragging: { piece: Piece; from: number; ghost: HTMLElement; legal: boolean } | null = null;

  function setFromFen(fen: string) {
    const parts = fen.trim().split(/\s+/);
    board = new Array(64).fill(null);
    const rows = parts[0].split("/");
    for (let r8 = 0; r8 < 8; r8++) {
      let f = 0;
      for (const ch of rows[r8] ?? "") {
        if (ch >= "1" && ch <= "8") f += +ch;
        else { board[(7 - r8) * 8 + f] = { type: ch.toLowerCase() as PieceType, color: ch === ch.toUpperCase() ? "w" : "b" }; f++; }
      }
    }
    turn = parts[1] === "b" ? "b" : "w";
  }
  setFromFen(opts.fen);

  const buildFen = () => {
    const rows: string[] = [];
    for (let r = 7; r >= 0; r--) { let row = "", e = 0; for (let f = 0; f < 8; f++) { const p = board[r * 8 + f]; if (p) { if (e) { row += e; e = 0; } row += p.color === "w" ? p.type.toUpperCase() : p.type; } else e++; } if (e) row += e; rows.push(row); }
    return `${rows.join("/")} ${turn} - - 0 1`;
  };

  let lastChanged = -1;
  const cells: HTMLElement[] = [];
  for (let vr = 0; vr < 8; vr++) {
    for (let vf = 0; vf < 8; vf++) {
      const c = document.createElement("div");
      cells.push(c); wrap.appendChild(c);
    }
  }

  function draw() {
    for (let vr = 0; vr < 8; vr++) {
      for (let vf = 0; vf < 8; vf++) {
        const f = flipped ? 7 - vf : vf, r = flipped ? vr : 7 - vr;
        const i = r * 8 + f;
        const c = cells[vr * 8 + vf];
        const name = sqName(i);
        const p = board[i];
        const light = (f + r) % 2 === 1;
        const tone = opts.highlight?.(name);
        let cls = `sq ${light ? "l" : "d"}`;
        if (tone) cls += " " + tone;
        c.className = cls;
        c.dataset.sq = name;
        const pop = i === lastChanged ? " pop" : "";
        c.innerHTML = `${vf === 0 ? `<span class="coord" style="left:4%;top:3%">${r + 1}</span>` : ""}${vr === 7 ? `<span class="coord" style="right:5%;bottom:3%">${FILES[f]}</span>` : ""}${p ? `<span class="piece${pop}" data-color="${p.color}">${PIECE_SVG[p.color][p.type]}</span>` : ""}`;
      }
    }
  }
  const FILES = "abcdefgh";

  function place(i: number, piece: Piece | null) {
    board[i] = piece;
    lastChanged = i;
    emit();
  }
  function emit() {
    draw();
    lastChanged = -1;
    opts.onChange?.(buildFen());
  }

  function cellIndex(sq: string) {
    return (sq.charCodeAt(1) - 49) * 8 + (sq.charCodeAt(0) - 97);
  }

  // interactions
  let downAt: { i: number; moved: boolean } | null = null;
  wrap.addEventListener("pointerdown", (e) => {
    const cell = (e.target as HTMLElement).closest<HTMLElement>(".sq");
    if (!cell?.dataset.sq) return;
    const i = cellIndex(cell.dataset.sq);
    const pal = opts.paletteRef ? opts.paletteRef() : null;
    if (pal) {
      place(i, { ...pal });
      // one-shot placement: deselect the palette so clicks return to drag/clear mode
      document.dispatchEvent(new CustomEvent("formula:placed"));
      return;
    }
    const p = board[i];
    if (!p) return;
    // begin drag
    const ghost = document.createElement("div");
    ghost.className = "drag-ghost";
    ghost.innerHTML = PIECE_SVG[p.color][p.type];
    document.body.appendChild(ghost);
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const s = Math.min(64, rect.width);
    ghost.style.width = s + "px"; ghost.style.height = s + "px";
    moveGhost(e);
    dragging = { piece: p, from: i, ghost, legal: true };
    downAt = { i, moved: false };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp, { once: true });
    e.preventDefault();

    function moveGhost(ev: PointerEvent) { ghost.style.left = ev.clientX - s / 2 + "px"; ghost.style.top = ev.clientY - s / 2 + "px"; }
    function onMove(ev: PointerEvent) {
      if (downAt) downAt.moved = true;
      moveGhost(ev);
      wrap.querySelectorAll(".drop-ok").forEach((x) => x.classList.remove("drop-ok"));
      const under = document.elementFromPoint(ev.clientX, ev.clientY)?.closest<HTMLElement>(".sq");
      under?.classList.add("drop-ok");
    }
    function onUp(ev: PointerEvent) {
      window.removeEventListener("pointermove", onMove);
      ghost.remove();
      wrap.querySelectorAll(".drop-ok").forEach((x) => x.classList.remove("drop-ok"));
      const under = document.elementFromPoint(ev.clientX, ev.clientY)?.closest<HTMLElement>(".sq");
      const from = dragging?.from;
      dragging = null;
      if (under?.dataset.sq && from !== undefined) {
        const to = cellIndex(under.dataset.sq);
        if (to !== from) {
          const moving = board[from]!;
          board[from] = null; board[to] = moving; lastChanged = to; emit(); return;
        }
      }
      if (downAt && !downAt.moved && from !== undefined) {
        // click on occupied square clears (owner's law)
        board[from] = null; emit();
      } else if (from !== undefined) emit();
      downAt = null;
    }
  });

  draw();

  return {
    el: wrap,
    get flipped() { return flipped; },
    setFlipped(f: boolean) { flipped = f; draw(); },
    set(fen: string) { setFromFen(fen); draw(); },
    getFen: buildFen,
    get onChange() { return opts.onChange ?? null; },
    set onChange(fn: ((fen: string) => void) | null) { opts.onChange = fn ?? undefined; },
  };
}
