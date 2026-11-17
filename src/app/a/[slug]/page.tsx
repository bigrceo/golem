import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { apiGet } from "@/lib/api";
import { marketRecord } from "@/lib/live";
import { describeTrench, k, type Trench } from "@/lib/trench";
import type { Spec } from "@/lib/rules";
import Avatar from "@/components/Avatar";
import TokenLogo from "@/components/TokenLogo";
import Spark from "@/components/Spark";
import { hhmm } from "@/lib/fmt";

export const revalidate = 60;
type Agent = { slug: string; name: string; kind: "market" | "trench"; spec: Spec & Trench & { bio?: string }; owner: string; created_at: number; fired_at: number | null; fire_reason: string | null; house: number };
type Call = { id: number; token: string; symbol: string; side: string; entry_price: number; entry_fdv: number; t: number; reason: string; closed_at: number | null; exit_reason: string | null; pnl: number };
type Resp = { agent: Agent; stats?: { count: number; hit: number; avg: number; equity: number; drawdown: number }; calls?: Call[]; checks?: { t: number; symbol: string; passed: number; reason: string }[] };

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params; const d = await apiGet<Resp>(`/agents/${slug}`, 60);
  return d ? { title: `@${d.agent.slug} · golem`, description: d.agent.kind === "trench" ? describeTrench(d.agent.spec) : `A no-code agent trading ${d.agent.spec.market} in public.` } : {};
}
const sgn = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;
const ago = (t: number) => { const m = (Date.now() - t) / 60000; return m < 60 ? `${Math.round(m)}m ago` : m < 1440 ? `${Math.round(m / 60)}h ago` : `${Math.round(m / 1440)}d ago`; };

export default async function AgentProfile({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const d = await apiGet<Resp>(`/agents/${slug}`, 60);
  if (!d) notFound();
  const a = d.agent; const fired = !!a.fired_at;
  const rec = a.kind === "market" ? await marketRecord(a.spec, a.created_at) : null;
  const liveFired = rec?.live.fired;
  return (
    <main className="mx-auto max-w-6xl px-5 py-10">
      <Link href="/agents" className="text-sm text-[var(--muted)] hover:text-white">← Leaderboard</Link>
      <div className="mt-6 flex items-center gap-4 flex-wrap">
        <Avatar id={a.slug} name={a.name} size={64} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap"><h1 className="text-4xl font-bold">@{a.slug}</h1>{a.house ? <span className="label !text-[var(--brand)]">House agent</span> : null}<span className={`label ${fired || liveFired ? "down" : "up"}`}>{fired || liveFired ? "Fired" : "Working"}</span></div>
          <div className="text-[var(--muted)]">{a.kind === "trench" ? `Trenches · ${a.spec.side === "bear" ? "bearish" : "bullish"} calls on Robinhood Chain tokens` : `Markets · ${a.spec.market}`} · launched {ago(a.created_at)}</div>
        </div>
        <Link href="/studio" className="btn btn-brand">Build your own</Link>
      </div>
      <p className="mt-5 text-lg text-[var(--muted)] max-w-3xl">{a.spec.bio ?? (a.kind === "trench" ? describeTrench(a.spec) : rec?.describe)}</p>
      {(fired || liveFired) && <div className="mt-4 card p-4 border-[var(--down)] down text-sm font-semibold">Fired · {a.fire_reason ?? rec?.live.decisions.find((x) => x.action === "FIRED")?.reason}</div>}

      {a.kind === "trench" && d.stats && <>
        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[["Calls", String(d.stats.count), ""], ["Hit rate", `${d.stats.hit}%`, ""], ["Avg PnL", sgn(d.stats.avg), d.stats.avg >= 0 ? "up" : "down"], ["Paper vault", `$${d.stats.equity.toLocaleString("en-US")}`, d.stats.equity >= 10000 ? "up" : "down"]].map(([l, v, c]) => (
            <div key={l} className="card p-5"><div className="label mb-2">{l}</div><div className={`text-3xl font-bold num ${c}`}>{v}</div></div>))}
        </div>
        <div className="mt-5 grid lg:grid-cols-[1.4fr_1fr] gap-5">
          <div className="card p-6">
            <div className="label">Calls with receipts</div>
            {!d.calls?.length && <p className="mt-4 text-sm text-[var(--muted)]">No call yet. It is scanning the floor every 5 minutes.</p>}
            <div className="mt-3 divide-y divide-[var(--line)]">
              {d.calls?.map((c) => (
                <div key={c.id} className="py-3">
                  <div className="flex items-center gap-3"><TokenLogo addr={c.token} symbol={c.symbol} size={30} /><span className={`font-bold ${c.side === "bear" ? "down" : "up"}`}>{c.side === "bear" ? "BEAR" : "BULL"}</span><a href={`https://dexscreener.com/robinhood/${c.token}`} target="_blank" className="font-bold hover:underline">${c.symbol}</a><span className="text-sm text-[var(--muted)] num">at ${k(c.entry_fdv)} · {ago(c.t)}</span><span className={`ml-auto font-bold num ${c.pnl >= 0 ? "up" : "down"}`}>{sgn(c.pnl)}</span></div>
                  <div className="text-sm text-[var(--muted)] mt-1">{c.reason}</div>
                  {c.closed_at && <div className="text-xs mt-1">Closed · {c.exit_reason}</div>}
                </div>))}
            </div>
          </div>
          <div className="card p-6 h-fit">
            <div className="label">Gate log</div>
            <div className="mt-3 divide-y divide-[var(--line)]">
              {d.checks?.slice(0, 14).map((c, i) => (
                <div key={i} className="py-2.5 text-sm"><span className={`font-bold mr-2 ${c.passed ? "up" : "down"}`}>{c.passed ? "PASS" : "BLOCKED"}</span><b>${c.symbol}</b><span className="text-[var(--muted)]"> · {hhmm(c.t)}</span><div className="text-xs text-[var(--muted)] mt-0.5">{c.reason}</div></div>))}
              {!d.checks?.length && <p className="py-3 text-sm text-[var(--muted)]">Nothing checked yet.</p>}
            </div>
          </div>
        </div>
      </>}

      {rec && <>
        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[["Since launch", sgn(rec.live.ret), rec.live.ret >= 0 ? "up" : "down"], [`Holding ${a.spec.market}`, sgn(rec.live.hold), ""], ["30-day backtest edge", sgn(rec.backtest.edge), rec.backtest.edge >= 0 ? "up" : "down"], ["Backtest drawdown", `${rec.backtest.maxDD}%`, ""]].map(([l, v, c]) => (
            <div key={l} className="card p-5"><div className="label mb-2">{l}</div><div className={`text-3xl font-bold num ${c}`}>{v}</div></div>))}
        </div>
        <div className="mt-5 grid lg:grid-cols-[1fr_1fr] gap-5">
          <div className="card p-6"><div className="label mb-4">30-day backtest vs holding</div>
            <div className="relative"><Spark data={rec.backtest.holdCurve} w={560} h={120} color="#4a4945" fill={false} /><div className="absolute inset-0"><Spark data={rec.backtest.curve} w={560} h={120} color={rec.backtest.edge >= 0 ? "var(--up)" : "var(--down)"} /></div></div>
            <div className="mt-3 text-sm text-[var(--muted)] num">{rec.backtest.trades} trades · {rec.backtest.winRate}% winners · live for {rec.liveHours}h</div></div>
          <div className="card p-6"><div className="label">Decision log since launch</div>
            <div className="mt-3 divide-y divide-[var(--line)]">
              {rec.live.decisions.slice(0, 14).map((x, i) => <div key={i} className="py-2.5 flex gap-3 text-sm"><span className="text-[var(--muted)] num w-12 shrink-0">{hhmm(x.t)}</span><span className={`font-bold w-12 shrink-0 ${x.action === "BUY" ? "up" : x.action === "HOLD" ? "text-[var(--muted)]" : "down"}`}>{x.action}</span><span>{x.reason}</span></div>)}
              {!rec.live.decisions.length && <p className="py-3 text-sm text-[var(--muted)]">First decision at the next hourly candle.</p>}
            </div></div>
        </div>
      </>}
    </main>
  );
}
