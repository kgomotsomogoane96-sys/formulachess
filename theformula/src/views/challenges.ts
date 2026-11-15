import { go } from "../lib/nav";
import { getState, BADGES, DAILIES, claimDaily, onChange } from "../lib/store";
import { LESSONS } from "../lib/lessons";
import { ICONS, observeReveals, confetti, springPop, toast } from "../lib/gfx";

export function mountChallenges(root: HTMLElement) {
  function render() {
    const st = getState();
    root.innerHTML = `
    <div class="view" style="overflow:auto">
      <div style="max-width:1080px;margin:0 auto;padding:22px;display:grid;grid-template-columns:minmax(300px,420px) 1fr;gap:20px;align-items:start" class="chal-grid">
        <div style="display:flex;flex-direction:column;gap:16px;min-width:0">
          <section class="panel rv" style="padding:20px">
            <div class="label">Today · resets at midnight</div>
            <div style="display:flex;flex-direction:column;gap:10px;margin-top:12px">
              ${DAILIES.map((d) => {
                const [a, b] = d.progress(st);
                const claimed = st.day.claimed.includes(d.id);
                const done = d.test(st);
                return `
                <div class="dailycard ${done ? "done" : ""} ${claimed ? "claimed" : ""}">
                  <span class="dc-check">${claimed ? ICONS.check : ""}</span>
                  <div class="dc-body"><b>${d.name}</b>
                    <div class="bar mini" style="margin-top:5px"><i style="width:${Math.round((a / b) * 100)}%"></i></div>
                  </div>
                  ${claimed ? `<span class="dc-pts claimed">+${d.pts}</span>`
                    : done ? `<button class="btn small primary dc-claim" data-d="${d.id}">Claim +${d.pts}</button>`
                    : `<span class="dc-pts">+${d.pts}</span>`}
                </div>`;
              }).join("")}
            </div>
          </section>

          <section class="panel rv" style="padding:20px">
            <div class="label">Streak</div>
            <div class="row" style="margin-top:12px;align-items:center;gap:14px">
              <span class="flame-big ${st.streak > 0 ? "lit" : ""}">${ICONS.flame}</span>
              <div>
                <div style="font-family:var(--font-mono);font-size:34px;font-weight:800;line-height:1">${st.streak} <span style="font-size:14px;font-weight:500;color:var(--ink-soft)">day${st.streak === 1 ? "" : "s"}</span></div>
                <div class="muted" style="font-size:12px">best ${st.drill.best} · one drill keeps it alive</div>
              </div>
            </div>
            <div class="bar" style="margin-top:14px"><i style="width:${Math.min(100, (st.day.drills / st.goal) * 100)}%"></i></div>
            <div class="row" style="justify-content:space-between;margin-top:6px"><span class="muted" style="font-size:11.5px">today: ${st.day.drills}/${st.goal}</span><button class="linklike" id="goDrill">Drill →</button></div>
          </section>

          <section class="panel rv" style="padding:20px">
            <div class="label">How points work</div>
            <ul class="points-list">
              <li><b>Dead-on call</b> (≤ 0.3 pawns) <span>+2</span></li>
              <li><b>In the band</b> (≤ 0.7) <span>+1</span></li>
              <li><b>Verdict correct</b> <span>+2</span></li>
              <li><b>Daily challenge</b> <span>+2</span></li>
            </ul>
            <p class="muted" style="font-size:12px;line-height:1.6;margin:10px 0 0">Score climbs the study-hall board. Nothing here is guessable — every point is a measurement you made yourself.</p>
          </section>
        </div>

        <section class="panel rv" style="padding:20px">
          <div class="row" style="justify-content:space-between">
            <div><div class="label">Badges</div><div class="h-block" style="font-size:20px;margin-top:2px">${Object.keys(st.badges).length} of ${BADGES.length} earned</div></div>
            <span class="chip">${LESSONS.length ? `${st.lessonsDone.length}/13 lessons` : ""}</span>
          </div>
          <div class="badge-grid">
            ${BADGES.map((b, i) => {
              const won = !!st.badges[b.id];
              return `
              <div class="badge ${won ? "won" : ""}" style="--d:${i * 60}ms">
                <span class="badge-medal">${ICONS.medal}</span>
                <b>${b.name}</b>
                <span>${b.desc}</span>
                ${won ? `<span class="badge-date">earned ${new Date(st.badges[b.id]).toLocaleDateString()}</span>` : `<span class="badge-date locked">locked</span>`}
              </div>`;
            }).join("")}
          </div>
          <button class="btn" id="toProgress" style="margin-top:16px">See your progress →</button>
        </section>
      </div>
    </div>`;

    root.querySelectorAll<HTMLButtonElement>(".dc-claim").forEach((b) =>
      b.addEventListener("click", () => {
        if (claimDaily(b.dataset.d!)) {
          springPop(b);
          const r = b.getBoundingClientRect();
          confetti(r.left + r.width / 2, r.top, 18);
          toast("+2 claimed");
        }
      }));
    root.querySelector("#goDrill")!.addEventListener("click", () => go("drill"));
    root.querySelector("#toProgress")!.addEventListener("click", () => go("progress"));
    observeReveals(root);
  }

  render();
  const un = onChange(render);
  return { dispose: () => { un(); root.innerHTML = ""; } };
}
