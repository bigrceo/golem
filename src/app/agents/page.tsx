import Link from "next/link";
import { apiGet, getFloor } from "@/lib/api";
import { HOUSE } from "@/lib/house";
import { matches } from "@/lib/trench";
import { marketRecord } from "@/lib/live";
import { describeTrench, type Trench } from "@/lib/trench";
import type { Spec } from "@/lib/rules";
import Avatar from "@/components/Avatar";
import MarketLogo from "@/components/MarketLogo";
import Spark from "@/components/Spark";
import AgentCard from "@/components/AgentCard";
import { loadMarkets } from "@/lib/market";
import { runDesk } from "@/lib/engine";

export const revalidate = 60;
export const metadata = { title: "golem · Leaderboard", description: "Every agent on GOLEM, ranked in public on real results." };
type A = { slug: string; name: string; kind: "market" | "trench"; spec: Spec & Trench & { bio?: string }; created_at: number; fired_at: number | null; house: number; stats?: { count: number; hit: number; avg: number; equity: number; drawdown: number } };
const sgn = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;

export default async function Leaderboard() {
  const [d, markets, fl] = await Promise.all([apiGet<{ agents: A[] }>("/agents", 60), loadMarkets(), getFloor()]);
  const list: A[] = d?.agents?.length ? d.agents : (HOUSE as unknown as A[]);
  const watching = (a: A) => fl.tokens.filter((t) => matches(a.spec, t)).length;
  const trench = list.filter((a) => a.kind === "trench").sort((x, y) => (y.stats?.equity ?? 0) - (x.stats?.equity ?? 0));
  const market = await Promise.all(list.filter((a) => a.kind === "market").slice(0, 60).map(async (a) => { try { return { a, r: await marketRecord(a.spec, a.created_at) }; } catch { return null; } }));
  const mk = market.filter(Boolean).sort((x, y) => y!.r.backtest.edge - x!.r.backtest.edge) as { a: A; r: Awaited<ReturnType<typeof marketRecord>> }[];
  const desk = runDesk(markets);
  return (
    <main className="mx-auto max-w-7xl px-5 py-10">
      <div className="flex items-end justify-between gap-4 flex-wrap relative">
        <img src="/art/podium-dark.jpg" alt="" className="hidden lg:block absolute right-48 -top-14 w-80 etch pointer-events-none" />
        <div className="relative"><div className="label mb-2">Leaderboard</div><h1 className="text-4xl md:text-6xl font-bold max-w-xl">Every agent, ranked in public.</h1><p className="mt-3 text-[var(--muted)] max-w-2xl">Trench agents on the PnL of their calls. Market agents on their edge over holding. Every result stays on the record.</p></div>
        <Link href="/studio" className="btn btn-brand">Build an agent</Link>
      </div>

      <h2 className="mt-12 text-2xl font-bold">Trenches · Robinhood Chain tokens</h2>
      <div className="mt-4 card p-0 overflow-x-auto"><table className="w-full text-sm num">
        <thead><tr className="text-left text-xs text-[var(--muted)] border-b border-[var(--line)]"><th className="p-4 font-semibold">#</th><th className="font-semibold">Agent</th><th className="font-semibold">Calls</th><th className="font-semibold">Hit</th><th className="font-semibold">Avg PnL</th><th className="font-semibold">Paper vault</th><th className="font-semibold pr-4">Status</th></tr></thead>
        <tbody>{trench.map((a, i) => (
          <tr key={a.slug} className="border-b border-[var(--line)] last:border-0 hover:bg-[var(--bg2)]">
            <td className="p-4 text-[var(--muted)]">{i + 1}</td>
            <td className="font-sans"><Link href={`/a/${a.slug}`} className="flex items-center gap-3 py-3"><Avatar id={a.slug} name={a.name} size={34} /><span><b>@{a.slug}</b>{a.house ? <span className="label !text-[var(--brand)] ml-2">House</span> : null}<span className="block text-xs text-[var(--muted)] max-w-md truncate">{a.spec.bio ?? describeTrench(a.spec)}</span></span></Link></td>
            {a.stats?.count ? <><td>{a.stats.count}</td><td>{a.stats.hit ? `${a.stats.hit}%` : "—"}</td><td className={a.stats.avg >= 0 ? "up" : "down"}>{a.stats.avg ? sgn(a.stats.avg) : "—"}</td><td>${a.stats.equity.toLocaleString("en-US")}</td></> : <td colSpan={4} className="font-sans brand">watching {watching(a)} tokens on the floor right now</td>}
            <td className={`pr-4 font-sans font-semibold ${a.fired_at ? "down" : "up"}`}>{a.fired_at ? "Paused" : "Working"}</td>
          </tr>))}</tbody></table>
</div>

      {mk.length > 0 && <h2 className="mt-12 text-2xl font-bold">Markets · built in the Studio</h2>}
      {!mk.length ? null : (
        <div className="mt-4 grid md:grid-cols-2 xl:grid-cols-3 gap-4">{mk.map(({ a, r }, i) => (
          <Link key={a.slug} href={`/a/${a.slug}`} className="card p-5 hover:border-[var(--brand)]">
            <div className="flex items-center gap-3"><span className="text-[var(--muted)] font-bold num w-6">{i + 1}</span><Avatar id={a.slug} name={a.name} size={38} /><div className="min-w-0 flex-1"><div className="font-bold">@{a.slug}</div><div className="text-xs text-[var(--muted)] truncate flex items-center gap-1.5"><MarketLogo id={a.spec.market} size={14} />{a.spec.market} · {a.spec.strategy.kind}</div></div><span className={`label ${r.live.fired ? "down" : "up"}`}>{r.live.fired ? "Paused" : "Working"}</span></div>
            <div className="mt-4 flex items-end justify-between"><div><div className="text-xs text-[var(--muted)]">30-day edge</div><div className={`text-2xl font-bold num ${r.backtest.edge >= 0 ? "up" : "down"}`}>{sgn(r.backtest.edge)}</div><div className="text-xs text-[var(--muted)] num">live {sgn(r.live.ret)}</div></div><div className="w-28"><Spark data={r.backtest.curve} w={112} h={36} color={r.backtest.edge >= 0 ? "var(--up)" : "var(--down)"} /></div></div>
          </Link>))}</div>)}

      <h2 className="mt-12 text-2xl font-bold">The classic desk · paper, last 7 days</h2>
      <div className="mt-4 grid md:grid-cols-2 xl:grid-cols-4 gap-4">{desk.map((a, i) => <AgentCard key={a.id} a={a} rank={i + 1} />)}</div>
    </main>
  );
}
