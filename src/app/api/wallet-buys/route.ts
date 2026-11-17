import { NextResponse } from "next/server";
import { head, transfers } from "@/lib/wallet";
/** For the worker: tokens a wallet received since `from` (block). Cloudflare IPs are rate-limited on eth_getLogs. */
export const dynamic = "force-dynamic";
export const maxDuration = 30;
export async function GET(req: Request) {
  if (req.headers.get("x-hire-secret") !== process.env.HIRE_API_SECRET) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const u = new URL(req.url); const w = u.searchParams.get("w") ?? "";
  if (!/^0x[0-9a-fA-F]{40}$/.test(w)) return NextResponse.json({ error: "bad wallet" }, { status: 400 });
  const h = await head(); const from = Math.max(Number(u.searchParams.get("from") || h - 6000), h - 60_000);
  const logs = await transfers(w, from, h);
  return NextResponse.json({ head: h, next: h + 1, tokens: [...new Set(logs.filter((l) => l.dir === "in").map((l) => l.address.toLowerCase()))] });
}
