import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { apiGet, getFloor } from "@/lib/api";
import { HOUSE } from "@/lib/house";
import { withLogos } from "@/lib/tokenLogo";
import { matches } from "@/lib/trench";
import { marketRecord } from "@/lib/live";
import { describeTrench, k, type Trench } from "@/lib/trench";
import type { Spec } from "@/lib/rules";
import Avatar from "@/components/Avatar";
import TokenLogo from "@/components/TokenLogo";
import MarketLogo from "@/components/MarketLogo";
import Spark from "@/components/Spark";
import ShareX from "@/components/ShareX";
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
  const d = (await apiGet<Resp>(`/agents/${slug}`, 60)) ?? ((): Resp | null => { const h = HOUSE.find((x) => x.slug === slug); return h ? ({ agent: { ...h, owner: "golem", fire_reason: null } } as unknown as Resp) : null; })();
  if (!d) notFound();
  const fl = d.agent.kind === "trench" ? await getFloor() : null;
  if (d.calls?.length) d.calls = await withLogos(d.calls);
  const live = fl ? fl.tokens.filter((t) => matches(d.agent.spec, t)).slice(0, 10) : [];
  const kw = (d.agent.spec as { keyword?: string }).keyword?.toLowerCase();
  const skipped = fl && kw ? fl.tokens.filter((t) => `${t.name} ${t.symbol}`.toLowerCase().includes(kw) && !t.passed).slice(0, 10) : [];
  const a = d.agent; const fired = !!a.fired_at;
  const rec = a.kind === "market" ? await marketRecord(a.spec, a.created_at) : null;
  const liveFired = rec?.live.fired;
  return (
    <main className="mx-auto max-w-6xl px-5 py-10">
      <Link href="/agents" className="text-sm text-[var(--muted)] hover:text-white">← Leaderboard</Link>
      <div className="mt-6 flex items-center gap-4 flex-wrap">
        <Avatar id={a.slug} name={a.name} size={64} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap"><h1 className="text-4xl font-bold">@{a.slug}</h1>{a.house ? <span className="label !text-[var(--brand)]">House agent</span> : null}{(a.spec as { version?: number }).version ? <span className="label !text-[var(--brand)]">v{(a.spec as { version?: number }).version}</span> : null}<span className="label">Forward paper</span><span className={`label ${fired || liveFired ? "text-[var(--muted)]" : "up"}`}>{fired || liveFired ? "Paused" : "Working"}</span></div>
          <div className="mt-4"><ShareX slug={a.slug} line={(a.spec as { copy?: unknown }).copy ? `My agent @${a.slug} copies a wallet and calls its next buys in public.` : d.stats && d.stats.count > 0 && d.stats.avg > 0 ? `My agent @${a.slug}: ${d.stats.count} public calls, avg ${sgn(d.stats.avg)}.` : `I built a trading agent in one sentence. Watch @${a.slug} trade in public.`} /></div>
          <div className="text-[var(--muted)] flex items-center gap-2">{a.kind === "market" && <MarketLogo id={a.spec.market} size={18} />}{a.kind === "trench" ? `Trenches · ${a.spec.side === "bear" ? "bearish" : "bullish"} calls on Robinhood Chain tokens` : `Markets · ${a.spec.market}`} · launched {ago(a.created_at)}</div>
        </div>
        {!fired && !a.house && <Link href={`/studio?from=${a.slug}&v=${((a.spec as { version?: number }).version ?? 1) + 1}${a.kind === "trench" ? "&u=trench" : ""}`} className="btn btn-ghost">New version</Link>}<Link href="/studio" className="btn btn-brand">Build your own</Link>
      </div>
      <p className="mt-5 text-lg text-[var(--muted)] max-w-3xl">{a.spec.bio ?? (a.kind === "trench" ? describeTrench(a.spec) : rec?.describe)}</p>
      {(fired || liveFired) && <div className="mt-4 card p-4 text-[var(--muted)] text-sm font-semibold">Paused · record frozen, kept on the board · {a.fire_reason ?? rec?.live.decisions.find((x) => x.action === "STOP")?.reason}</div>}

      {a.kind === "trench" && !d.calls?.length && !live.length && skipped.length > 0 && <div className="mt-8 card p-6">
        <div className="label">Watching every "{kw}" token · held back by the Gate</div>
        <div className="mt-3 divide-y divide-[var(--line)]">{skipped.map((t) => (
          <a key={t.token} href={`https://dexscreener.com/robinhood/${t.pair}`} target="_blank" className="py-3 flex items-center gap-3 text-sm"><TokenLogo addr={t.token} symbol={t.symbol} image={t.image} size={30} /><b>${t.symbol}</b><span className="text-[var(--muted)] num">${k(t.fdv)} MC · ${k(t.liq)} liquidity</span><span className="ml-auto text-[var(--muted)]">{t.gate.filter((g) => !g.ok).map((g) => g.detail).join(" · ")}</span></a>))}
        </div>
      </div>}
      {a.kind === "trench" && !d.calls?.length && live.length > 0 && <div className="mt-8 card p-6">
        <div className="label">Would call right now · {live.length} tokens on the floor</div>
        <div className="mt-3 divide-y divide-[var(--line)]">{live.map((t) => (
          <a key={t.token} href={`https://dexscreener.com/robinhood/${t.pair}`} target="_blank" className="py-3 flex items-center gap-3 text-sm"><TokenLogo addr={t.token} symbol={t.symbol} image={t.image} size={30} /><b>${t.symbol}</b><span className="text-[var(--muted)] num">${k(t.fdv)} MC · ${k(t.liq)} liquidity · {t.buys_h1} buys / {t.sells_h1} sells</span><span className={`ml-auto font-bold num ${t.ch_h1 >= 0 ? "up" : "down"}`}>{t.ch_h1 >= 0 ? "+" : ""}{t.ch_h1}%</span></a>))}</div>
      </div>}
      {a.kind === "trench" && d.stats && d.calls?.length ? <>
        <div className="mt-8 stats border-y border-[var(--line)] py-6">
          {[["Calls", String(d.stats.count), ""], ["Hit rate", `${d.stats.hit}%`, ""], ["Avg PnL", sgn(d.stats.avg), d.stats.avg >= 0 ? "up" : "down"], ["Paper vault", `$${d.stats.equity.toLocaleString("en-US")}`, d.stats.equity >= 10000 ? "up" : "down"]].map(([l, v, c]) => (
            <div key={l}><div className="label mb-1">{l}</div><div className={`display text-3xl font-semibold num ${c}`}>{v}</div></div>))}
        </div>
        <div className="mt-5 grid lg:grid-cols-[1.4fr_1fr] gap-5">
          <div className="card p-6">
            <div className="label">Calls with receipts</div>

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

            </div>
          </div>
        </div>
      </> : null}

      {rec && <>
        <div className="mt-8 stats border-y border-[var(--line)] py-6">
          {[["Since launch", sgn(rec.live.ret), rec.live.ret >= 0 ? "up" : "down"], [`Holding ${a.spec.market}`, sgn(rec.live.hold), ""], ["30-day backtest edge", sgn(rec.backtest.edge), rec.backtest.edge >= 0 ? "up" : "down"], ["Backtest drawdown", `${rec.backtest.maxDD}%`, ""]].map(([l, v, c]) => (
            <div key={l}><div className="label mb-1">{l}</div><div className={`display text-3xl font-semibold num ${c}`}>{v}</div></div>))}
        </div>
        <div className="mt-5 grid lg:grid-cols-[1fr_1fr] gap-5">
          <div className="card p-6"><div className="label mb-4">30-day backtest vs holding</div>
            <div className="relative"><Spark data={rec.backtest.holdCurve} w={560} h={120} color="#4a4945" fill={false} /><div className="absolute inset-0"><Spark data={rec.backtest.curve} w={560} h={120} color={rec.backtest.edge >= 0 ? "var(--up)" : "var(--down)"} /></div></div>
            <div className="mt-3 text-sm text-[var(--muted)] num">{rec.backtest.trades} trades · {rec.backtest.winRate}% winners · live for {rec.liveHours}h</div></div>
          <div className="card p-6"><div className="label">Decision log since launch</div>
            <div className="mt-3 divide-y divide-[var(--line)]">
              {rec.live.decisions.slice(0, 14).map((x, i) => <div key={i} className="py-2.5 flex gap-3 text-sm"><span className="text-[var(--muted)] num w-12 shrink-0">{hhmm(x.t)}</span><span className={`font-bold w-12 shrink-0 ${x.action === "BUY" ? "up" : x.action === "SELL" ? "down" : "text-[var(--muted)]"}`}>{x.action}</span><span>{x.reason}</span></div>)}
              {!rec.live.decisions.length && <p className="py-3 text-sm text-[var(--muted)]">First decision at the next hourly candle.</p>}
            </div></div>
        </div>
      </>}
    </main>
  );
}
