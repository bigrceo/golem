/** Access to the hire-api worker, with a live fallback so no page is ever empty. */
import { floorLive } from "./floorLive";
import { withLogos } from "./tokenLogo";
export const API = process.env.HIRE_API || "https://hire-api.qubit-web.workers.dev";
export async function apiGet<T>(path: string, revalidate = 30): Promise<T | null> {
  try { const r = await fetch(API + path, { next: { revalidate } }); if (!r.ok) return null; return (await r.json()) as T; } catch { return null; }
}
export type FloorData = Awaited<ReturnType<typeof floorLive>> & { stats: { pools?: number; tracked?: number; calls?: number; passed?: number; blocked?: number } };
export async function getFloor(): Promise<FloorData> {
  let d = await apiGet<FloorData>("/floor", 30);
  if (!d || !d.tokens?.length) d = (await floorLive().catch(() => ({ at: Date.now(), lastRun: 0, live: true, stats: {}, tokens: [], checks: [] }))) as FloorData;
  // only tokens with a real logo are listed; the Gate still checks all of them
  return { ...d, tokens: await withLogos(d.tokens) };
}
