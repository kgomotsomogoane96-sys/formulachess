import { type Data } from "../lib/core";
import { go } from "../lib/nav";
import { MASCOT, ICONS, confetti, observeReveals, springPop } from "../lib/gfx";
import { getState, greeting, leaderboard, BADGES, DAILIES, markAtlas } from "../lib/store";
import { LESSONS } from "../lib/lessons";

const PHASES = [
  { p: "opening", label: "Opening", icon: "grid" },
  { p: "middlegame", label: "Middlegame", icon: "board" },
  { p: "endgame", label: "Endgame", icon: "crown" },
] as const;

export function mountHome(root: HTMLElement, data: Data) {
  const s = getState();
  const lb = leaderboard();
  const lbTop = lb.slice(0, 5);
  const youRank = lb.findIndex((r) => r.you) + 1;
  const nextLesson = LESSONS.find((l) => !s.lessonsDone.includes(l.k));
  const lessonProgress = s.lessonsDone.length / LESSONS.length;
  const frac = Math.min(1, s.day.drills / s.goal);

  const skills = [
    { name: "Map reading", meta: `${Object.keys(s.atlasSeen).length}/18 charts`, icon: ICONS.grid, tint: "sage", act: () => go("atlas") },
    { name: "Pile counting", meta: s.drill.n ? `MAE ${(s.drill.maeSum / s.drill.n).toFixed(2)}` : "untouched", icon: ICONS.chart, tint: "rust", act: () => go("drill") },
    { name: "Verdict calling", meta: `${s.drill.dead} dead-on`, icon: ICONS.flag, tint: "amber", act: () => go("drill", "verdict") },
    { name: "Tempo", meta: "lesson 7", icon: ICONS.spark, tint: "slate", act: () => go("learn", "6") },
    { name: "Mirroring", meta: "lesson 5", icon: ICONS.flip, tint: "sage", act: () => go("learn", "4") },
    { name: "Phase sense", meta: "lesson 6", icon: ICONS.board, tint: "amber", act: () => go("learn", "5") },
  ];

  root.innerHTML = `
  <div class="view home-view">
    <div class="home-grid">
      <div class="home-main">
        <!-- hero -->
        <section class="panel hero rv">
          <div class="hero-copy">
            <span class="kicker">The formula · study desk</span>
            <h1>${greeting()}, <span class="hname">${s.name}</span> <span class="wave" style="color:var(--accent-2);display:inline-block">${ICONS.hand}</span></h1>
            <p>${frac >= 1 ? "Daily goal met — the map is moving into your head. Keep the streak alive." : `One pile closer to a measured mind. ${s.goal - s.day.drills} drill${s.goal - s.day.drills === 1 ? "" : "s"} to today's goal.`}</p>
            <div class="row" style="margin-top:16px;flex-wrap:wrap">
              <button class="btn primary" id="cta1">${s.day.drills ? "Keep drilling" : "Start drilling"} →</button>
              <button class="btn" id="cta2">Open the board</button>
            </div>
            <div class="hero-meta row" style="margin-top:14px">
              <span class="chip flame-chip">${ICONS.flame}<b id="streakN">${s.streak}</b> day${s.streak === 1 ? "" : "s"}</span>
              <span class="chip">${ICONS.medal} best ${s.drill.best}</span>
              <span class="chip">${ICONS.star} ${s.drill.score} pts</span>
            </div>
          </div>
          <div class="hero-scene" id="mascotBtn" title="Walnut the knight">
            ${MASCOT}
          </div>
        </section>

        <!-- continue -->
        <section class="home-section rv">
          <div class="section-head"><span class="h-block" style="font-size:16px">Continue learning</span><button class="linklike" id="allLessons">See all →</button></div>
          <div class="continue-row">
            <div class="continue-card" id="contLesson">
              <div class="cc-icon" style="background:#f6e3c4;color:#96551a">${ICONS.book}</div>
              <div class="cc-body">
                <div class="cc-title">${nextLesson ? `Lesson ${nextLesson.k} — ${nextLesson.title}` : "The whole book, read"}</div>
                <div class="cc-sub">${s.lessonsDone.length} / 13 lessons</div>
                <div class="bar"><i style="width:${Math.round(lessonProgress * 100)}%"></i></div>
              </div>
              <button class="btn small primary cc-go">${nextLesson ? "Resume" : "Review"}</button>
            </div>
            <div class="continue-card" id="contDrill">
              <div class="cc-icon" style="background:#efe0d2;color:#63361f">${ICONS.target}</div>
              <div class="cc-body">
                <div class="cc-title">Position drill</div>
                <div class="cc-sub">${s.drill.n} drills · streak ${s.drill.streak}</div>
                <div class="bar"><i style="width:${Math.round(frac * 100)}%"></i></div>
              </div>
              <button class="btn small primary cc-go">Start</button>
            </div>
          </div>
        </section>

        <!-- skills -->
        <section class="home-section rv">
          <div class="section-head"><span class="h-block" style="font-size:16px">Build your skills</span></div>
          <div class="skills-grid">
            ${skills.map((sk, i) => `
            <button class="skill-tile" data-skill="${i}">
              <span class="st-icon ${sk.tint}">${sk.icon}</span>
              <span class="st-body"><b>${sk.name}</b><span>${sk.meta}</span></span>
              <span class="st-arrow">${ICONS.chevron}</span>
            </button>`).join("")}
          </div>
        </section>

        <!-- atlas strip -->
        <section class="home-section rv" style="margin-bottom:24px">
          <div class="section-head"><span class="h-block" style="font-size:16px">The atlas</span><button class="linklike" id="openAtlas">All 384 values →</button></div>
          <div class="atlas-strip">
            ${PHASES.map((p) => {
              const st = data.pst.phases[p.p].stats as Record<string, unknown>;
              return `
              <button class="atlas-card" data-phase="${p.p}">
                <div class="ac-top"><b>${p.label}</b><span class="ac-r">r² ${st.r2}</span></div>
                <div class="ac-dots" data-dots="${p.p}"></div>
                <div class="ac-foot"><span>${st.n_verify} verification positions</span><span>MAE ${st.mae_pawns}</span></div>
              </button>`;
            }).join("")}
          </div>
        </section>
      </div>

      <!-- rail -->
      <aside class="home-rail">
        <section class="panel rail-card rv">
          <div class="rail-head"><span class="h-block" style="font-size:15px">Your daily goal</span></div>
          <div class="goal-wrap">
            <svg viewBox="0 0 120 120" class="goal-ring">
              <circle cx="60" cy="60" r="50" class="ring-bg"/>
              <circle cx="60" cy="60" r="50" class="ring-fg" id="ringFg"/>
            </svg>
            <div class="goal-center"><b id="goalNum">${s.day.drills}</b><span>of ${s.goal}</span><em>drills today</em></div>
            <div class="goal-side">
              <div class="goal-stat"><b class="flame">${ICONS.flame}</b><b>${s.streak}</b><span>day streak</span></div>
              <div class="goal-stat"><b>${s.drill.best}</b><span>best streak</span></div>
            </div>
          </div>
          <div class="day-dots" id="dayDots"></div>
        </section>

        <section class="panel rail-card rv">
          <div class="rail-head"><span class="h-block" style="font-size:15px">Study hall</span><span class="chip">this week</span></div>
          <div class="lb-list">
            ${lbTop.map((r, i) => `
            <div class="lb-row ${r.you ? "you" : ""}" style="--d:${i * 70}ms">
              <span class="lb-rank ${i === 0 ? "gold" : i === 1 ? "silver" : i === 2 ? "bronze" : ""}">${i + 1}</span>
              <span class="lb-ava" style="background:${["#c9832b", "#96551a", "#7f6a4d", "#63361f", "#a03c2a"][i]}">${r.name[0]}</span>
              <span class="lb-name">${r.you ? "You" : r.name}</span>
              <b class="lb-score">${r.score}</b>
            </div>`).join("")}
          </div>
          <div class="lb-you-line">You rank #${youRank} of ${lb.length}</div>
        </section>

        <section class="panel rail-card rv">
          <div class="rail-head"><span class="h-block" style="font-size:15px">Today's challenges</span><button class="linklike" id="goCh">All →</button></div>
          ${DAILIES.map((d) => {
            const [a, b] = d.progress(s);
            const claimed = s.day.claimed.includes(d.id);
            const done = d.test(s);
            return `<div class="chal-row ${done ? "done" : ""} ${claimed ? "claimed" : ""}">
              <span class="chal-check">${claimed ? ICONS.check : done ? ICONS.spark : ""}</span>
              <div class="chal-body"><b>${d.name}</b><div class="bar mini"><i style="width:${Math.round((a / b) * 100)}%"></i></div></div>
              <span class="chal-pts">${claimed ? "+" + d.pts + " ✓" : "+" + d.pts}</span>
            </div>`;
          }).join("")}
        </section>

        <section class="panel rail-card rv" style="margin-bottom:24px">
          <div class="rail-head"><span class="h-block" style="font-size:15px">Badges</span><span class="chip">${Object.keys(s.badges).length}/${BADGES.length}</span></div>
          <div class="badge-strip">
            ${BADGES.slice(0, 4).map((b) => `<span class="bs ${s.badges[b.id] ? "won" : ""}" title="${b.name} — ${b.desc}">${ICONS.medal}</span>`).join("")}
          </div>
          <button class="linklike" id="goCh2" style="margin-top:8px">All badges →</button>
        </section>
      </aside>
    </div>
  </div>`;

  // ---- interactions ----
  root.querySelector("#cta1")!.addEventListener("click", () => go("drill"));
  root.querySelector("#cta2")!.addEventListener("click", () => go("evaluate"));
  root.querySelector("#allLessons")!.addEventListener("click", () => go("learn"));
  root.querySelector("#contLesson")!.querySelector(".cc-go")!.addEventListener("click", () => go("learn", nextLesson ? String(LESSONS.indexOf(nextLesson)) : "0"));
  root.querySelector("#contDrill")!.querySelector(".cc-go")!.addEventListener("click", () => go("drill"));
  root.querySelector("#openAtlas")!.addEventListener("click", () => go("atlas"));
  root.querySelector("#goCh")!.addEventListener("click", () => go("challenges"));
  root.querySelector("#goCh2")!.addEventListener("click", () => go("challenges"));
  root.querySelectorAll<HTMLElement>(".skill-tile").forEach((t) => t.addEventListener("click", () => skills[+t.dataset.skill!].act()));
  root.querySelectorAll<HTMLElement>(".atlas-card").forEach((c) =>
    c.addEventListener("click", () => { markAtlas("home-" + c.dataset.phase!); go("atlas"); }));

  // mascot
  const mbtn = root.querySelector<HTMLElement>("#mascotBtn")!;
  mbtn.addEventListener("click", () => {
    springPop(mbtn);
    const r = mbtn.getBoundingClientRect();
    confetti(r.left + r.width / 2, r.top + r.height / 2, 14);
  });

  // goal ring
  const ring = root.querySelector<SVGCircleElement>("#ringFg")!;
  const C = 2 * Math.PI * 50;
  ring.style.strokeDasharray = String(C);
  ring.style.strokeDashoffset = String(C);
  requestAnimationFrame(() => requestAnimationFrame(() => { ring.style.strokeDashoffset = String(C * (1 - frac)); }));

  // mini heat dots on atlas cards
  for (const c of root.querySelectorAll<HTMLElement>("[data-dots]")) {
    const ph = c.dataset.dots! as "opening" | "middlegame" | "endgame";
    const rec = data.pst.phases[ph].pieces;
    let html = "";
    for (let i = 0; i < 64; i++) {
      // show a 8×8 of the knight map
      const v = rec.N.squares["abcdefgh"[i & 7] + ((i >> 3) + 1)];
      const val = v ?? rec.N.base_pawns;
      const dev = val - rec.N.base_pawns;
      const t = Math.min(1, Math.abs(dev) / 1.4);
      const col = dev >= 0 ? `rgba(201,131,43,${0.25 + t * 0.75})` : `rgba(98,108,130,${0.25 + t * 0.6})`;
      html += `<i style="background:${col}"></i>`;
    }
    c.innerHTML = html;
  }

  observeReveals(root);
  return { dispose: () => { root.innerHTML = ""; } };
}
