/** Server-side access to the hire-api worker (D1). */
export const API = process.env.HIRE_API || "https://hire-api.qubit-web.workers.dev";
export async function apiGet<T>(path: string, revalidate = 30): Promise<T | null> {
  try { const r = await fetch(API + path, { next: { revalidate } }); if (!r.ok) return null; return (await r.json()) as T; } catch { return null; }
}
