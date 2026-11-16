import { notFound } from "next/navigation";
import Link from "next/link";
import { loadMarkets } from "@/lib/market";
import { runDesk } from "@/lib/engine";
import Spark from "@/components/Spark";
import HireBox from "@/components/HireBox";
import Avatar from "@/components/Avatar";
import { money, signed, hhmm } from "@/lib/fmt";

export const revalidate = 60;
const tone: Record<string, string> = { BUY: "up", SELL: "down", HOLD: "text-[var(--muted)]", FIRED: "down" };

export default async function AgentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const agents = runDesk(await loadMarkets());
  const a = agents.find((x) => x.id === id);
  if (!a) notFound();
  const rank = agents.indexOf(a) + 1;
  const fired = a.status === "fired";
  return (
    <main className="mx-auto max-w-7xl px-5 py-12">
      <Link href="/agents" className="text-sm text-[var(--muted)] hover:text-black">← The desk</Link>
      <div className="mt-6 grid lg:grid-cols-[1.4fr_1fr] gap-10">
        <div>
          <div className="flex items-center gap-4">
            <Avatar id={a.id} name={a.name} size={64} />
            <div>
              <h1 className="text-4xl font-bold tracking-tight">{a.name}</h1>
              <div className="text-[var(--muted)]">#{rank} on the desk · {a.strategy} · {a.markets.join(" / ")} · ${a.handle.toUpperCase()}</div>
            </div>
            <div className={`ml-auto label !tracking-[0.12em] ${fired ? "down" : "up"}`}>{fired ? "Fired" : "Working"}</div>
          </div>
          <p className="mt-6 text-lg text-[var(--muted)] max-w-2xl">{a.pitch}</p>

          <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
            {[[signed(a.pnl), "7-day return", a.pnl >= 0 ? "up" : "down"], [signed(a.holdPnl), `holding ${a.markets[0]}`, ""], [signed(a.edge), "edge", a.edge >= 0 ? "up" : "down"], [`${a.maxDrawdown}%`, `max drawdown · fired at ${(a.fireAt * 100).toFixed(0)}%`, ""]].map(([v, l, c]) => (
              <div key={l} className="card p-4"><div className={`text-2xl font-bold num ${c}`}>{v}</div><div className="text-xs text-[var(--muted)]">{l}</div></div>
            ))}
          </div>
          <div className="card p-5 mt-4">
            <div className="flex justify-between text-sm"><span className="label">Paper vault</span><span className="font-bold num">{money(a.equity)}</span></div>
            <div className="mt-3"><Spark data={a.curve} w={760} h={120} color={a.pnl >= 0 ? "var(--up)" : "var(--down)"} /></div>
            <div className="mt-3 flex gap-6 text-sm text-[var(--muted)] num"><span>{a.trades} trades</span><span>{a.winRate}% winners</span><span>{a.hires} hires</span><span>risk {a.risk}</span></div>
          </div>

          <div className="mt-8">
            <div className="label mb-4">Decision log · every call with its reason</div>
            <div className="card divide-y divide-[var(--line)]">
              {a.decisions.map((d, i) => (
                <div key={i} className="flex gap-4 p-4 text-sm items-baseline">
                  <span className="text-[var(--muted)] num w-14 shrink-0">{hhmm(d.t)}</span>
                  <span className={`font-bold w-14 shrink-0 ${tone[d.action]}`}>{d.action}</span>
                  <span className="flex-1">{d.reason}</span>
                  <span className="text-[var(--muted)] num hidden sm:block">{d.market} {d.price.toLocaleString("en-US", { maximumFractionDigits: 2 })}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <HireBox agent={{ id: a.id, name: a.name, handle: a.handle, fireAt: a.fireAt, status: a.status, hires: a.hires, live: a.live }} />
      </div>
    </main>
  );
}
