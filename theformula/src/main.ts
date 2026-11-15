import "./style.css";
import { loadData, type Data } from "./lib/core";
import { ICONS, toast } from "./lib/gfx";
import { go, onRoute, parseHash } from "./lib/nav";
import { LESSONS } from "./lib/lessons";
import { getState, checkBadges } from "./lib/store";
import { mountHome } from "./views/home";
import { mountLearn } from "./views/learnPage";
import { mountDrill } from "./views/drillPage";
import { mountMap } from "./views/atlasPage";
import { mountEvaluate } from "./views/evaluatePage";
import { mountChallenges } from "./views/challenges";
import { mountProgress } from "./views/progress";

// ---------- gate (unchanged) ----------
const EXPECTED = "3748fbd132cd645a37562a4dd529c91442bfa156adcf96a311c1e1ff98f46636";
const GATE_LS = "formula.gate";
async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s.trim().toLowerCase()));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
function mountGate(onOpen: () => void) {
  const gate = document.createElement("div");
  gate.className = "gate";
  gate.innerHTML = `
    <div class="gate-card">
      <div style="display:grid;place-items:center;margin-bottom:18px"><div class="gate-seal">${ICONS.crown}</div></div>
      <div class="gate-mark">THE FORMULA</div>
      <div class="gate-sub">a learning app for measured minds</div>
      <div class="panel" style="margin-top:26px;padding:22px;text-align:left">
        <div class="label" style="margin-bottom:8px">Study key</div>
        <form id="gateform">
          <input id="gatekey" class="field" type="password" placeholder="Enter the key" autocomplete="off" style="letter-spacing:.1em" />
          <button class="btn primary" style="width:100%;justify-content:center;margin-top:10px" type="submit">Open the book</button>
        </form>
        <p id="gatemsg" style="display:none;color:var(--bad);font-size:12px;margin:10px 0 0">That key did not open anything.</p>
      </div>
      <p class="muted" style="font-size:11px;font-style:italic;margin-top:18px">The formula judges the map; tactics judge the move.</p>
    </div>`;
  document.body.appendChild(gate);
  const form = gate.querySelector<HTMLFormElement>("#gateform")!;
  const input = gate.querySelector<HTMLInputElement>("#gatekey")!;
  setTimeout(() => input.focus(), 120);
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const h = await sha256Hex(input.value);
    if (h === EXPECTED) {
      localStorage.setItem(GATE_LS, EXPECTED);
      gate.classList.add("out");
      setTimeout(() => { gate.remove(); onOpen(); }, 420);
    } else {
      const msg = gate.querySelector<HTMLElement>("#gatemsg")!;
      msg.style.display = "block";
      const card = gate.querySelector<HTMLElement>(".gate-card")!;
      card.classList.remove("gate-shake"); void card.offsetWidth; card.classList.add("gate-shake");
    }
  });
}

// ---------- shell ----------
const NAV = [
  { key: "home", label: "Home", icon: ICONS.home },
  { key: "learn", label: "Learn", icon: ICONS.book },
  { key: "drill", label: "Drill", icon: ICONS.target },
  { key: "atlas", label: "Atlas", icon: ICONS.grid },
  { key: "evaluate", label: "Evaluate", icon: ICONS.board },
  { key: "challenges", label: "Challenges", icon: ICONS.trophy },
  { key: "progress", label: "Progress", icon: ICONS.chart },
];
const MOBILE_NAV = ["home", "learn", "drill", "atlas"] as const;

function mountApp(data: Data) {
  const app = document.getElementById("app")!;
  const s = getState();
  app.innerHTML = `
  <div class="shell">
    <aside class="sidebar">
      <div class="brand-sb">
        <span class="brand-seal">${ICONS.crown}</span>
        <div><div class="brand-name">THE FORMULA</div><div class="brand-tag">map · piles · verdict</div></div>
      </div>
      <nav class="sidenav" id="sidenav">
        ${NAV.map((n) => `<button class="navitem" data-k="${n.key}"><span class="ni-icon">${n.icon}</span>${n.label}</button>`).join("")}
      </nav>
      <div class="sb-plus">
        <div class="sp-card">
          <div class="row" style="gap:8px;align-items:center"><span class="sp-ico">${ICONS.grid}</span><b>The atlas</b></div>
          <p>384 squares × 3 phases, measured by the engine. Read them all and earn the Cartographer badge.</p>
          <button class="btn small primary" data-k="atlas" style="width:100%;justify-content:center">Open atlas</button>
        </div>
      </div>
      <div class="sb-user">
        <span class="u-ava">${s.name[0]}</span>
        <div><b>${s.name}</b><span>level ${Math.min(99, 1 + Math.floor(s.drill.n / 10))} · ${s.drill.n} drills</span></div>
        <button class="iconbtn" id="lock" title="Lock">${ICONS.lock}</button>
      </div>
    </aside>

    <div class="shell-main">
      <header class="topbar2">
        <div class="tb-search" id="searchBox">
          <span class="tb-s-ico">${ICONS.search}</span>
          <input id="searchIn" placeholder="Search lessons, drills, squares…" autocomplete="off" />
          <div class="search-drop" id="searchDrop" hidden></div>
        </div>
        <div class="tb-right">
          <button class="chip flame-chip" id="streakChip" title="Streak">${ICONS.flame}<b id="tbStreak">${s.streak}</b></button>
          <button class="chip" id="scoreChip" title="Score">${ICONS.star}<b id="tbScore">${s.drill.score}</b></button>
        </div>
      </header>
      <main id="view" class="view-slot"></main>
    </div>

    <nav class="bnav" id="bnav">
      ${MOBILE_NAV.map((k) => { const n = NAV.find((x) => x.key === k)!; return `<button class="bnav-btn" data-k="${k}">${n.icon}<span>${n.label}</span></button>`; }).join("")}
      <button class="bnav-btn" data-k="evaluate">${ICONS.board}<span>Evaluate</span></button>
    </nav>
  </div>`;

  const view = app.querySelector<HTMLElement>("#view")!;
  let dispose: (() => void) | null = null;
  let currentKey = "";

  function route() {
    const r = parseHash();
    const key = NAV.some((n) => n.key === r.name) ? r.name : "home";
    if (key !== currentKey || key === "learn" && r.parts[0] !== undefined) {
      currentKey = key;
      dispose?.();
      const inst =
        key === "home" ? mountHome(view, data) :
        key === "learn" ? mountLearn(view, r.parts[0]) :
        key === "drill" ? mountDrill(view, data, r.parts[0] === "verdict" ? "verdict" : "position") :
        key === "atlas" ? mountMap(view, data) :
        key === "evaluate" ? mountEvaluate(view, data) :
        key === "challenges" ? mountChallenges(view) :
        mountProgress(view);
      dispose = inst.dispose;
      view.parentElement?.scrollTo({ top: 0 });
      window.scrollTo({ top: 0 });
    }
    app.querySelectorAll<HTMLElement>(".navitem").forEach((b) => b.classList.toggle("active", b.dataset.k === key));
    app.querySelectorAll<HTMLElement>(".bnav-btn").forEach((b) => b.classList.toggle("active", b.dataset.k === key));
  }
  const offRoute = onRoute(route);

  app.querySelectorAll<HTMLElement>(".navitem, .sp-card .btn").forEach((b) =>
    b.addEventListener("click", () => go(b.dataset.k!)));
  app.querySelectorAll<HTMLElement>(".bnav-btn").forEach((b) =>
    b.addEventListener("click", () => go(b.dataset.k!)));
  app.querySelector("#lock")!.addEventListener("click", () => {
    dispose?.();
    app.innerHTML = "";
    offRoute();
    toast("locked");
    mountGate(() => mountApp(data));
  });
  app.querySelector("#streakChip")!.addEventListener("click", () => go("challenges"));
  app.querySelector("#scoreChip")!.addEventListener("click", () => go("progress"));

  // live search
  const input = app.querySelector<HTMLInputElement>("#searchIn")!;
  const drop = app.querySelector<HTMLElement>("#searchDrop")!;
  input.addEventListener("input", () => {
    const q = input.value.trim().toLowerCase();
    if (q.length < 2) { drop.hidden = true; return; }
    const lessonHits = LESSONS.map((l, i) => ({ t: l.title, sub: "lesson " + l.k, go: () => go("learn", String(i)) })).filter((x) => x.t.toLowerCase().includes(q));
    const drillHits = data.drills.filter((d) => d.name.toLowerCase().includes(q)).slice(0, 4).map((d) => ({ t: d.name, sub: "study position", go: () => go("evaluate") }));
    const sqHits = (() => {
      const pc = q[0];
      if (!"pnbrqk".includes(pc)) return [];
      const out: string[] = [];
      for (const f of "abcdefgh") for (let r = 1; r <= 7; r++) { const sq = f + r; if (sq.startsWith(q.slice(0, Math.min(2, q.length)))) out.push(sq); }
      return out.slice(0, 3).map((sq) => ({ t: `[${pc.toUpperCase()}-${sq}]`, sub: "atlas square", go: () => go("atlas") }));
    })();
    const hits = [...lessonHits, ...drillHits, ...sqHits].slice(0, 7);
    drop.innerHTML = hits.length
      ? hits.map((h, i) => `<button data-i="${i}"><b>${h.t}</b><span>${h.sub}</span></button>`).join("")
      : `<div class="sd-empty">Nothing measured matches “${q}”.</div>`;
    drop.hidden = false;
    drop.querySelectorAll("button").forEach((b) => b.addEventListener("click", () => { hits[+b.dataset.i!].go(); drop.hidden = true; input.value = ""; }));
  });
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !drop.hidden) { drop.querySelector("button")?.click(); }
    if (e.key === "Escape") drop.hidden = true;
  });
  document.addEventListener("click", (e) => { if (!app.querySelector("#searchBox")!.contains(e.target as Node)) drop.hidden = true; });

  checkBadges();
  route();
}

(async () => {
  const data = await loadData();
  if (localStorage.getItem(GATE_LS) === EXPECTED) mountApp(data);
  else mountGate(() => mountApp(data));
})();
