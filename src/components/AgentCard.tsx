import Link from "next/link";
import type { AgentResult } from "@/lib/engine";
import Spark from "./Spark";
import Avatar from "./Avatar";
import MarketLogo from "./MarketLogo";
import { money, signed } from "@/lib/fmt";

export default function AgentCard({ a, rank }: { a: AgentResult; rank?: number }) {
  const fired = a.status === "fired";
  return (
    <Link href={`/agents/${a.id}`} className={`card p-5 block hover:border-[var(--brand)] transition-colors ${fired ? "opacity-70" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {rank != null && <span className="text-[var(--muted)] font-bold num w-6">{rank}</span>}
          <Avatar id={a.id} name={a.name} size={40} />
          <div>
            <div className="font-bold leading-tight">{a.name}</div>
            <div className="text-xs text-[var(--muted)] flex items-center gap-1.5">{a.markets.map((m) => <MarketLogo key={m} id={m} size={14} />)}{a.strategy} · {a.markets.join("/")}</div>
          </div>
        </div>
        <div className={`label !tracking-[0.12em] ${fired ? "text-[var(--muted)]" : "up"}`}>{fired ? "Paused" : "Working"}</div>
      </div>
      <div className="mt-4 flex items-end justify-between">
        <div>
          <div className="text-xs text-[var(--muted)]">Edge vs holding</div>
          <div className={`text-2xl font-bold num ${a.edge >= 0 ? "up" : "down"}`}>{signed(a.edge)}</div>
          <div className="text-xs text-[var(--muted)] num">{money(a.equity)} · {a.trades} trades · {a.hires} hires</div>
        </div>
        <Spark data={a.curve} w={120} h={40} color={a.pnl >= 0 ? "var(--up)" : "var(--down)"} />
      </div>
    </Link>
  );
}
