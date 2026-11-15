import type { Color, PieceType } from "./core";

// Cburnett set inlined (CC BY-SA 3.0). 45×45 viewBox.
const S = `fill="none" fill-rule="evenodd" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"`;
export const PIECE_SVG: Record<Color, Record<PieceType, string>> = {
  w: {
    p: `<svg viewBox="0 0 45 45"><path d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.59 16 21c0 2.03.94 3.84 2.41 5.03-3 1.06-7.41 5.55-7.41 13.47h23c0-7.92-4.41-12.41-7.41-13.47 1.47-1.19 2.41-3 2.41-5.03 0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z" fill="#fff" stroke="#000" stroke-width="1.5" stroke-linecap="round"/></svg>`,
    n: `<svg viewBox="0 0 45 45"><g ${S}><path d="M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21" fill="#fff"/><path d="M24 18c.38 2.91-5.55 7.37-8 9-3 2-2.82 4.34-5 4-1.042-.94 1.41-3.04 0-3-1 0 .19 1.23-1 2-1 0-4.003 1-4-4 0-2 6-12 6-12s1.89-1.9 2-3.5c-.73-.994-.5-2-.5-3 1-1 3 2.5 3 2.5h2s.78-1.992 2.5-3c1 0 1 3 1 3" fill="#fff"/><path d="M9.5 25.5a.5.5 0 1 1-1 0 .5.5 0 1 1 1 0zm5.433-9.75a.5 1.5 30 1 1-.866-.5.5 1.5 30 1 1 .866.5z" fill="#000"/></g></svg>`,
    b: `<svg viewBox="0 0 45 45"><g ${S}><g fill="#fff" stroke-linecap="butt"><path d="M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2 0 0 1.65.54 3 2-.68.97-1.65.99-3 .5-3.39-.97-10.11.46-13.5-1-3.39 1.46-10.11.03-13.5 1-1.354.49-2.323.47-3-.5 1.354-1.94 3-2 3-2z"/><path d="M15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2z"/><path d="M25 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 1 1 5 0z"/></g><path d="M17.5 26h10M15 30h15m-7.5-14.5v5M20 18h5" stroke-linejoin="miter"/></g></svg>`,
    r: `<svg viewBox="0 0 45 45"><g ${S} fill="#fff"><path d="M9 39h27v-3H9v3zm3-3v-4h21v4H12zm-1-22V9h4v2h5V9h5v2h5V9h4v5" stroke-linecap="butt"/><path d="M34 14l-3 3H14l-3-3"/><path d="M31 17v12.5H14V17" stroke-linecap="butt" stroke-linejoin="miter"/><path d="M31 29.5l1.5 2.5h-20l1.5-2.5"/><path d="M11 14h23" fill="none" stroke-linejoin="miter"/></g></svg>`,
    q: `<svg viewBox="0 0 45 45"><g ${S} fill="#fff"><path d="M8 12a2 2 0 1 1-4 0 2 2 0 1 1 4 0zm16.5-4.5a2 2 0 1 1-4 0 2 2 0 1 1 4 0zM41 12a2 2 0 1 1-4 0 2 2 0 1 1 4 0zM16 8.5a2 2 0 1 1-4 0 2 2 0 1 1 4 0zM33 9a2 2 0 1 1-4 0 2 2 0 1 1 4 0z"/><path d="M9 26c8.5-1.5 21-1.5 27 0l2-12-7 11V11l-5.5 13.5-3-15-3 15-5.5-14V25L7 14l2 12z" stroke-linecap="butt"/><path d="M9 26c0 2 1.5 2 2.5 4 1 1.5 1 1 .5 3.5-1.5 1-1.5 2.5-1.5 2.5-1.5 1.5.5 2.5.5 2.5 6.5 1 16.5 1 23 0 0 0 1.5-1 0-2.5 0 0 .5-1.5-1-2.5-.5-2.5-.5-2 .5-3.5 1-2 2.5-2 2.5-4-8.5-1.5-18.5-1.5-27 0z" stroke-linecap="butt"/><path d="M11.5 30c3.5-1 18.5-1 22 0M12 33.5c6-1 15-1 21 0" fill="none"/></g></svg>`,
    k: `<svg viewBox="0 0 45 45"><g ${S}><path d="M22.5 11.63V6M20 8h5" stroke-linejoin="miter"/><path d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5" fill="#fff" stroke-linecap="butt" stroke-linejoin="miter"/><path d="M12.5 37c5.5 3.5 14.5 3.5 20 0v-7s9-4.5 6-10.5c-4-6.5-13.5-3.5-16 4V27v-3.5c-2.5-7.5-12-10.5-16-4-3 6 6 10.5 6 10.5v7" fill="#fff"/><path d="M12.5 30c5.5-3 14.5-3 20 0m-20 3.5c5.5-3 14.5-3 20 0m-20 3.5c5.5-3 14.5-3 20 0"/></g></svg>`,
  },
  b: {
    p: `<svg viewBox="0 0 45 45"><path d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.59 16 21c0 2.03.94 3.84 2.41 5.03-3 1.06-7.41 5.55-7.41 13.47h23c0-7.92-4.41-12.41-7.41-13.47 1.47-1.19 2.41-3 2.41-5.03 0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z" fill="#000" stroke="#000" stroke-width="1.5" stroke-linecap="round"/></svg>`,
    n: `<svg viewBox="0 0 45 45"><g ${S}><path d="M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21" fill="#000"/><path d="M24 18c.38 2.91-5.55 7.37-8 9-3 2-2.82 4.34-5 4-1.042-.94 1.41-3.04 0-3-1 0 .19 1.23-1 2-1 0-4.003 1-4-4 0-2 6-12 6-12s1.89-1.9 2-3.5c-.73-.994-.5-2-.5-3 1-1 3 2.5 3 2.5h2s.78-1.992 2.5-3c1 0 1 3 1 3" fill="#000"/><path d="M9.5 25.5a.5.5 0 1 1-1 0 .5.5 0 1 1 1 0zm5.433-9.75a.5 1.5 30 1 1-.866-.5.5 1.5 30 1 1 .866.5z" fill="#fff" stroke="#fff"/><path d="M24.55 10.4l-.45 1.45.5.15c3.15 1 5.65 2.49 7.9 6.75S35.75 29.06 35.25 39l-.05.5h2.25l.05-.5c.5-10.06-.88-16.85-3.25-21.34-2.37-4.49-5.79-6.64-9.19-7.16l-.51-.1z" fill="#fff" stroke="none"/></g></svg>`,
    b: `<svg viewBox="0 0 45 45"><g ${S}><g fill="#000" stroke-linecap="butt"><path d="M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2 0 0 1.65.54 3 2-.68.97-1.65.99-3 .5-3.39-.97-10.11.46-13.5-1-3.39 1.46-10.11.03-13.5 1-1.354.49-2.323.47-3-.5 1.354-1.94 3-2 3-2z"/><path d="M15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2z"/><path d="M25 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 1 1 5 0z"/></g><path d="M17.5 26h10M15 30h15m-7.5-14.5v5M20 18h5" stroke="#fff" stroke-linejoin="miter"/></g></svg>`,
    r: `<svg viewBox="0 0 45 45"><g ${S} fill="#000"><path d="M9 39h27v-3H9v3zm3.5-7l1.5-2.5h17l1.5 2.5h-20zm-.5 4v-4h21v4H12z" stroke-linecap="butt"/><path d="M14 29.5v-13h17v13H14z" stroke-linecap="butt" stroke-linejoin="miter"/><path d="M14 16.5L11 14h23l-3 2.5H14zM11 14V9h4v2h5V9h5v2h5V9h4v5H11z" stroke-linecap="butt"/><path d="M12 35.5h21m-20-4h19m-18-2h17m-17-13h17M11 14h23" fill="none" stroke="#fff" stroke-width="1" stroke-linejoin="miter"/></g></svg>`,
    q: `<svg viewBox="0 0 45 45"><g ${S} fill="#000"><g stroke="none"><circle cx="6" cy="12" r="2.75"/><circle cx="14" cy="9" r="2.75"/><circle cx="22.5" cy="8" r="2.75"/><circle cx="31" cy="9" r="2.75"/><circle cx="39" cy="12" r="2.75"/></g><path d="M9 26c8.5-1.5 21-1.5 27 0l2.5-12.5L31 25l-.3-14.1-5.2 13.6-3-14.5-3 14.5-5.2-13.6L14 25 6.5 13.5 9 26z" stroke-linecap="butt"/><path d="M9 26c0 2 1.5 2 2.5 4 1 1.5 1 1 .5 3.5-1.5 1-1.5 2.5-1.5 2.5-1.5 1.5.5 2.5.5 2.5 6.5 1 16.5 1 23 0 0 0 1.5-1 0-2.5 0 0 .5-1.5-1-2.5-.5-2.5-.5-2 .5-3.5 1-2 2.5-2 2.5-4-8.5-1.5-18.5-1.5-27 0z" stroke-linecap="butt"/><path d="M11 38.5a35 35 1 0 0 23 0" fill="none" stroke-linecap="butt"/><path d="M11 29a35 35 1 0 1 23 0m-21.5 2.5h20m-21 3a35 35 1 0 0 22 0m-23 3a35 35 1 0 0 24 0" fill="none" stroke="#fff"/></g></svg>`,
    k: `<svg viewBox="0 0 45 45"><g ${S}><path d="M22.5 11.63V6" stroke-linejoin="miter"/><path d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5" fill="#000" stroke-linecap="butt" stroke-linejoin="miter"/><path d="M12.5 37c5.5 3.5 14.5 3.5 20 0v-7s9-4.5 6-10.5c-4-6.5-13.5-3.5-16 4V27v-3.5c-2.5-7.5-12-10.5-16-4-3 6 6 10.5 6 10.5v7" fill="#000"/><path d="M20 8h5" stroke-linejoin="miter"/><path d="M32 29.5s8.5-4 6.03-9.65C34.15 14 25 18 22.5 24.5l.01 2.1-.01-2.1C20 18 9.906 14 6.997 19.85c-2.497 5.65 4.853 9 4.853 9M12.5 30c5.5-3 14.5-3 20 0m-20 3.5c5.5-3 14.5-3 20 0m-20 3.5c5.5-3 14.5-3 20 0" stroke="#fff"/></g></svg>`,
  },
};

export const NOTE_LETTER: Record<PieceType, string> = { k: "K", q: "Q", r: "R", b: "B", n: "N", p: "P" };

const ic = (inner: string, size = 18) => `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
export const ICONS = {
  home: ic('<path d="M4 11.5 12 4l8 7.5"/><path d="M6 10v10h12V10"/><path d="M10 20v-6h4v6"/>'),
  book: ic('<path d="M4 4h7a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4zM20 4h-7a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h8z"/>'),
  target: ic('<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1" fill="currentColor"/>'),
  grid: ic('<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>'),
  board: ic('<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M4 9.5h16M4 14.5h16M9.5 4v16M14.5 4v16"/><path d="M4 4h5.5v5.5H4zM14.5 9.5H20v5h-5.5zM9.5 14.5h5v5.5h-5z" fill="currentColor" stroke="none" opacity=".4"/>'),
  trophy: ic('<path d="M8 4h8v5a4 4 0 0 1-8 0V4z"/><path d="M8 5H5a1 1 0 0 0-1 1c0 2.5 1.5 4 4 4M16 5h3a1 1 0 0 1 1 1c0 2.5-1.5 4-4 4"/><path d="M12 13v3M8.5 20h7M10 16h4l1 4H9z"/>'),
  chart: ic('<path d="M4 20V4"/><path d="M4 20h16"/><path d="M8 16v-5M12 16V8M16 16v-3M20 16V6"/>'),
  flame: ic('<path d="M12 3s5 4.5 5 9.5a5 5 0 0 1-10 0c0-2 1-4 2.5-5.5C9.5 8.5 10 10 11 10c.5-2.5.5-5 1-7z" fill="none"/><path d="M12 20a2.6 2.6 0 0 0 2.6-2.6c0-1.5-1.4-3.4-2.6-4.4-1.2 1-2.6 2.9-2.6 4.4A2.6 2.6 0 0 0 12 20z" fill="currentColor" stroke="none" opacity=".85"/>'),
  search: ic('<circle cx="11" cy="11" r="6.5"/><path d="m20 20-3.6-3.6"/>'),
  crown: ic('<path d="m4 8 4 3.5L12 5l4 6.5L20 8l-1.5 10h-13L4 8z"/>'),
  lock: ic('<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>'),
  flip: ic('<path d="M3 12h13M16 8l4 4-4 4M21 12H8M8 16l-4-4 4-4"/>'),
  trash: ic('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>'),
  dice: ic('<rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="8.5" cy="8.5" r="1.2" fill="currentColor"/><circle cx="15.5" cy="8.5" r="1.2" fill="currentColor"/><circle cx="8.5" cy="15.5" r="1.2" fill="currentColor"/><circle cx="15.5" cy="15.5" r="1.2" fill="currentColor"/>'),
  check: ic('<path d="m5 12 5 5L20 7"/>', 15),
  left: ic('<path d="M15 18l-6-6 6-6"/>'),
  right: ic('<path d="M9 6l6 6-6 6"/>'),
  chevron: ic('<path d="m9 6 6 6-6 6"/>', 14),
  flag: ic('<path d="M5 21V4h11l-2 4 2 4H5"/>', 13),
  star: ic('<path d="m12 3.5 2.6 5.4 5.9.7-4.4 4 1.2 5.9L12 16.6 6.7 19.5l1.2-5.9-4.4-4 5.9-.7z"/>'),
  medal: ic('<circle cx="12" cy="10" r="5.5"/><path d="M9 14.5 7 21l5-2.5L17 21l-2-6.5"/><path d="m12 7.5.9 1.8 2 .3-1.45 1.4.35 2-1.8-.95-1.8.95.35-2L9.1 9.6l2-.3z" fill="currentColor" stroke="none" opacity=".7"/>'),
  spark: ic('<path d="M12 4v4M12 16v4M4 12h4M16 12h4M6.5 6.5l2.5 2.5M15 15l2.5 2.5M17.5 6.5 15 9M9 15l-2.5 2.5"/>'),
  hand: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 11V6.5a1.5 1.5 0 0 1 3 0V10m0-4.5v-1a1.5 1.5 0 0 1 3 0V10m0-4a1.5 1.5 0 0 1 3 0v5m0-3.5a1.5 1.5 0 0 1 3 0V15a6 6 0 0 1-6 6h-1.4a6 6 0 0 1-5-2.7l-2.4-4a1.6 1.6 0 0 1 2.7-1.7L7 15"/></svg>`,
};

// ---------- the study companion: Walnut the knight ----------
export const MASCOT = `
<svg viewBox="0 0 140 140" class="mascot-svg">
  <ellipse cx="70" cy="126" rx="36" ry="7" fill="rgba(56,32,21,.14)"/>
  <g class="mascot-float">
    <circle cx="70" cy="64" r="46" fill="#f7ecd9" stroke="#e6d5ba" stroke-width="2"/>
    <g transform="translate(29 22) scale(1.82)">
      <path d="M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21" fill="#fffdf9" stroke="#c9ab88" stroke-width="1.1"/>
      <path d="M24 18c.38 2.91-5.55 7.37-8 9-3 2-2.82 4.34-5 4-1.042-.94 1.41-3.04 0-3-1 0 .19 1.23-1 2-1 0-4.003 1-4-4 0-2 6-12 6-12s1.89-1.9 2-3.5c-.73-.994-.5-2-.5-3 1-1 3 2.5 3 2.5h2s.78-1.992 2.5-3c1 0 1 3 1 3" fill="#fffdf9" stroke="#c9ab88" stroke-width="1"/>
      <circle cx="9" cy="25.5" r=".9" fill="#382015"/>
      <ellipse cx="13.6" cy="15.6" rx=".5" ry="1.5" transform="rotate(30 13.6 15.6)" fill="#382015"/>
    </g>
    <rect x="30" y="88" width="80" height="13" rx="6.5" fill="#c9832b"/>
    <rect x="30" y="88" width="80" height="6" rx="3" fill="#e0a54e" opacity=".8"/>
    <path d="M96 97c4 6 5 14 2 20l-9-3c2-6 2-12 1-17z" fill="#96551a"/>
    <path d="M40 99c-2 7-1 14 3 19l8-4c-3-5-4-10-3-15z" fill="#96551a" opacity=".85"/>
  </g>
  <g class="spark1"><path d="m22 40 2 4.5 4.5 2-4.5 2-2 4.5-2-4.5-4.5-2 4.5-2z" fill="#e5a94f"/></g>
  <g class="spark2"><path d="m118 24 1.6 3.6 3.6 1.6-3.6 1.6-1.6 3.6-1.6-3.6-3.6-1.6 3.6-1.6z" fill="#c9832b"/></g>
</svg>`;

// ---------- toast ----------
let toastEl: HTMLElement | null = null, toastTimer = 0;
export function toast(text: string) {
  if (!toastEl) { toastEl = document.createElement("div"); toastEl.className = "toast"; document.body.appendChild(toastEl); }
  toastEl.textContent = text;
  toastEl.classList.remove("show");
  void (toastEl as HTMLElement).offsetWidth;
  toastEl.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toastEl!.classList.remove("show"), 2000);
}
export function copyLine(text: string) {
  navigator.clipboard?.writeText(text).catch(() => undefined);
  toast(text + "  ·  copied");
}

// ---------- confetti (warm palette) ----------
const CONF_COLORS = ["#e5a94f", "#c9832b", "#96551a", "#63361f", "#f3cd90", "#2f6b46"];
export function confetti(x = window.innerWidth / 2, y = window.innerHeight * 0.42, n = 26, big = false) {
  for (let i = 0; i < n; i++) {
    const el = document.createElement("span");
    el.className = "cf";
    const ang = Math.random() * Math.PI * 2;
    const vel = (big ? 140 : 90) + Math.random() * (big ? 220 : 140);
    el.style.setProperty("--dx", `${Math.cos(ang) * vel}px`);
    el.style.setProperty("--dy", `${Math.sin(ang) * vel * 0.6 + 160 + Math.random() * 120}px`);
    el.style.setProperty("--rot", `${Math.random() * 720 - 360}deg`);
    el.style.left = x + (Math.random() * 60 - 30) + "px";
    el.style.top = y + "px";
    el.style.background = CONF_COLORS[i % CONF_COLORS.length];
    el.style.width = (big ? 7 : 5) + Math.random() * 5 + "px";
    el.style.height = (big ? 10 : 7) + Math.random() * 6 + "px";
    el.style.animationDuration = (0.9 + Math.random() * 0.7) + "s";
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1800);
  }
}

// ---------- spring pop for an element ----------
export function springPop(el: HTMLElement) {
  el.classList.remove("spring-pop");
  void (el as HTMLElement).offsetWidth;
  el.classList.add("spring-pop");
}

// ---------- number tween ----------
export function tweenNumber(el: HTMLElement, from: number, to: number, fmt: (v: number) => string, ms = 420) {
  const t0 = performance.now();
  const step = (t: number) => {
    const k = Math.min(1, (t - t0) / ms);
    const e = 1 - Math.pow(1 - k, 3);
    el.textContent = fmt(from + (to - from) * e);
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

// ---------- scroll reveal ----------
export function observeReveals(root: ParentNode) {
  const io = new IntersectionObserver((ents) => {
    for (const e of ents) if (e.isIntersecting) { (e.target as HTMLElement).classList.add("in"); io.unobserve(e.target); }
  }, { threshold: 0.1 });
  root.querySelectorAll<HTMLElement>(".rv").forEach((el, i) => {
    if (!el.style.getPropertyValue("--d")) el.style.setProperty("--d", `${(i % 9) * 55}ms`);
    io.observe(el);
  });
}
