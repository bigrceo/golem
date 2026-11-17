import { NextResponse } from "next/server";
import { API } from "@/lib/api";
import { isMarket } from "@/lib/candles";
import { STRATEGIES, type Spec } from "@/lib/rules";
import type { Trench } from "@/lib/trench";
export const dynamic = "force-dynamic";
const clamp = (v: unknown, a: number, b: number, d: number) => { const n = Number(v); return Number.isFinite(n) ? Math.min(b, Math.max(a, n)) : d; };

export async function POST(req: Request) {
  const b = await req.json().catch(() => null) as { name?: string; kind?: string; spec?: Spec & Trench; owner?: string; parent?: string; version?: number } | null;
  const name = (b?.name ?? "").trim().replace(/[^\p{L}\p{N} ._-]/gu, "").slice(0, 24);
  if (!name || name.length < 2) return NextResponse.json({ error: "Give your agent a name (2–24 characters)." }, { status: 400 });
  let spec: unknown;
  if (b?.kind === "market") {
    const s = b.spec as Spec; if (!s || !isMarket(s.market) || !STRATEGIES[s.strategy?.kind]) return NextResponse.json({ error: "Pick a market and a strategy." }, { status: 400 });
    const meta = STRATEGIES[s.strategy.kind]; const strategy: Record<string, unknown> = { kind: s.strategy.kind };
    for (const p of meta.params) strategy[p.key] = clamp((s.strategy as unknown as Record<string, number>)[p.key], p.min, p.max, (meta.defaults as unknown as Record<string, number>)[p.key]);
    spec = { market: s.market, strategy, size: clamp(s.size, 0.1, 1, 1), tp: clamp(s.tp, 0, 200, 0), sl: clamp(s.sl, 0, 90, 0), maxHold: clamp(s.maxHold, 0, 720, 0), fireLine: clamp(s.fireLine, 1, 50, 10) };
  } else if (b?.kind === "trench") {
    const s = b.spec as Trench;
    spec = { universe: "trenches", side: s.side === "bear" ? "bear" : "bull", maxAgeH: clamp(s.maxAgeH, 1, 72, 24), minLiq: clamp(s.minLiq, 1000, 1e7, 5000), minFdv: clamp(s.minFdv, 1000, 1e8, 10000), maxFdv: clamp(s.maxFdv, 5000, 1e9, 300000),
      minBuysH1: clamp(s.minBuysH1, 0, 5000, 20), minBuyRatio: clamp(s.minBuyRatio, 0, 20, 1.2), minChH1: clamp(s.minChH1, -100, 1000, 0), maxChH1: clamp(s.maxChH1, -100, 10000, 200), minChM5: clamp(s.minChM5, -100, 100, -100), copycatsOnly: !!s.copycatsOnly,
      tp: clamp(s.tp, 5, 500, 50), sl: clamp(s.sl, 5, 90, 25), maxHold: clamp(s.maxHold, 1, 72, 12), fireLine: clamp(s.fireLine, 5, 60, 25) };
  } else if (b?.kind === "copy") {
    const w = String((b.spec as unknown as { wallet?: string })?.wallet ?? "").toLowerCase();
    if (!/^0x[0-9a-f]{40}$/.test(w)) return NextResponse.json({ error: "Paste a wallet address (0x…)." }, { status: 400 });
    spec = { universe: "trenches", side: "bull", copy: { wallet: w }, maxAgeH: 72, minLiq: 3000, minFdv: 1000, maxFdv: 1e9, minBuysH1: 0, minBuyRatio: 0, minChH1: -100, maxChH1: 10000, minChM5: -100, tp: clamp((b.spec as Trench)?.tp, 5, 500, 50), sl: clamp((b.spec as Trench)?.sl, 5, 90, 30), maxHold: 24, fireLine: 30 };
    b.kind = "trench";
  } else return NextResponse.json({ error: "bad kind" }, { status: 400 });
  const parent = /^[a-z0-9-]{2,40}$/.test(b.parent ?? "") ? b.parent! : null; const version = parent ? clamp(b.version, 2, 99, 2) : 1;
  if (parent) Object.assign(spec as object, { parent, version });
  const base = parent ? `${parent.replace(/-v\d+$/, "").slice(0, 14)}-v${version}` : name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 18) || "agent";
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim();
  for (let i = 0; i < 3; i++) {
    const slug = i === 0 ? base : `${base}-${Math.random().toString(36).slice(2, 5)}`;
    const r = await fetch(API + "/agents", { method: "POST", headers: { "content-type": "application/json", "x-hire-secret": process.env.HIRE_API_SECRET ?? "" }, body: JSON.stringify({ slug, name, kind: b.kind, spec, owner: (b.owner ?? "anon").slice(0, 42), ip }) });
    const j = await r.json().catch(() => ({ error: "api down" }));
    if (r.status === 409) continue;
    return NextResponse.json(j, { status: r.status });
  }
  return NextResponse.json({ error: "Name taken, try another." }, { status: 409 });
}
