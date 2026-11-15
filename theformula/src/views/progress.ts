import { go } from "../lib/nav";
import { getState, BADGES } from "../lib/store";
import { LESSONS } from "../lib/lessons";
import { ICONS, observeReveals } from "../lib/gfx";

export function mountProgress(root: HTMLElement) {
  const s = getState();
  const posLog = s.drill.log.filter((l) => !l.verdict);
  const errs = posLog.slice(-60).map((l) => l.err);
  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
  const first = avg(errs.slice(0, 20)), last = avg(errs.slice(-20));
  const improving = errs.length >= 24 && last < first - 0.05;
  const phases = (["opening", "middlegame", "endgame"] as const).map((ph) => {
    const xs = posLog.filter((l) => l.phase === ph);
    return { ph, n: xs.length, mae: avg(xs.map((l) => l.err)) };
  });
  const atlasN = Object.keys(s.atlasSeen).length;

  // sparkline path
  const W = 560, H = 120, PAD = 8;
  const pts = errs.slice(-40);
  const path = pts.length > 1
    ? pts.map((e, i) => {
        const x = PAD + (i / (pts.length - 1)) * (W - PAD * 2);
        const y = H - PAD - Math.min(1, e / 3) * (H - PAD * 2);
        return `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
      }).join(" ")
    : "";
  const area = path ? `${path} L${W - PAD} ${H - PAD} L${PAD} ${H - PAD} Z` : "";

  root.innerHTML = `
  <div class="view" style="overflow:auto">
    <div style="max-width:1080px;margin:0 auto;padding:22px;display:flex;flex-direction:column;gap:18px">
      <header class="rv">
        <div class="label">Progress · the map moving into your head</div>
        <div class="row" style="justify-content:space-between;align-items:end;flex-wrap:wrap;gap:10px">
          <h1 class="h-block" style="font-size:28px;margin-top:4px">${improving ? "You are getting sharper" : errs.length >= 24 ? "Holding the line" : "Every drill is a measurement"}</h1>
          ${improving ? `<span class="chip" style="color:var(--good);border-color:#bcd8c6;background:#eef6ef">mean |err| ${first.toFixed(2)} → ${last.toFixed(2)}</span>` : ""}
        </div>
      </header>

      <div class="stat-tiles rv">
        ${[
          [s.drill.n, "drills"], [s.drill.score, "score"], [s.drill.best, "best streak"],
          [s.drill.dead, "dead-on"], [`${atlasN}/18`, "atlas"], [`${s.lessonsDone.length}/13`, "lessons"],
        ].map(([v, l]) => `
        <div class="stat-tile"><b class="num-tween">${v}</b><span>${l}</span></div>`).join("")}
      </div>

      <div style="display:grid;grid-template-columns:minmax(300px,1.5fr) 1fr;gap:18px" class="prog-grid">
        <section class="panel rv" style="padding:18px">
          <div class="row" style="justify-content:space-between"><div class="label">Last ${pts.length} position drills · |err| in pawns</div><span class="chip">${errs.length ? "≤0.3 = dead-on" : ""}</span></div>
          ${pts.length > 1 ? `
          <svg viewBox="0 0 ${W} ${H}" class="spark" style="width:100%;margin-top:10px">
            <defs><linearGradient id="spg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stop-color="#c9832b" stop-opacity=".35"/><stop offset="1" stop-color="#c9832b" stop-opacity="0"/>
            </linearGradient></defs>
            <line x1="${PAD}" y1="${H - PAD - (0.3 / 3) * (H - PAD * 2)}" x2="${W - PAD}" y2="${H - PAD - (0.3 / 3) * (H - PAD * 2)}" stroke="#2f6b46" stroke-dasharray="3 4" stroke-width="1" opacity=".5"/>
            <path d="${area}" fill="url(#spg)"/>
            <path d="${path}" fill="none" stroke="#96551a" stroke-width="2.5" stroke-linecap="round" class="spark-line"/>
            ${pts.map((e, i) => {
              const x = PAD + (i / (pts.length - 1)) * (W - PAD * 2);
              const y = H - PAD - Math.min(1, e / 3) * (H - PAD * 2);
              return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.6" fill="${e <= 0.3 ? "#2f6b46" : e <= 0.7 ? "#c9832b" : "#a03c2a"}"/>`;
            }).join("")}
          </svg>` : `<div class="muted" style="padding:30px 0;text-align:center">Do a few position drills and your error trace will draw itself here.</div>`}
        </section>

        <section class="panel rv" style="padding:18px">
          <div class="label">Mean |err| by phase</div>
          <div style="display:flex;flex-direction:column;gap:12px;margin-top:14px">
            ${phases.map((p) => `
            <div>
              <div class="row" style="justify-content:space-between;font-size:12.5px"><span style="text-transform:capitalize">${p.ph}</span><b class="num-tween">${p.n ? p.mae.toFixed(2) : "—"}</b></div>
              <div class="bar" style="margin-top:5px"><i style="width:${p.n ? Math.min(100, (p.mae / 2) * 100) : 0}%;background:${p.mae <= 0.5 ? "var(--good)" : p.mae <= 1 ? "var(--accent-3)" : "var(--bad)"}"></i></div>
            </div>`).join("")}
          </div>
          <div class="muted" style="font-size:11.5px;margin-top:14px">Endgames forgive the least — the king and the passers carry the whole pile.</div>
        </section>
      </div>

      <section class="panel rv" style="padding:18px">
        <div class="row" style="justify-content:space-between"><div class="label">Recent drills</div><button class="linklike" id="goD">Drill more →</button></div>
        <div class="recent">
          ${[...s.drill.log].reverse().slice(0, 10).map((l) => `
          <div class="recent-row">
            <span class="rc-dot" style="background:${l.err <= 0.3 ? "var(--good)" : l.verdict ? (l.dead ? "var(--good)" : "var(--bad)") : l.err <= 0.7 ? "var(--accent-3)" : "var(--bad)"}"></span>
            <span class="rc-phase" style="text-transform:lowercase">${l.phase}</span>
            <span class="rc-g">${l.verdict ? "verdict" : fmtS(l.guess) + " → " + fmtS(l.truth)}</span>
            <b class="rc-e">${l.verdict ? (l.dead ? "right" : "wrong") : l.err.toFixed(2)}</b>
            <span class="rc-t">${timeAgo(l.t)}</span>
          </div>`).join("") || `<div class="muted" style="padding:14px 0">Nothing yet — the first drill starts the record.</div>`}
        </div>
      </section>

      <section class="panel rv" style="padding:18px;margin-bottom:20px">
        <div class="label">Lifetime</div>
        <div class="row" style="gap:8px;margin-top:10px;flex-wrap:wrap">
          <span class="chip">${BADGES.filter((b) => s.badges[b.id]).length}/${BADGES.length} badges</span>
          <span class="chip">${LESSONS.length ? `${s.lessonsDone.length}/13 lessons` : ""}</span>
          <span class="chip">streak ${s.streak}d</span>
          <span class="chip">drilling since ${new Date(s.startedAt).toLocaleDateString()}</span>
        </div>
      </section>
    </div>
  </div>`;

  function fmtS(v: number) { return (v > 0 ? "+" : "") + (Math.round(v * 10) / 10).toFixed(1); }
  function timeAgo(t: number) {
    const d = Date.now() - t;
    if (d < 60000) return "just now";
    if (d < 3600000) return Math.floor(d / 60000) + "m";
    if (d < 86400000) return Math.floor(d / 3600000) + "h";
    return Math.floor(d / 86400000) + "d";
  }
  void ICONS;
  root.querySelector("#goD")!.addEventListener("click", () => go("drill"));
  observeReveals(root);
  return { dispose: () => { root.innerHTML = ""; } };
}
