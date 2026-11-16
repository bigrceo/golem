import Link from "next/link";
import type { AgentResult } from "@/lib/engine";
import Spark from "./Spark";
import { money, signed } from "@/lib/fmt";

export default function AgentCard({ a, rank }: { a: AgentResult; rank?: number }) {
  const fired = a.status === "fired";
  return (
    <Link href={`/agents/${a.id}`} className={`card p-5 block hover:border-[rgba(255,176,0,0.5)] transition-colors ${fired ? "opacity-70" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {rank != null && <span className="text-[var(--muted)] font-bold num w-6">{rank}</span>}
          <div className="w-10 h-10 rounded-full bg-[var(--bg2)] border border-[var(--line)] flex items-center justify-center font-bold text-[var(--brand)]">{a.name[0]}</div>
          <div>
            <div className="font-bold leading-tight">{a.name}</div>
            <div className="text-xs text-[var(--muted)]">{a.strategy} · {a.markets.join("/")}</div>
          </div>
        </div>
        <div className={`label !tracking-[0.12em] ${fired ? "down" : "up"}`}>{fired ? "Fired" : "Working"}</div>
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
