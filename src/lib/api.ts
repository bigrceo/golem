/** Access to the hire-api worker, with a live fallback so no page is ever empty. */
import { floorLive } from "./floorLive";
export const API = process.env.HIRE_API || "https://hire-api.qubit-web.workers.dev";
export async function apiGet<T>(path: string, revalidate = 30): Promise<T | null> {
  try { const r = await fetch(API + path, { next: { revalidate } }); if (!r.ok) return null; return (await r.json()) as T; } catch { return null; }
}
export type FloorData = Awaited<ReturnType<typeof floorLive>> & { stats: { pools?: number; tracked?: number; calls?: number; passed?: number; blocked?: number } };
export async function getFloor(): Promise<FloorData> {
  const d = await apiGet<FloorData>("/floor", 30);
  if (d && d.tokens?.length) return d;
  return floorLive().catch(() => ({ at: Date.now(), lastRun: 0, live: true, stats: {}, tokens: [], checks: [] })) as Promise<FloorData>;
}
