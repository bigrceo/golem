"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useDesk, money, signed, hhmm } from "@/lib/useDesk";
import Spark from "./Spark";
import Avatar from "./Avatar";

const tone: Record<string, string> = { BUY: "up", SELL: "down", HOLD: "text-[var(--muted)]", FIRED: "down" };

export default function LiveDesk() {
  const d = useDesk();
  const [shown, setShown] = useState(0);
  const top = d?.agents.find((a) => a.status === "working") ?? d?.agents[0];
  useEffect(() => { setShown(0); if (!top) return; const id = setInterval(() => setShown((s) => Math.min(s + 1, 6)), 350); return () => clearInterval(id); }, [top?.id]);

  return (
    <div className="card p-5 md:p-6 relative overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <div className="label flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[var(--up)] blink" /> Live from the desk</div>
        <div className="label">Paper · real prices</div>
      </div>
      {!top ? <div className="h-72 flex items-center justify-center text-[var(--muted)] text-sm">Reading the tape…</div> : (
        <>
          <div className="flex items-start justify-between gap-4">
            <div className="flex gap-3 items-center"><Avatar id={top.id} name={top.name} size={44} /><div>
              <div className="text-[var(--muted)] text-xs mb-1">Top agent right now</div>
              <Link href={`/agents/${top.id}`} className="text-xl font-bold hover:underline">{top.name}</Link>
              <div className="text-sm text-[var(--muted)]">{top.strategy} · {top.markets.join(" / ")}</div>
            </div></div>
            <div className="text-right">
              <div className="text-2xl font-bold num">{money(top.equity)}</div>
              <div className={`text-sm font-semibold num ${top.pnl >= 0 ? "up" : "down"}`}>{signed(top.pnl)} · vs hold {signed(top.holdPnl)}</div>
            </div>
          </div>
          <div className="my-4"><Spark data={top.curve} w={460} h={70} color={top.pnl >= 0 ? "var(--up)" : "var(--down)"} /></div>
          <div className="space-y-2">
            {top.decisions.slice(0, 6).map((x, i) => (
              <div key={i} className={`flex gap-3 text-sm transition-all duration-500 ${i < shown ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"}`}>
                <span className="text-[var(--muted)] num w-12">{hhmm(x.t)}</span>
                <span className={`font-bold w-12 ${tone[x.action]}`}>{x.action}</span>
                <span className="text-[var(--fg)] truncate">{x.reason}</span>
              </div>
            ))}
          </div>
          <div className="mt-5 flex items-center justify-between">
            <span className="text-xs text-[var(--muted)]">Hired by {top.hires} vaults</span>
            <Link href={`/app?agent=${top.id}`} className="btn btn-brand !py-2 !px-4 text-sm">Hire {top.name.split(" ")[1]} →</Link>
          </div>
        </>
      )}
    </div>
  );
}
