// Tiny hash router: #/home, #/learn, #/learn/7, #/drill, #/atlas, #/evaluate, #/challenges, #/progress
export interface Route { name: string; parts: string[] }
export function parseHash(): Route {
  const h = location.hash.replace(/^#\/?/, "");
  const parts = h.split("/").filter(Boolean);
  return { name: parts[0] || "home", parts: parts.slice(1) };
}
export function go(name: string, sub?: string) {
  location.hash = sub !== undefined ? `#/${name}/${sub}` : `#/${name}`;
}
export function onRoute(cb: (r: Route) => void): () => void {
  const fn = () => cb(parseHash());
  window.addEventListener("hashchange", fn);
  return () => window.removeEventListener("hashchange", fn);
}
