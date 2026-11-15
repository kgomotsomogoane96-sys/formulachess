import { type Data, computeReceipt, fmtP, parseFen } from "../lib/core";
import { createBoard, type BoardHandle } from "../lib/board";
import { go } from "../lib/nav";
import { addDrill, getState } from "../lib/store";
import { ICONS, toast, observeReveals, confetti, springPop, tweenNumber } from "../lib/gfx";

type Mode = "position" | "verdict";
const VERDICTS = ["level", "edge", "better", "winning"] as const;

export function mountDrill(root: HTMLElement, data: Data, initial: Mode) {
  let mode: Mode = initial;
  let order: number[] = [];
  let idx = -1;
  let revealed = false;
  let bh: BoardHandle;
  let current = data.drills[0];

  root.innerHTML = `
  <div class="view" style="overflow:auto">
    <div class="drill-page" style="max-width:1140px;margin:0 auto;padding:20px;display:flex;flex-direction:column;gap:16px">
      <header class="rv" style="display:flex;flex-direction:column;gap:12px">
        <div class="row" style="justify-content:space-between;flex-wrap:wrap;gap:10px">
          <div>
            <div class="label">Drill · estimate first, reveal second</div>
            <div class="row" style="margin-top:6px">
              <div class="seg" id="modes">
                <button data-m="position" class="active">Position</button>
                <button data-m="verdict">Verdict</button>
              </div>
            </div>
          </div>
          <div class="row" style="gap:8px;flex-wrap:wrap">
            <span class="chip stat-chip" id="ch-streak">streak <b>0</b></span>
            <span class="chip stat-chip">score <b id="ch-score">0</b></span>
            <span class="chip stat-chip">today <b id="ch-today">0</b></span>
          </div>
        </div>
      </header>

      <div class="drill-grid">
        <div style="display:flex;flex-direction:column;gap:14px;min-width:0">
          <div id="db" class="rv"></div>
          <div class="panel rv" style="padding:18px" id="inputCard">
            <div class="label" id="inputLabel">Your position estimate (pawns, white − black)</div>
            <div id="posInput" class="row" style="justify-content:center;margin-top:12px">
              <input id="guess" type="number" step="0.1" class="field money" style="max-width:180px" placeholder="±0.0" />
            </div>
            <div id="verInput" style="display:none;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:12px">
              ${VERDICTS.map((v) => `<button class="vbtn" data-v="${v}">${v}</button>`).join("")}
            </div>
            <div class="row" style="justify-content:center;gap:10px;margin-top:16px">
              <button class="btn primary" id="reveal" style="min-width:120px">Reveal</button>
              <button class="btn" id="next">Next position</button>
              <button class="btn small" id="toBoard">Open board</button>
            </div>
            <div id="feedback" style="min-height:30px;margin-top:12px;font-size:13.5px;text-align:center;color:var(--ink-soft)"></div>
          </div>
        </div>

        <div style="display:flex;flex-direction:column;gap:14px;min-width:0">
          <div class="panel rv" style="flex:1;display:flex;flex-direction:column;min-height:300px">
            <div class="row" style="justify-content:space-between;padding:12px 18px;border-bottom:1px solid var(--line)">
              <span class="h-block" style="font-size:15px">Receipt</span>
              <span id="rmeta" class="muted" style="font-size:11px;font-style:italic">hidden until you commit</span>
            </div>
            <div id="receipt" class="receipt" style="flex:1;overflow:auto;padding:12px 18px 18px"></div>
          </div>
        </div>
      </div>
      <p class="gate-line rv" style="text-align:center;margin:4px 0 20px">${ICONS.flag} Check tactics first — this formula judges positions, not moves.</p>
    </div>
  </div>`;

  const guessEl = root.querySelector<HTMLInputElement>("#guess")!;
  const receiptEl = root.querySelector<HTMLElement>("#receipt")!;
  const fb = root.querySelector<HTMLElement>("#feedback")!;
  const posInput = root.querySelector<HTMLElement>("#posInput")!;
  const verInput = root.querySelector<HTMLElement>("#verInput")!;
  const inputLabel = root.querySelector<HTMLElement>("#inputLabel")!;
  const revealBtn = root.querySelector<HTMLButtonElement>("#reveal")!;

  function pickNext() {
    if (!order.length) order = data.drills.map((_, i) => i).sort(() => Math.random() - 0.5);
    const k = order.findIndex((i) => i !== -1 && i !== idx);
    idx = order[k === -1 ? 0 : k];
    order[k === -1 ? 0 : k] = -1;
    if (!order.some((i) => i !== -1)) order = [];
    current = data.drills[idx];
  }

  function syncChips() {
    const s = getState();
    root.querySelector<HTMLElement>("#ch-streak b")!.textContent = String(s.drill.streak);
    root.querySelector<HTMLElement>("#ch-score")!.textContent = String(s.drill.score);
    root.querySelector<HTMLElement>("#ch-today")!.textContent = String(s.day.drills);
  }

  function show() {
    bh.set(current.fen);
    revealed = false;
    receiptEl.innerHTML = "";
    fb.textContent = mode === "position" ? "Judge the position. Then press Reveal." : "Call the verdict: level, edge, better, or winning.";
    root.querySelector<HTMLElement>("#rmeta")!.textContent = "hidden until you commit";
    guessEl.value = "";
    revealBtn.disabled = false;
    inputLabel.textContent = mode === "position" ? "Your position estimate (pawns, white − black)" : "Your verdict call";
    posInput.style.display = mode === "position" ? "flex" : "none";
    verInput.style.display = mode === "verdict" ? "grid" : "none";
    if (mode === "position") guessEl.focus();
  }

  bh = createBoard({ fen: current.fen, interactive: false });
  root.querySelector<HTMLElement>("#db")!.appendChild(bh.el);

  function setMode(m: Mode) {
    mode = m;
    root.querySelectorAll<HTMLElement>("#modes button").forEach((b) => b.classList.toggle("active", b.dataset.m === m));
    show();
  }
  root.querySelector<HTMLElement>("#modes")!.addEventListener("click", (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>("button");
    if (b?.dataset.m) setMode(b.dataset.m as Mode);
  });

  function celebrate(kind: "dead" | "streak" | "goal" | "badges", x?: number, y?: number) {
    if (kind === "dead") confetti(x ?? innerWidth / 2, y ?? innerHeight / 2, 14);
    else confetti(x ?? innerWidth / 2, y ?? innerHeight * 0.35, kind === "goal" ? 60 : 30, kind !== "badges");
  }

  function doReveal(guess: number, verdict?: string) {
    if (revealed) return;
    revealed = true;
    revealBtn.disabled = true;
    const { board, turn } = parseFen(current.fen);
    const rec = computeReceipt(board, turn, data.pst, "auto");
    const rect = root.querySelector<HTMLElement>("#receipt")!.getBoundingClientRect();
    const cx = rect.left + rect.width / 2, cy = rect.top + 80;

    let dead = false, err = 0, errTruth = 0, inBand = false;
    if (mode === "position") {
      err = Math.abs(guess - rec.position);
      errTruth = Math.abs(guess - current.truth_pawns);
      dead = err <= 0.3;
      inBand = err <= 0.7;
    } else {
      dead = verdict === rec.verdict.word;
      inBand = dead;
      err = dead ? 0 : 1;
      errTruth = err;
    }
    const res = addDrill({ err, errTruth, guess, truth: current.truth_pawns, phase: rec.phase, dead, verdict: mode === "verdict" });
    syncChips();
    if (dead) celebrate("dead", cx, cy);
    if (res.milestone) { celebrate("streak"); toast(`Streak ${getState().drill.streak} — on fire`); }
    if (res.goalHit) { celebrate("goal"); toast("Daily goal met — the map is yours"); }
    if (res.badges.length) { celebrate("badges"); toast(res.badges.map((id) => id).join(", ") && "Badge unlocked — see Challenges"); }

    const band = mode === "verdict"
      ? (dead ? `Correct call. ${rec.position >= 0 ? "White" : "Black"} has ${rec.verdict.word}.` : `It reads ${rec.verdict.word.toLowerCase()} — ${rec.position >= 0 ? "white" : "black"} ${fmtP(rec.position)}.`)
      : (err <= 0.3 ? "Dead on." : err <= 0.7 ? "Close — within the noise band." : err <= 1.5 ? "Off — re-count the piles." : "Far — rebuild pile by pile.");
    fb.innerHTML = `<b style="color:${dead ? "var(--good)" : inBand ? "var(--accent-2)" : "var(--bad)"}">${band}</b><br><span class="muted" style="font-size:12px">you ${mode === "position" ? fmtP(guess) : verdict} · formula ${fmtP(rec.position)} · engine ${fmtP(current.truth_pawns)}</span>`;

    const mk = (title: string, lines: typeof rec.white.lines, pile: number) => `
      <div class="receipt-group" style="padding:10px 0 6px">
        <h3>${title}</h3>
        <div style="margin-top:6px">${lines.map((l) => `<div class="pile-row"><span class="notation">${l.label}</span><span class="val">= ${fmtP(l.value)}</span></div>`).join("")}</div>
        <div class="pile-total"><span>${title} pile</span><span>${fmtP(pile, false)}</span></div>
      </div>`;
    const r2 = document.createElement("div");
    r2.innerHTML = `
      <div class="row" style="justify-content:space-between;padding:6px 0 10px;gap:8px;flex-wrap:wrap">
        <div><span class="label">position</span><div class="bigpos num-tween" style="font-family:var(--font-mono);font-size:30px;font-weight:800">+0.0</div></div>
        <span class="verdict-chip ${rec.verdict.cls}" style="align-self:center">${rec.verdict.word}</span>
      </div>
      <div class="tempo-row"><span>engine truth (measured)</span><span>${fmtP(current.truth_pawns)}</span></div>
      ${mk("White", rec.white.lines, rec.white.pile - (rec.tempoFor === "w" ? rec.tempo : 0))}
      ${rec.tempoFor === "w" ? `<div class="tempo-row"><span>tempo</span><span>${fmtP(rec.tempo)}</span></div>` : ""}
      ${mk("Black", rec.black.lines, rec.black.pile - (rec.tempoFor === "b" ? rec.tempo : 0))}
      ${rec.tempoFor === "b" ? `<div class="tempo-row"><span>tempo</span><span>${fmtP(rec.tempo)}</span></div>` : ""}
      <div class="position-line"><span>POSITION</span><span class="num">${fmtP(rec.position)}</span></div>
      <p class="gate-line" style="margin-top:12px">${ICONS.flag} Check tactics first — this formula judges positions, not moves.</p>`;
    receiptEl.innerHTML = "";
    receiptEl.appendChild(r2);
    const bigpos = receiptEl.querySelector<HTMLElement>(".bigpos")!;
    tweenNumber(bigpos, 0, rec.position, (v) => fmtP(v), 500);
    root.querySelector<HTMLElement>("#rmeta")!.textContent = `${current.name} · ${rec.phase}`;
    observeReveals(root);
  }

  revealBtn.addEventListener("click", () => {
    if (mode === "position") {
      const g = parseFloat(guessEl.value);
      if (!Number.isFinite(g)) { toast("write a number first"); guessEl.focus(); return; }
      doReveal(g);
    }
  });
  root.querySelectorAll<HTMLElement>(".vbtn").forEach((b) =>
    b.addEventListener("click", () => {
      if (revealed) return;
      springPop(b);
      doReveal(0, b.dataset.v);
    }));
  root.querySelector<HTMLElement>("#next")!.addEventListener("click", () => { pickNext(); show(); });
  root.querySelector<HTMLElement>("#toBoard")!.addEventListener("click", () => go("evaluate"));
  guessEl.addEventListener("keydown", (e) => { if (e.key === "Enter" && !revealed) revealBtn.click(); });

  pickNext();
  show();
  syncChips();
  observeReveals(root);
  return { dispose: () => { root.innerHTML = ""; } };
}
