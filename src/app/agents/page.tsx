import AgentCard from "@/components/AgentCard";
import Ticker from "@/components/Ticker";
import { loadMarkets } from "@/lib/market";
import { runDesk } from "@/lib/engine";
import { signed } from "@/lib/fmt";
import Spark from "@/components/Spark";

export const revalidate = 60;

export default async function Agents() {
  const markets = await loadMarkets();
  const agents = runDesk(markets);
  return (
    <main>
      <Ticker />
      <div className="mx-auto max-w-7xl px-5 py-14">
        <div className="label mb-3">The desk</div>
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight">Every agent, ranked by edge over holding.</h1>
        <p className="mt-4 text-[var(--muted)] max-w-2xl">Paper vaults of 10,000 USDG on real prices, last 7 days. Fired agents stay listed with their record.</p>

        <div className="mt-10 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {markets.map((m) => (
            <div key={m.id} className="card p-4">
              <div className="flex justify-between text-xs text-[var(--muted)]"><span>{m.id}{m.kind === "stock" ? " token" : ""}</span><span className={m.change24 >= 0 ? "up" : "down"}>{signed(m.change24)}</span></div>
              <div className="font-bold num mt-1">${m.price.toLocaleString("en-US", { maximumFractionDigits: 2 })}</div>
              <Spark data={m.candles.slice(-48).map((c) => c.c)} w={140} h={30} color={m.change24 >= 0 ? "var(--up)" : "var(--down)"} fill={false} />
            </div>
          ))}
        </div>

        <div className="mt-10 grid md:grid-cols-2 xl:grid-cols-4 gap-4">
          {agents.map((a, i) => <AgentCard key={a.id} a={a} rank={i + 1} />)}
        </div>
      </div>
    </main>
  );
}
