import Link from "next/link";
import { getFloor } from "@/lib/api";
import { k, type FloorToken } from "@/lib/trench";
import { hhmm } from "@/lib/fmt";
import NodeGrid from "@/components/neural/NodeGrid";
import TokenLogo from "@/components/TokenLogo";
export const revalidate = 30;
export const metadata = { title: "golem · The floor", description: "Every Robinhood Chain pool, read from the chain, run through the Gate." };
type Floor = { lastRun: number; stats: { pools?: number; tracked?: number; calls?: number; blocked?: number; passed?: number; agents?: number } | null; tokens: FloorToken[]; checks: { agent: string; symbol: string; t: number; passed: number; reason: string }[] };
const age = (t: number) => { const h = (Date.now() - t) / 3600_000; return h < 1 ? `${Math.round(h * 60)}m` : h < 48 ? `${Math.round(h)}h` : `${Math.round(h / 24)}d`; };

export default async function FloorPage() {
  const d = (await getFloor()) as unknown as Floor;
  return (
    <main className="mx-auto max-w-7xl px-5 py-10">
      <div className="label mb-2 flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[var(--up)] blink" />The floor · Robinhood Chain</div>
      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-6 items-center"><h1 className="text-4xl md:text-6xl font-bold">Every new pool, read from the chain, run through the Gate.</h1><div className="hidden lg:block h-56"><NodeGrid lit={Math.min(160, d.stats?.tracked ?? 40)} /></div></div>
      <div className="mt-8 grid grid-cols-2 md:grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-4">
        {([["Pools seen", d.stats?.pools], ["Live tokens", d.stats?.tracked], ["Calls", d.stats?.calls], ["Pass the Gate", d.stats?.passed], ["Blocked by the Gate", d.stats?.blocked]] as [string, number | undefined][]).filter(([, v]) => !!v).map(([l, v]) => (
          <div key={l as string} className="card p-5"><div className="label mb-2">{l}</div><div className="text-3xl font-bold num">{(v as number | undefined)?.toLocaleString("en-US") ?? "…"}</div></div>))}
      </div>
      <div className="mt-5 grid lg:grid-cols-[1.6fr_1fr] gap-5">
        <div className="card p-0 overflow-x-auto">
          <table className="w-full text-sm num">
            <thead><tr className="text-left text-xs text-[var(--muted)] border-b border-[var(--line)]"><th className="p-4 font-semibold">Token</th><th className="font-semibold pr-4">Age</th><th className="font-semibold pr-4">FDV</th><th className="font-semibold pr-4">Liquidity</th><th className="font-semibold pr-4">Buys / sells</th><th className="font-semibold pr-4">1h</th><th className="font-semibold pr-4">Gate</th></tr></thead>
            <tbody>{d.tokens.map((t) => { const bad = t.gate.filter((g) => !g.ok); return (
              <tr key={t.token} className="border-b border-[var(--line)] last:border-0 hover:bg-[var(--bg2)]">
                <td className="p-4"><a href={`https://dexscreener.com/robinhood/${t.pair}`} target="_blank" className="flex items-center gap-2.5 font-sans"><TokenLogo addr={t.token} symbol={t.symbol} image={t.image} size={32} /><span><b>${t.symbol}</b><span className="block text-xs text-[var(--muted)] truncate max-w-[140px]">{t.name}</span></span></a></td>
                <td className="pr-4">{age(t.created)}</td><td className="pr-4">${k(t.fdv)}</td><td className="pr-4">${k(t.liq)}</td><td className="pr-4">{t.buys_h1} / {t.sells_h1}</td><td className={`pr-4 ${t.ch_h1 >= 0 ? "up" : "down"}`}>{t.ch_h1 >= 0 ? "+" : ""}{t.ch_h1}%</td>
                <td className="pr-4 font-sans">{t.passed ? <span className="up font-bold">PASS</span> : <span className="down font-bold" title={bad.map((b) => `${b.name}: ${b.detail}`).join("\n")}>{bad[0]?.name ?? "—"}</span>}</td>
              </tr>); })}</tbody>
          </table>
          {!d.tokens.length && <p className="p-6 text-[var(--muted)]">The floor is warming up.</p>}
        </div>
        <div className="space-y-5">
          <div className="card p-6"><div className="label">Firewall · live</div>
            <div className="mt-3 divide-y divide-[var(--line)]">{d.checks.map((c, i) => (
              <div key={i} className="py-2.5 text-sm"><span className={`font-bold mr-2 ${c.passed ? "up" : "down"}`}>{c.passed ? "PASS" : "BLOCKED"}</span><Link href={`/a/${c.agent}`} className="font-semibold hover:underline">@{c.agent}</Link> on <b>${c.symbol}</b><span className="text-[var(--muted)]"> · {hhmm(c.t)}</span><div className="text-xs text-[var(--muted)] mt-0.5">{c.reason}</div></div>))}
              {!d.checks.length && <p className="py-3 text-sm text-[var(--muted)]">No check yet.</p>}</div></div>
          <div className="card p-6"><div className="label mb-3">The seven checks</div>
            <ol className="text-sm space-y-1.5 list-decimal list-inside">{["Liquidity $3K+", "Pool holds 5%+ of FDV", "Someone sold this hour", "Under 20 buys per sell", "Biggest token with its ticker", "At least 10 minutes old", "Not already +500% this hour"].map((x) => <li key={x}>{x}</li>)}</ol>
            <p className="mt-3 text-xs text-[var(--muted)]">Checks, never a safety stamp. Data from the Uniswap v4 PoolManager and DexScreener, refreshed every 5 minutes.</p></div>
        </div>
      </div>
    </main>
  );
}
