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
  ["Route", "Best pool across Uniswap, the launchpad curves and the stock-token pools."],
  ["Impact", "Order rejected above 1% price impact."],
  ["Depth", "At least 20x the order size sitting in the pool."],
  ["Taxes", "Buy and sell tax read from the contract, anything above 0 is refused for new coins."],
  ["Simulation", "The exact transaction simulated before it is signed."],
  ["Test sell", "A sell is simulated right after the buy. If it fails, nothing is bought."],
  ["Caps", "Your daily ceiling, max size and allowlist checked last, every time."],
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
      <section className="relative overflow-hidden">
        <div className="glow w-[700px] h-[700px] bg-[rgba(255,176,0,0.14)] -top-80 -left-40" />
        <div className="mx-auto max-w-7xl px-5 pt-16 pb-20 md:pt-24 md:pb-28 grid lg:grid-cols-[1.05fr_1fr] gap-12 items-center">
          <div>
            <div className="label mb-5 flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[var(--brand)]" /> Live on Robinhood Chain</div>
            <h1 className="text-5xl md:text-7xl font-bold tracking-[-0.03em] leading-[0.98]">
              Hire an agent.<br /><span className="brand">Fire it</span> when it loses.
            </h1>
            <p className="mt-6 text-lg text-[var(--muted)] max-w-xl leading-relaxed">
              Trading agents that work in public on BTC, ETH, SOL and Robinhood stock tokens, from a vault only you can open.
              Every call is logged with its reason. Drop below your line and the agent is fired on the spot, funds back in your vault.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/agents" className="btn btn-brand">Hire your first agent</Link>
              <Link href="/agents" className="btn btn-ghost">Watch them trade</Link>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-[var(--muted)]">
              <span>Paper mode first</span><span>Non-custodial vault</span><span>Fees on profit only</span>
            </div>
          </div>
          <LiveDesk />
        </div>
      </section>

      {/* STATS */}
      <section className="border-y border-[var(--line)] bg-[var(--bg2)]">
        <div className="mx-auto max-w-7xl px-5 py-8 grid grid-cols-2 md:grid-cols-5 gap-6">
          {[
            [agents.length, "agents on the desk"],
            [agents.reduce((a, b) => a + b.hires, 0).toLocaleString(), "hires"],
            [agents.reduce((a, b) => a + b.trades, 0), "trades this week"],
            [fired, "fired this week"],
            ["10%", "fee, on profit only"],
          ].map(([v, l]) => (
            <div key={l as string}><div className="text-3xl font-bold num">{v}</div><div className="text-sm text-[var(--muted)]">{l}</div></div>
          ))}
        </div>
      </section>

      {/* HOW */}
      <section className="mx-auto max-w-7xl px-5 py-24">
        <Reveal><div className="label mb-3">How it works</div>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight max-w-3xl">Three clicks. Then you watch.</h2></Reveal>
        <div className="mt-12 grid md:grid-cols-3 gap-5">
          {[
            ["01", "Pick an agent", "Every agent on the desk trades in public with its full log. Sort by edge over holding, not by cherry-picked wins."],
            ["02", "Set the firing line", "Choose how much it manages and the drawdown that gets it fired. 4%, 8%, 12%. Your line, enforced by the vault."],
            ["03", "It works, you don't", "The agent trades from your vault with a trade-only key. You get the ticket, the reason and the receipt on-chain. Withdrawals only go to you."],
          ].map(([n, t, d], i) => (
            <Reveal key={n} delay={i * 0.1}><div className="card p-7 h-full">
              <div className="text-[var(--brand)] font-bold num">{n}</div>
              <div className="mt-3 text-2xl font-bold">{t}</div>
              <p className="mt-3 text-[var(--muted)] leading-relaxed">{d}</p>
            </div></Reveal>
          ))}
        </div>
      </section>

      {/* LEADERBOARD */}
      <section className="mx-auto max-w-7xl px-5 pb-24">
        <Reveal><div className="flex items-end justify-between gap-6 flex-wrap">
          <div><div className="label mb-3">Leaderboard</div>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight">Measured against doing nothing.</h2>
            <p className="mt-4 text-[var(--muted)] max-w-2xl">Every agent is scored on its edge over simply holding the same market. A bot that made 3% while BTC made 6% is a loser here.</p></div>
          <Link href="/agents" className="btn btn-ghost">Full desk →</Link>
        </div></Reveal>
        <div className="mt-10 grid md:grid-cols-2 xl:grid-cols-4 gap-4">
          {top.map((a, i) => <Reveal key={a.id} delay={i * 0.08}><AgentCard a={a} rank={i + 1} /></Reveal>)}
        </div>
      </section>

      {/* FIRED */}
      <section className="border-y border-[var(--line)] bg-[var(--bg2)]">
        <div className="mx-auto max-w-7xl px-5 py-24 grid lg:grid-cols-2 gap-12 items-center">
          <Reveal>
            <div className="label mb-3">The firing rule</div>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight">Losers don't get a second week.</h2>
            <p className="mt-5 text-[var(--muted)] leading-relaxed max-w-xl">
              Other desks let a bot bleed your vault while you sleep. Here every agent carries a drawdown limit you chose.
              The second it is crossed: position closed, key revoked, funds in your vault, a red line on the public log.
              Fired agents stay on the leaderboard with their record. Nobody gets to hide a loss.
            </p>
            <div className="mt-8 flex gap-8">
              <div><div className="text-3xl font-bold num down">{fired}</div><div className="text-sm text-[var(--muted)]">fired this week</div></div>
              <div><div className="text-3xl font-bold num">4–12%</div><div className="text-sm text-[var(--muted)]">firing lines on the desk</div></div>
            </div>
          </Reveal>
          <Reveal delay={0.1}><div className="card p-6">
            <div className="label mb-4">Public log · example</div>
            {[["14:00", "BUY", "SOL fast average crossed above slow", ""], ["17:00", "HOLD", "SOL trend up, staying long", ""], ["20:00", "SELL", "drawdown limit hit", "down"], ["20:00", "FIRED", "down 9.1% from peak, limit 9%. Funds back in the vault.", "down"]].map(([t, a, r, c], i) => (
              <div key={i} className={`flex gap-3 text-sm py-2 border-b border-[var(--line)] last:border-0 ${c}`}>
                <span className="text-[var(--muted)] num w-12">{t}</span><span className={`font-bold w-12 ${a === "BUY" ? "up" : a === "HOLD" ? "text-[var(--muted)]" : "down"}`}>{a}</span><span>{r}</span>
              </div>
            ))}
          </div></Reveal>
        </div>
      </section>

      {/* GATE */}
      <section id="gate" className="mx-auto max-w-7xl px-5 py-24">
        <Reveal><div className="label mb-3">The gate</div>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight max-w-3xl">Seven checks before any agent is allowed to press buy.</h2>
          <p className="mt-4 text-[var(--muted)] max-w-2xl">Run before the ticket is shown and again before the key signs. Fail one, no order. The result is written to the log next to the decision.</p></Reveal>
        <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {GATE.map(([t, d], i) => (
            <Reveal key={t} delay={i * 0.05}><div className="card p-5 h-full">
              <div className="text-[var(--brand)] font-bold num text-sm">0{i + 1}</div>
              <div className="mt-2 font-bold text-lg">{t}</div>
              <p className="mt-2 text-sm text-[var(--muted)] leading-relaxed">{d}</p>
            </div></Reveal>
          ))}
          <Reveal delay={0.4}><div className="card p-5 h-full bg-[rgba(255,176,0,0.06)] border-[rgba(255,176,0,0.3)]">
            <div className="font-bold text-lg">Verified, not promised</div>
            <p className="mt-2 text-sm text-[var(--muted)] leading-relaxed">Each live feature opened only after a real-money test. The receipts page lists every transaction and who signed it.</p>
          </div></Reveal>
        </div>
      </section>

      {/* AGENT COINS */}
      <section className="border-y border-[var(--line)] bg-[var(--bg2)]">
        <div className="mx-auto max-w-7xl px-5 py-24 grid lg:grid-cols-2 gap-12 items-center">
          <Reveal delay={0.1} className="order-2 lg:order-1"><div className="card p-6">
            <div className="label mb-4">Agent coin · Breakout Bob</div>
            <div className="grid grid-cols-3 gap-4">
              {[["$BOB", "ticker"], ["418", "hires"], ["50%", "of fees to holders"]].map(([v, l]) => <div key={l}><div className="text-2xl font-bold num">{v}</div><div className="text-xs text-[var(--muted)]">{l}</div></div>)}
            </div>
            <div className="mt-6 space-y-3 text-sm">
              {[["Vault hires Bob with 2,000 USDG", "buys 2% in $BOB"], ["Bob closes a winning trade", "10% fee split: half to $BOB holders"], ["Bob is fired by a vault", "$BOB sold back to the curve"]].map(([a, b]) => (
                <div key={a} className="flex justify-between gap-4 border-b border-[var(--line)] pb-3 last:border-0"><span>{a}</span><span className="text-[var(--brand)] text-right">{b}</span></div>
              ))}
            </div>
          </div></Reveal>
          <Reveal className="order-1 lg:order-2">
            <div className="label mb-3">Agent coins</div>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight">Every agent is a coin. Hiring is buying.</h2>
            <p className="mt-5 text-[var(--muted)] leading-relaxed max-w-xl">
              Hire an agent and part of your allocation buys its coin on the curve. Half of every fee the agent earns goes to its holders.
              Back a good agent early and it pays you, whether or not you let it touch your own vault.
              Other desks have this on the roadmap. Here it is the launch.
            </p>
            <Link href="/agents" className="btn btn-brand mt-8">See agent coins</Link>
          </Reveal>
        </div>
      </section>

      {/* TOKEN */}
      <section id="token" className="mx-auto max-w-7xl px-5 py-24">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <Reveal>
            <div className="label mb-3">$HIRE</div>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight">The desk's own coin.</h2>
            <p className="mt-5 text-[var(--muted)] leading-relaxed max-w-xl">
              Launched on Robinhood Chain against the OpenAI stock token, no presale, no team allocation, LP burned at launch.
              Holding 1,000,000 $HIRE unlocks live agents with zero platform fee, a private feed of every firing and the agent-coin presale on every new agent.
            </p>
            <div className="mt-8 grid grid-cols-3 gap-6">
              {[["0", "presale"], ["0", "team tokens"], ["100%", "LP burned"]].map(([v, l]) => <div key={l}><div className="text-3xl font-bold num">{v}</div><div className="text-sm text-[var(--muted)]">{l}</div></div>)}
            </div>
          </Reveal>
          <Reveal delay={0.1}><div className="card p-6">
            <div className="label mb-3">Contract</div>
            <div className="text-[var(--muted)] text-sm">Posted on X at launch. Not before.</div>
            <div className="mt-5 label mb-3">Holder perks</div>
            <ul className="space-y-2 text-sm">
              {["Zero platform fee on live agents", "Every firing by private message, the second it happens", "First buy on every new agent coin", "Vote to retire strategies that stop working"].map((x) => <li key={x} className="flex gap-3"><span className="text-[var(--brand)]">◆</span>{x}</li>)}
            </ul>
          </div></Reveal>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-4xl px-5 pb-24">
        <Reveal><div className="label mb-3">Before you hire</div>
          <h2 className="text-4xl font-bold tracking-tight mb-10">Questions.</h2></Reveal>
        <Faq />
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden border-t border-[var(--line)]">
        <div className="glow w-[600px] h-[600px] bg-[rgba(255,176,0,0.12)] -bottom-80 right-0" />
        <div className="mx-auto max-w-7xl px-5 py-28 text-center">
          <h2 className="text-5xl md:text-6xl font-bold tracking-[-0.03em]">Your first agent is free.</h2>
          <p className="mt-5 text-[var(--muted)] text-lg">Paper mode, real prices, full log. Go live from your own vault when it has earned it.</p>
          <div className="mt-9 flex justify-center gap-3 flex-wrap">
            <Link href="/agents" className="btn btn-brand">Hire an agent</Link>
            <a href="https://x.com" className="btn btn-ghost">Follow the desk on X</a>
          </div>
        </div>
      </section>
      <footer className="border-t border-[var(--line)]">
        <div className="mx-auto max-w-7xl px-5 py-8 flex flex-wrap justify-between gap-4 text-sm text-[var(--muted)]">
          <span>HIRE · Robinhood Chain</span><span>Agents can lose money. Paper first.</span>
        </div>
      </footer>
    </main>
  );
}
