import { go } from "../lib/nav";
import { LESSONS } from "../lib/lessons";
import { getState, markLesson, checkBadges } from "../lib/store";
import { ICONS, observeReveals, confetti, springPop, toast } from "../lib/gfx";

export function mountLearn(root: HTMLElement, sub: string | undefined) {
  if (sub !== undefined) return mountLesson(root, +sub);
  return mountIndex(root);
}

function mountIndex(root: HTMLElement) {
  const s = getState();
  root.innerHTML = `
  <div class="view" style="overflow:auto">
    <div style="max-width:820px;margin:0 auto;padding:22px;display:flex;flex-direction:column;gap:16px">
      <header class="rv">
        <div class="label">The book · your learning theory, in order</div>
        <div class="row" style="justify-content:space-between;align-items:end;gap:12px;flex-wrap:wrap">
          <h1 class="h-block" style="font-size:28px;margin:4px 0 0">13 lessons, no fluff</h1>
          <div class="row"><span class="chip">${s.lessonsDone.length}/13 read</span>
            <div class="bar" style="width:140px"><i style="width:${Math.round((s.lessonsDone.length / 13) * 100)}%"></i></div>
          </div>
        </div>
      </header>
      <div class="lesson-list">
        ${LESSONS.map((l, i) => {
          const done = s.lessonsDone.includes(l.k);
          return `
          <button class="lesson-row rv" data-i="${i}">
            <span class="lr-num ${done ? "done" : ""}">${done ? ICONS.check : l.k}</span>
            <span class="lr-title">${l.title}<span class="lr-sub">${l.tags.map((t) => "#" + t).join("  ")}</span></span>
            <span class="lr-go">${done ? "re-read" : "read"}</span>
            <span class="lr-chev">${ICONS.chevron}</span>
          </button>`;
        }).join("")}
      </div>
      <p class="gate-line rv" style="text-align:center">${ICONS.flag} Check tactics first — this formula judges positions, not moves.</p>
    </div>
  </div>`;
  root.querySelectorAll<HTMLElement>(".lesson-row").forEach((r) => r.addEventListener("click", () => go("learn", r.dataset.i!)));
  observeReveals(root);
  return { dispose: () => { root.innerHTML = ""; } };
}

function mountLesson(root: HTMLElement, i: number) {
  const n = Math.max(0, Math.min(LESSONS.length - 1, i));
  const l = LESSONS[n];
  const s = getState();
  const done = s.lessonsDone.includes(l.k);

  root.innerHTML = `
  <div class="view" style="overflow:auto">
    <div style="max-width:700px;margin:0 auto;padding:20px;display:flex;flex-direction:column;gap:14px;min-height:100%">
      <div class="row rv" style="justify-content:space-between">
        <button class="btn small" id="back">← The book</button>
        <span class="chip">Lesson ${l.k} / 13</span>
      </div>
      <article class="panel lesson rv in" style="padding:clamp(20px,4vw,36px)">
        <div class="kicker">${l.tags.map((t) => "#" + t).join("  ")}</div>
        <h1 class="h-block" style="font-size:clamp(24px,4vw,32px);margin:8px 0 14px">${l.title}</h1>
        <p style="font-size:16.5px;line-height:1.85;color:var(--ink-soft)">${l.body}</p>
        ${l.quote ? `<blockquote>${l.quote}</blockquote>` : ""}
        <div class="row" style="justify-content:space-between;margin-top:26px;flex-wrap:wrap;gap:10px">
          <button class="btn ${done ? "" : "primary"}" id="mark">${done ? ICONS.check + " Read" : "Mark as read"}</button>
          <div class="dotbar" id="dots">${LESSONS.map((x) => `<span class="${x.k <= l.k ? "on" : ""}"></span>`).join("")}</div>
          <div class="row" style="gap:8px">
            ${n > 0 ? `<button class="btn" id="prev">${ICONS.left}</button>` : ""}
            ${n < LESSONS.length - 1 ? `<button class="btn primary" id="next">Next ${ICONS.right}</button>` : `<button class="btn primary" id="top">Start drilling →</button>`}
          </div>
        </div>
      </article>
    </div>
  </div>`;

  const mark = () => {
    if (markLesson(l.k)) {
      const el = root.querySelector<HTMLElement>("#mark")!;
      el.classList.add("primary");
      el.innerHTML = ICONS.check + " Read";
      springPop(el);
      const r = el.getBoundingClientRect();
      confetti(r.left + r.width / 2, r.top, 16);
      if (s.lessonsDone.length + 1 === LESSONS.length) toast("The whole book — badge unlocked");
    }
  };
  root.querySelector("#back")!.addEventListener("click", () => go("learn"));
  root.querySelector("#mark")!.addEventListener("click", mark);
  root.querySelector("#prev")?.addEventListener("click", () => go("learn", String(n - 1)));
  root.querySelector("#next")?.addEventListener("click", () => { markLesson(l.k); go("learn", String(n + 1)); });
  root.querySelector("#top")?.addEventListener("click", () => { checkBadges(); go("drill"); });
  return { dispose: () => { root.innerHTML = ""; } };
}
