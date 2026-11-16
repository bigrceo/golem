import { NextResponse } from "next/server";
import { AGENTS } from "@/lib/engine";
import { agentAddresses, watchdogAccount } from "@/lib/agentKeys";
export const dynamic = "force-dynamic";
export async function GET() {
  const addr = agentAddresses();
  return NextResponse.json({ watchdog: watchdogAccount().address, agents: AGENTS.map((a) => ({ id: a.id, name: a.name, live: a.live, market: a.markets[0], address: addr[a.id] })) });
}
