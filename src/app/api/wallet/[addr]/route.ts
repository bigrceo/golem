import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { profile } from "@/lib/wallet";
import { withLogos } from "@/lib/tokenLogo";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
const cached = unstable_cache(async (w: string) => { const p = await profile(w, 24); return { ...p, rows: await withLogos(p.rows) }; }, ["wallet-profile-v1"], { revalidate: 600 });
export async function GET(_: Request, { params }: { params: Promise<{ addr: string }> }) {
  const { addr } = await params;
  if (!/^0x[0-9a-fA-F]{40}$/.test(addr)) return NextResponse.json({ error: "Paste a Robinhood Chain wallet address (0x…)." }, { status: 400 });
  try { return NextResponse.json(await cached(addr.toLowerCase())); } catch { return NextResponse.json({ error: "The chain is busy, try again in a moment." }, { status: 503 }); }
}
