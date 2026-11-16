"use client";
import { useEffect, useState } from "react";
import type { AgentResult, MarketId } from "./engine";
export type DeskMarket = { id: MarketId; name: string; kind: "crypto" | "stock"; price: number; change24: number; spark: number[] };
export type Desk = { at: number; markets: DeskMarket[]; agents: AgentResult[]; totals: { agents: number; decisions: number; trades: number; hires: number; fired: number } };

export function useDesk(every = 30000) {
  const [desk, setDesk] = useState<Desk | null>(null);
  useEffect(() => {
    let on = true;
    const load = () => fetch("/api/desk").then((r) => r.json()).then((d) => on && setDesk(d)).catch(() => {});
    load(); const id = setInterval(load, every);
    return () => { on = false; clearInterval(id); };
  }, [every]);
  return desk;
}
export { money, signed, hhmm } from "./fmt";
