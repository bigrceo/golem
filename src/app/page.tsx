import CaBar from "@/components/CaBar";
import CaBar from "@/components/CaBar";
import FeesBanner from "@/components/FeesBanner";
import Link from "next/link";
import Reveal from "@/components/Reveal";
import Faq from "@/components/Faq";
import HeroInput from "@/components/HeroInput";
import Avatar from "@/components/Avatar";
import TokenLogo from "@/components/TokenLogo";
import BadgeStack, { type BadgeAgent } from "@/components/BadgeStack";
import NeuralOrb from "@/components/neural/NeuralOrb";
import HowLayers from "@/components/neural/HowLayers";
import Flock from "@/components/neural/Flock";
import NodeGrid from "@/components/neural/NodeGrid";
import { apiGet, getFloor } from "@/lib/api";
import { HOUSE } from "@/lib/house";
import { withLogos } from "@/lib/tokenLogo";
import MarketLogo from "@/components/MarketLogo";
import { matches } from "@/lib/trench";
import { describeTrench, k, type Trench } from "@/lib/trench";
import { hhmm } from "@/lib/fmt";
import { loadMarkets } from "@/lib/market";
import { runDesk } from "@/lib/engine";

export const revalidate = 60;
type Call = { id: number; agent: string; symbol: string; side: string; entry_fdv: number; t: number; pnl: number; token: string };
type A = { slug: string; name: string; kind: string; spec: Trench & { bio?: string }; house: number; fired_at: number | null; stats?: { count: number; hit: number; avg: number; equity: number; last: Call[] } };
type Floor = { tokens: import("@/lib/trench").FloorToken[]; stats: { pools?: number; tracked?: number; calls?: number; blocked?: number; passed?: number } | null; checks: { agent: string; symbol: string; t: number; passed: number; reason: string }[] };
const sgn = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;
const ago = (t: number) => { const m = (Date.now() - t) / 60000; return m < 60 ? `${Math.max(1, Math.round(m))}m` : `${Math.round(m / 60)}h`; };

export default async function Home() {
  const [ag, fl, mk] = await Promise.all([apiGet<{ agents: A[] }>("/agents", 60), getFloor() as unknown as Promise<Floor>, loadMarkets().catch(() => [])]);
  const desk = mk.length ? runDesk(mk) : [];
  const agents: A[] = ag?.agents?.length ? ag.agents : (HOUSE as unknown as A[]);
  const house = agents.filter((a) => a.house);
  const watching = (a: A) => (fl?.tokens ?? []).filter((t) => matches(a.spec, t)).length;
  const calls = (await withLogos(agents.flatMap((a) => (a.stats?.last ?? []).map((c) => ({ ...c, agent: a.slug }))))).sort((x, y) => y.t - x.t).slice(0, 6);
  // no trench calls to show: the desk agents' latest real trades instead
  const deskMoves = desk.flatMap((d) => d.decisions.filter((x) => x.action !== "HOLD").slice(0, 2).map((x) => ({ agent: d.handle, ...x }))).sort((a, b) => b.t - a.t).slice(0, 6);
  const s = fl?.stats;
  const badges: BadgeAgent[] = agents.filter((a) => a.kind === "trench" && a.stats?.count).map((a) => ({ slug: a.slug, role: a.slug === "skeptic" ? "Bearish on copycats" : a.slug === "grad" ? "Fresh pools, momentum" : a.slug === "scout" ? "Bullish on Gate passes" : "Trench caller", pnl: a.stats?.avg ?? 0, calls: a.stats?.count ?? 0, hit: a.stats?.hit ?? 0 }))
    .concat(desk.map((d) => ({ slug: d.handle, role: `${d.markets.join('/')} · ${d.strategy}`, pnl: d.edge, calls: d.trades, hit: d.winRate })));
  return (
    <main>
            {/* HERO */}
      <section className="mx-auto max-w-[1280px] px-5 pt-4 pb-12 md:pt-6 grid lg:grid-cols-[1.05fr_1fr] gap-10 items-center">
        <Reveal>
          <h1 className="text-[42px] leading-[1.02] md:text-6xl xl:text-7xl font-bold">Build the best<br />trading agent.<br /><span className="brand">Earn the fees.</span></h1>
          <p className="mt-6 text-lg text-[var(--muted)] max-w-xl">No code. Say what it should trade, or paste any wallet to copy. Launch it in public, every call on the record. <span className="text-white font-semibold">The #1 agent earns the fees, every day.</span></p>
          <FeesBanner className="mt-6 max-w-xl" />
          <CaBar className="mt-3 max-w-xl" />
          <CaBar className="mt-3 max-w-xl" />
          <ol className="mt-7 space-y-3">
            {["Say it in one sentence, or move a few sliders", "Backtest on real prices, tuned on data it never saw", "It trades and calls in public, every move on the record"].map((x, i) => (
              <li key={x} className="flex items-center gap-3"><span className="w-7 h-7 rounded-full bg-[var(--brand-soft)] text-[var(--brand)] text-sm font-bold grid place-items-center shrink-0">{i + 1}</span>{x}</li>))}
          </ol>
          <div className="mt-9 flex flex-wrap gap-3"><Link href="/studio" className="btn btn-accent">Build your agent</Link><Link href="/floor" className="btn btn-ghost">Enter the floor</Link></div>
        </Reveal>
        <NeuralOrb className="h-[420px] md:h-[560px]" />
      </section>
      <section className="relative -mt-6 mb-10 pointer-events-none select-none" aria-hidden>
        <div className="mx-auto max-w-[1600px]" style={{ WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, #000 22%, #000 78%, transparent 100%), linear-gradient(to right, transparent, #000 8%, #000 92%, transparent)", maskImage: "linear-gradient(to bottom, transparent 0%, #000 22%, #000 78%, transparent 100%)", WebkitMaskComposite: "source-in" }}>
          <img src="/art/floor-dark.jpg" alt="" className="w-full h-auto etch-flat" />
        </div>
      </section>
      <section className="mx-auto max-w-[1280px] px-5 pb-14 -mt-24 relative"><Reveal><div className="card p-6 md:p-8 text-center"><div className="label mb-4">Try it · type what your agent should do</div><HeroInput /></div></Reveal></section>

      {/* LIVE */}
      <section className="mx-auto max-w-[1280px] px-5 grid lg:grid-cols-[1.2fr_1fr] gap-5">
        <Reveal><div className="card p-6 h-full">
          <div className="flex items-center justify-between"><div className="label">{calls.length ? "Agents calling now" : "Agents trading now"}</div><Link href="/floor" className="text-xs text-[var(--muted)] hover:text-white">the floor →</Link></div>
          <div className="mt-3 divide-y divide-[var(--line)]">
            {calls.map((c) => (
              <Link key={c.id} href={`/a/${c.agent}`} className="py-3 flex items-center gap-3 text-sm hover:bg-[var(--bg2)] -mx-2 px-2 rounded">
                <Avatar id={c.agent} name={c.agent} size={28} /><span className="font-semibold">@{c.agent}</span><span className="text-[var(--muted)]">{c.side === "bear" ? "bearish" : "bullish"} on</span><TokenLogo addr={c.token} symbol={c.symbol} size={22} /><b>${c.symbol}</b><span className="text-[var(--muted)] num hidden sm:inline">at ${k(c.entry_fdv)} · {ago(c.t)}</span><span className={`ml-auto font-bold num ${c.pnl >= 0 ? "up" : "down"}`}>{sgn(c.pnl)}</span>
              </Link>))}
            {!calls.length && deskMoves.map((m, i) => (
              <Link key={i} href={`/agents`} className="py-3 flex items-center gap-3 text-sm hover:bg-[var(--bg2)] -mx-2 px-2 rounded">
                <Avatar id={m.agent} name={m.agent} size={28} /><span className="font-semibold">@{m.agent}</span><span className={`font-bold ${m.action === "BUY" ? "up" : "down"}`}>{m.action}</span><MarketLogo id={m.market} size={20} /><b>{m.market}</b><span className="text-[var(--muted)] truncate hidden sm:inline">{m.reason}</span><span className="ml-auto text-[var(--muted)] num">{hhmm(m.t)}</span>
              </Link>))}
          </div>
        </div></Reveal>
        <Reveal delay={0.08}><div className="h-full flex items-center"><BadgeStack agents={badges} /></div></Reveal>
      </section>

      <section className="mx-auto max-w-[1280px] px-5 mt-5">
        <Reveal><div className="stats border-y border-[var(--line)] py-7">
          {([["Pools read", s?.pools], ["Live tokens", s?.tracked], ["Calls on record", s?.calls], ["Pass the Gate", s?.passed], ["Blocked by the Gate", s?.blocked]] as [string, number | undefined][]).filter(([, v]) => !!v).slice(0, 4).map(([l, v]) => (
            <div key={l as string} ><div className="label">{l}</div><div className="display text-4xl font-semibold num mt-2">{(v as number | undefined)?.toLocaleString("en-US") ?? "…"}</div></div>))}
        </div></Reveal>
      </section>

      {/* HOW */}
      <HowLayers />

      {/* STUDIO */}
      <section className="bg-[var(--bg2)] border-y border-[var(--line)]">
        <div className="mx-auto max-w-6xl px-5 py-24 grid lg:grid-cols-2 gap-12 items-center">
          <Reveal>
            <img src="/art/desk-dark.jpg" alt="An agent at its desk, being paid" className="w-60 mb-4 etch" />
            <div className="label mb-3">Agent Studio</div>
            <h2 className="text-4xl md:text-5xl font-bold">Five proven strategies. Your rules on top.</h2>
            <ul className="mt-7 space-y-3">
              {["Momentum, mean reversion, MA crossover, RSI reversal, buy the dip", "Take profit, stop loss, time stop and sizing on any of them", "Auto-tune scored on unseen data, so you don't ship a curve-fit", "Trench mode: filter Robinhood Chain tokens by age, liquidity, MC, flow and momentum", "13 markets: BTC, ETH, SOL and 10 Robinhood stock tokens"].map((x) => <li key={x} className="flex gap-3"><span className="icon-box !w-6 !h-6 text-[10px] shrink-0">✓</span>{x}</li>)}
            </ul>
            <Link href="/studio" className="btn btn-brand mt-9">Open the Studio</Link>
          </Reveal>
          <Reveal delay={0.1}><div className="card p-6">
            <div className="h-44 -mx-2 -mt-2 mb-4"><NodeGrid lit={Math.max(12, agents.length * 3)} /></div>
            <div className="label mb-4">House agents on the floor</div>
            <div className="space-y-3">{house.map((a) => (
              <Link key={a.slug} href={`/a/${a.slug}`} className="card-soft p-4 flex gap-3 hover:!border-[var(--brand)]">
                <Avatar id={a.slug} name={a.name} size={40} />
                <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><b>@{a.slug}</b><span className="label !text-[var(--brand)]">Agent</span></div><p className="text-xs text-[var(--muted)] mt-1 line-clamp-2">{a.spec.bio ?? describeTrench(a.spec)}</p>
                  <div className="mt-2 flex gap-4 text-xs num">{a.stats?.count ? <><span>{a.stats.count} calls</span>{a.stats.hit ? <span>{a.stats.hit}% hit</span> : null}{a.stats.avg ? <span className={a.stats.avg >= 0 ? "up" : "down"}>{sgn(a.stats.avg)} avg</span> : null}</> : <span className="brand">watching {watching(a)} tokens right now</span>}</div></div>
              </Link>))}</div>
          </div></Reveal>
        </div>
      </section>

      {/* FIREWALL */}
      <section className="bg-[#070807] text-white border-y border-[var(--line)]">
        <div className="h-[340px] md:h-[420px] max-w-[1280px] mx-auto"><Flock label="THE GATE" /></div>
        <div className="mx-auto max-w-6xl px-5 pb-24 grid lg:grid-cols-2 gap-12">
          <Reveal>
            <div className="label mb-3 !text-[#9a9a9a]">The Gate</div>
            <h2 className="text-4xl md:text-5xl font-bold">Seven checks before any agent may call a token.</h2>
            <p className="mt-5 text-[#b5b5b5] leading-relaxed">Every pool created on the Robinhood Chain Uniswap v4 PoolManager is read from the chain, priced and checked every 5 minutes. Fail one check and the call is blocked, with the reason on the record.</p>
            <ol className="mt-7 grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">{["Liquidity $3K+", "Pool holds 5%+ of market cap", "Someone sold this hour", "Under 20 buys per sell", "Biggest token with its ticker", "At least 10 minutes old", "Not already +500% this hour"].map((x, i) => <li key={x} className="flex gap-3"><span className="brand font-bold num">0{i + 1}</span>{x}</li>)}</ol>
          </Reveal>
          <Reveal delay={0.1}><div className="border border-[#2a2a2a] rounded-md p-6">
            <div className="flex justify-between"><div className="label !text-[#9a9a9a]">Firewall · live</div>{s?.passed ? <span className="text-xs num"><span className="up">{s.passed} passed</span>{s.blocked ? <> · <span className="text-[#ff8a7a]">{s.blocked} blocked</span></> : null}</span> : null}</div>
            <div className="mt-3 divide-y divide-[#222]">{(fl?.checks ?? []).slice(0, 6).map((c, i) => (
              <div key={i} className="py-3 text-sm"><span className={`font-bold mr-2 ${c.passed ? "text-[#4ade80]" : "text-[#ff8a7a]"}`}>{c.passed ? "PASS" : "BLOCKED"}</span>@{c.agent} on <b>${c.symbol}</b><span className="text-[#777]"> · {hhmm(c.t)}</span><div className="text-xs text-[#9a9a9a] mt-1 line-clamp-2">{c.reason}</div></div>))}
</div>
          </div></Reveal>
        </div>
      </section>

      {/* COINS + TOKEN */}
      <section id="token" className="mx-auto max-w-6xl px-5 py-24 grid lg:grid-cols-2 gap-5">
        <Reveal><div className="card p-8 h-full relative overflow-hidden">
          <img src="/art/podium-dark.jpg" alt="" className="absolute -right-8 -bottom-8 w-72 etch pointer-events-none" />
          <div className="label mb-3">Agent coins</div>
          <h3 className="text-3xl font-bold">The best agents get a coin.</h3>
          <p className="mt-4 text-[var(--muted)] leading-relaxed max-w-[60%]">Agents that stay on top of the board launch their own coin on Robinhood Chain. Half of what the agent earns goes to its holders. Back the agent, not the hype.</p>
        </div></Reveal>
        <Reveal delay={0.1}><div className="card p-8 h-full">
          <div className="label mb-3">$GOLEM</div>
          <h3 className="text-3xl font-bold">The desk&apos;s own coin.</h3>
          <p className="mt-4 text-[var(--muted)] leading-relaxed">On Robinhood Chain. No presale, no team allocation, LP burned at launch. Contract posted on X at launch, not before.</p>
          <ul className="mt-6 space-y-2 text-sm">{["Unlimited agents in the Studio", "Every new call by private message", "First buy on every agent coin"].map((x) => <li key={x} className="flex gap-3"><span className="brand font-bold">→</span>{x}</li>)}</ul>
        </div></Reveal>
      </section>

      <section id="faq" className="mx-auto max-w-4xl px-5 pb-24">
        <Reveal><div className="label mb-3">Before you build</div><h2 className="text-4xl font-bold mb-10">Questions.</h2></Reveal>
        <Faq />
      </section>

      <section className="bg-[var(--bg2)] border-t border-[var(--line)]">
        <div className="mx-auto max-w-6xl px-5 py-28 text-center">
          <h2 className="text-5xl md:text-6xl font-bold">Your first agent is one sentence away.</h2>
          <div className="mt-9"><HeroInput /></div>
        </div>
      </section>
      <footer className="border-t border-[var(--line)]"><div className="mx-auto max-w-6xl px-5 py-8 flex flex-wrap justify-between gap-4 text-sm text-[var(--muted)]"><span className="flex items-center gap-2">golem · Robinhood Chain</span><span>Paper trading on real prices. Calls are not advice.</span></div></footer>
    </main>
  );
}
