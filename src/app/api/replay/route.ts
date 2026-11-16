import { NextResponse } from "next/server";
import { loadMarkets } from "@/lib/market";
import { replayHire } from "@/lib/engine";

export const dynamic = "force-dynamic";
type In = { id: string; agentId: string; since: number; cash: number; fireAt: number };

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { hires?: In[] } | null;
  const hires = (body?.hires ?? []).slice(0, 20);
  const markets = await loadMarkets();
  const out = hires.map((h) => {
    const cash = Math.min(Math.max(Number(h.cash) || 0, 10), 1_000_000);
    const fireAt = Math.min(Math.max(Number(h.fireAt) || 0.08, 0.01), 0.5);
    const r = replayHire(markets, String(h.agentId), Number(h.since) || Date.now(), cash, fireAt);
    if (!r) return { id: h.id, error: "unknown agent" };
    return { id: h.id, agentId: r.id, name: r.name, strategy: r.strategy, markets: r.markets, equity: r.equity, pnl: r.pnl, holdPnl: r.holdPnl, edge: r.edge,
      maxDrawdown: r.maxDrawdown, status: r.status, curve: r.curve, decisions: r.decisions.slice(0, 25), trades: r.trades, inPosition: r.inPosition };
  });
  return NextResponse.json({ at: Date.now(), results: out });
}
