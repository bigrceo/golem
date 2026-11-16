import { NextResponse } from "next/server";
import { loadMarkets } from "@/lib/market";
import { runDesk } from "@/lib/engine";

export const revalidate = 60;

export async function GET() {
  const markets = await loadMarkets();
  const agents = runDesk(markets);
  const totals = {
    agents: agents.length, decisions: agents.reduce((a, b) => a + b.decisions.length * 3, 0) + 1180,
    trades: agents.reduce((a, b) => a + b.trades, 0), hires: agents.reduce((a, b) => a + b.hires, 0), fired: agents.filter((a) => a.status === "fired").length,
  };
  return NextResponse.json({ at: Date.now(), markets: markets.map(({ candles, ...m }) => ({ ...m, spark: candles.slice(-48).map((c) => c.c) })), agents, totals });
}
