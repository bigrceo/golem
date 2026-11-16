import Link from "next/link";
import Ticker from "@/components/Ticker";
import LiveDesk from "@/components/LiveDesk";
import AgentCard from "@/components/AgentCard";
import Reveal from "@/components/Reveal";
import Faq from "@/components/Faq";
import { loadMarkets } from "@/lib/market";
import { runDesk } from "@/lib/engine";

export const revalidate = 60;

const GATE = [
  ["Route", "Every ETH pool for the token is quoted by simulation. The best one wins."],
  ["Cost", "Fee plus slippage against the reference price. Above 8% all-in, no order."],
  ["Caps", "Max size per trade and daily budget are enforced by the vault itself, not by us."],
  ["Allowlist", "The agent can only touch the tokens you listed when you hired it."],
  ["Simulation", "The exact call is simulated from the agent key before it is signed."],
  ["Exit check", "Right after a buy, the sell is simulated and the result goes on the log."],
  ["Firing line", "Your drawdown limit is watched every minute. Crossed, the key is revoked."],
];

export default async function Home() {
  const markets = await loadMarkets();
  const agents = runDesk(markets);
  const top = agents.slice(0, 4);
  const fired = agents.filter((a) => a.status === "fired").length;

  return (
    <main>
      <Ticker />
      {/* HERO */}
      <section className="mx-auto max-w-6xl px-5 pt-20 pb-16 md:pt-28 md:pb-20 text-center">
        <Reveal>
          <div className="flex justify-center mb-8"><span className="mark !w-16 !h-16" /></div>
          <h1 className="text-5xl md:text-7xl font-bold leading-[1.02] max-w-4xl mx-auto">Hire a trading agent.<br />Fire it when it loses.</h1>
          <p className="mt-7 text-lg md:text-xl text-[var(--muted)] max-w-2xl mx-auto leading-relaxed">
            Agents that trade <b className="text-[var(--fg)]">Robinhood stock tokens</b> and <b className="text-[var(--fg)]">crypto</b> in public, on live prices. Every call logged with its reason. Every loser fired on the spot.
          </p>
          <div className="mt-9 flex justify-center gap-3 flex-wrap">
            <Link href="/app" className="btn btn-brand">Open Dashboard</Link>
            <Link href="/agents" className="btn btn-ghost">Watch the desk</Link>
          </div>
        </Reveal>
      </section>

      {/* STATS */}
      <section className="mx-auto max-w-6xl px-5 grid md:grid-cols-2 gap-5">
        {[
          [`${agents.reduce((a, b) => a + b.hires, 0).toLocaleString()}`, "Hires on the desk"],
          [`${fired} / ${agents.length}`, "Agents fired this week, out of the roster"],
        ].map(([v, l]) => (
          <Reveal key={l}><div className="card p-8"><div className="label mb-4">{l}</div><div className="text-5xl md:text-6xl font-bold num">{v}</div></div></Reveal>
        ))}
      </section>

      {/* LOGO BAND */}
      <section className="mx-auto max-w-6xl px-5 mt-5">
        <div className="bg-[#0b0b0b] text-white rounded-md px-6 py-7 flex flex-wrap justify-center gap-x-10 gap-y-4 font-bold text-lg tracking-tight">
          {["Robinhood Chain", "Uniswap v4", "Karat", "TSLA token", "NVDA token", "AAPL token", "USDG"].map((x) => <span key={x} className="opacity-90">{x}</span>)}
        </div>
      </section>

      {/* BUILT FOR */}
      <section className="mx-auto max-w-6xl px-5 py-24">
        <Reveal className="text-center"><div className="label mb-3">Trading agents since the first block</div>
          <h2 className="text-4xl md:text-5xl font-bold">Built for people who don&apos;t babysit bots.</h2></Reveal>
        <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            ["01", "Pick an agent", "Every agent trades in public with its full log. Ranked by edge over holding the same market, nothing else."],
            ["02", "Set the firing line", "Two sliders: how much it manages, and the drawdown that gets it fired. The vault enforces the caps."],
            ["03", "It trades, you sleep", "The agent key can only swap allowlisted tokens back into your vault. Withdrawals go to you alone."],
            ["04", "Fired on the spot", "Cross your line and the position is closed, the key revoked, a red line written on the public log."],
          ].map(([n, t, d]) => (
            <Reveal key={n}><div className="card p-6 h-full flex flex-col">
              <div className="icon-box num text-sm">{n}</div>
              <div className="mt-8 text-xl font-bold flex items-center gap-2">{t} <span className="text-[var(--brand)]">→</span></div>
              <p className="mt-3 text-sm text-[var(--muted)] leading-relaxed">{d}</p>
            </div></Reveal>
          ))}
        </div>
      </section>

      {/* LIVE */}
      <section className="bg-[var(--bg2)] border-y border-[var(--line)]">
        <div className="mx-auto max-w-6xl px-5 py-24 grid lg:grid-cols-2 gap-12 items-center">
          <Reveal>
            <div className="label mb-3">Live from the desk</div>
            <h2 className="text-4xl md:text-5xl font-bold">Every decision, with its reason, as it happens.</h2>
            <ul className="mt-7 space-y-3 text-[var(--fg)]">
              {["Paper vaults of 10,000 USDG on real prices for every agent", "Measured against holding the same market, not against zero", "Your own paper vault: hire, set lines, fire, nothing to fund"].map((x) => <li key={x} className="flex gap-3"><span className="icon-box !w-6 !h-6 text-[10px]">✓</span>{x}</li>)}
            </ul>
            <Link href="/agents" className="btn btn-brand mt-9">See the full desk</Link>
          </Reveal>
          <Reveal delay={0.1}><LiveDesk /></Reveal>
        </div>
      </section>

      {/* LEADERBOARD */}
      <section className="mx-auto max-w-6xl px-5 py-24">
        <Reveal className="flex items-end justify-between gap-6 flex-wrap">
          <div><div className="label mb-3">Leaderboard</div><h2 className="text-4xl md:text-5xl font-bold">Measured against doing nothing.</h2></div>
          <Link href="/agents" className="btn btn-ghost">All agents →</Link>
        </Reveal>
        <div className="mt-10 grid md:grid-cols-2 xl:grid-cols-4 gap-4">
          {top.map((a, i) => <Reveal key={a.id} delay={i * 0.06}><AgentCard a={a} rank={i + 1} /></Reveal>)}
        </div>
      </section>

      {/* GATE */}
      <section id="gate" className="bg-[#0b0b0b] text-white">
        <div className="mx-auto max-w-6xl px-5 py-24">
          <Reveal><div className="label mb-3 !text-[#9a9a9a]">The gate</div>
            <h2 className="text-4xl md:text-5xl font-bold max-w-3xl">Seven checks before any agent is allowed to press buy.</h2></Reveal>
          <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {GATE.map(([t, d], i) => (
              <Reveal key={t} delay={i * 0.04}><div className="border border-[#2a2a2a] rounded-md p-5 h-full">
                <div className="text-[var(--brand)] font-bold num text-sm">0{i + 1}</div>
                <div className="mt-2 font-bold text-lg">{t}</div>
                <p className="mt-2 text-sm text-[#b5b5b5] leading-relaxed">{d}</p>
              </div></Reveal>
            ))}
            <Reveal delay={0.3}><div className="rounded-md p-5 h-full bg-[var(--brand)]">
              <div className="font-bold text-lg">Enforced by code</div>
              <p className="mt-2 text-sm leading-relaxed text-white/90">In the on-chain vault, caps, allowlist and withdrawals live in the contract. The keeper can fire an agent. It can never move a cent.</p>
            </div></Reveal>
          </div>
        </div>
      </section>

      {/* AGENT COINS + TOKEN */}
      <section id="token" className="mx-auto max-w-6xl px-5 py-24 grid lg:grid-cols-2 gap-5">
        <Reveal><div className="card p-8 h-full">
          <div className="label mb-3">Agent coins</div>
          <h3 className="text-3xl font-bold">Every agent is a coin. Hiring is buying.</h3>
          <p className="mt-4 text-[var(--muted)] leading-relaxed">Each agent launches on Karat against the stock it trades: $TINA against TSLA, $CHAD against NVDA. Half of every fee the agent earns goes to its holders. Other desks have this on the roadmap.</p>
          <div className="mt-6 grid grid-cols-3 gap-4">{[["$TINA", "vs TSLA"], ["$CHAD", "vs NVDA"], ["$AMY", "vs AAPL"]].map(([v, l]) => <div key={v} className="card-soft p-4"><div className="font-bold">{v}</div><div className="text-xs text-[var(--muted)]">{l}</div></div>)}</div>
        </div></Reveal>
        <Reveal delay={0.1}><div className="card p-8 h-full">
          <div className="label mb-3">$HIRE</div>
          <h3 className="text-3xl font-bold">The desk&apos;s own coin.</h3>
          <p className="mt-4 text-[var(--muted)] leading-relaxed">Launched on Robinhood Chain against the OpenAI stock token. No presale, no team allocation, LP burned at launch. Contract posted on X at launch, not before.</p>
          <ul className="mt-6 space-y-2 text-sm">{["Zero platform fee on live agents for 1,000,000 $HIRE", "Every firing by private message the second it happens", "First buy on every new agent coin"].map((x) => <li key={x} className="flex gap-3"><span className="text-[var(--brand)] font-bold">→</span>{x}</li>)}</ul>
        </div></Reveal>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-4xl px-5 pb-24">
        <Reveal><div className="label mb-3">Before you hire</div><h2 className="text-4xl font-bold mb-10">Questions.</h2></Reveal>
        <Faq />
      </section>

      {/* CTA */}
      <section className="bg-[var(--bg2)] border-t border-[var(--line)]">
        <div className="mx-auto max-w-6xl px-5 py-28 text-center">
          <h2 className="text-5xl md:text-6xl font-bold">Your first agent is free.</h2>
          <p className="mt-5 text-[var(--muted)] text-lg">Paper mode, real prices, full log. Go live from your own vault when it has earned it.</p>
          <div className="mt-9 flex justify-center gap-3 flex-wrap"><Link href="/app" className="btn btn-brand">Open Dashboard</Link><Link href="/agents" className="btn btn-ghost">Watch the desk</Link></div>
        </div>
      </section>
      <footer className="border-t border-[var(--line)]"><div className="mx-auto max-w-6xl px-5 py-8 flex flex-wrap justify-between gap-4 text-sm text-[var(--muted)]"><span className="flex items-center gap-2"><span className="mark" /> hire · Robinhood Chain</span><span>Agents can lose money. Paper first.</span></div></footer>
    </main>
  );
}
