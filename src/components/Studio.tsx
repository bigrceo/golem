"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { STRATEGIES, type Spec, type Strategy } from "@/lib/rules";
import { TRENCH_DEFAULT, matches, describeTrench, k, type Trench, type FloorToken } from "@/lib/trench";
import Spark from "./Spark";
import NeuralOrb from "./neural/NeuralOrb";
import TokenLogo from "./TokenLogo";

const MARKETS = ["BTC", "ETH", "SOL", "TSLA", "NVDA", "AAPL", "MSFT", "AMZN", "GOOGL", "META", "COIN", "SPY", "QQQ"];
const EXAMPLES = [
  "Buy ETH when RSI drops below 25, sell above 70, stop loss 5%, max drawdown 12%",
  "Momentum on Tesla, 48 hours high, take profit 20%",
  "NVDA 9/21 cross with half the vault",
  "Buy the dip on BTC in an uptrend",
];
type BT = { ret: number; hold: number; edge: number; maxDD: number; trades: number; winRate: number; curve: number[]; holdCurve: number[]; decisions: { t: number; action: string; reason: string }[]; describe: string; fired: boolean };
type Row = { kind: Strategy["kind"]; name: string; defaults: { ret: number; edge: number; maxDD: number; trades: number }; best: { strategy: Strategy; ret: number; edge: number; maxDD: number; trades: number; outOfSample: { ret: number; hold: number; edge: number } } };
const sgn = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
const DEFAULT_SPEC: Spec = { market: "BTC", strategy: STRATEGIES.momentum.defaults, size: 1, tp: 0, sl: 0, maxHold: 0, fireLine: 10 };

export default function Studio() {
  const router = useRouter();
  const [universe, setUniverse] = useState<"market" | "trench">("market");
  const [text, setText] = useState("");
  const [understood, setUnderstood] = useState<string[]>([]);
  const [spec, setSpec] = useState<Spec>(DEFAULT_SPEC);
  const [trench, setTrench] = useState<Trench>(TRENCH_DEFAULT);
  const [bt, setBt] = useState<BT | null>(null);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [comparing, setComparing] = useState(false);
  const [floor, setFloor] = useState<FloorToken[]>([]);
  const [name, setName] = useState("");
  const [launching, setLaunching] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { fetch("/api/floor").then((r) => r.json()).then((d) => setFloor(d.tokens ?? [])).catch(() => {}); }, []);
  useEffect(() => { const q = new URLSearchParams(location.search); const t = q.get("q"); if (t) parseText(t); if (q.get("u") === "trench") setUniverse("trench"); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (universe !== "market") return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setLoading(true);
      const r = await fetch("/api/backtest", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(spec) }).then((x) => x.json()).catch(() => null);
      if (r && !r.error) setBt(r); setLoading(false);
    }, 250);
  }, [spec, universe]);
  useEffect(() => { setRows(null); }, [spec.market]);

  const parseText = async (t = text) => {
    if (!t.trim()) return; setText(t);
    const r = await fetch("/api/parse", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: t }) }).then((x) => x.json());
    if (r.spec) { setUniverse("market"); setSpec(r.spec); setUnderstood(r.understood); }
  };
  const runCompare = async () => { setComparing(true); const r = await fetch("/api/compare", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(spec) }).then((x) => x.json()); setRows(r.rows); setComparing(false); };
  const setParam = (key: string, v: number) => setSpec((s) => ({ ...s, strategy: { ...s.strategy, [key]: v } as Strategy }));
  const meta = STRATEGIES[spec.strategy.kind];
  const live = useMemo(() => floor.filter((t) => matches(trench, t)), [floor, trench]);

  const launch = async () => {
    setErr(null); setLaunching(true);
    const r = await fetch("/api/create", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name, kind: universe, spec: universe === "market" ? spec : trench }) }).then((x) => x.json()).catch(() => ({ error: "Network error" }));
    setLaunching(false);
    if (r.ok) router.push(`/a/${r.slug}`); else setErr(r.error ?? "Could not launch");
  };

  return (
    <main className="mx-auto max-w-7xl px-5 py-10">
      <div className="grid lg:grid-cols-[1.5fr_1fr] gap-4 items-center"><div><div className="label mb-2">Agent Studio · no code</div>
      <h1 className="text-4xl md:text-6xl font-bold max-w-4xl">Say what it should do. Watch it trade.</h1></div><NeuralOrb className="hidden lg:block h-64" /></div>

      {/* SENTENCE */}
      <div className="mt-8 card p-2 flex flex-col md:flex-row gap-2">
        <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && parseText()} placeholder="Buy ETH when RSI drops below 25, sell above 70, max drawdown 12%" className="!border-0 !text-lg flex-1 !px-4 !py-3 outline-none" />
        <button onClick={() => parseText()} className="btn btn-accent">Build it</button>
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
        {EXAMPLES.map((e) => <button key={e} onClick={() => parseText(e)} className="text-[var(--muted)] hover:text-white underline-offset-4 hover:underline text-left">{e}</button>)}
      </div>
      {understood.length > 0 && <div className="mt-4 text-sm"><span className="label mr-3">Understood</span>{understood.join(" · ")}</div>}

      {/* UNIVERSE */}
      <div className="mt-8 inline-flex card p-1 gap-1">
        {([["market", "Markets · crypto + stock tokens"], ["trench", "Trenches · Robinhood Chain tokens"]] as const).map(([v, l]) => (
          <button key={v} onClick={() => setUniverse(v)} className={`btn !py-2 !px-4 text-sm ${universe === v ? "btn-brand" : "!bg-transparent"}`}>{l}</button>
        ))}
      </div>

      <div className="mt-5 grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] gap-5">
        {/* BUILDER */}
        <div className="card p-6 space-y-6">
          {universe === "market" ? (
            <>
              <div>
                <div className="label mb-3">Market</div>
                <div className="flex flex-wrap gap-2">{MARKETS.map((m) => <button key={m} onClick={() => setSpec({ ...spec, market: m })} className={`btn !py-1.5 !px-3 text-sm ${spec.market === m ? "btn-brand" : "btn-ghost"}`}>{m}</button>)}</div>
              </div>
              <div>
                <div className="label mb-3">Strategy</div>
                <div className="grid sm:grid-cols-2 gap-2">
                  {(Object.keys(STRATEGIES) as Strategy["kind"][]).map((kk) => (
                    <button key={kk} onClick={() => setSpec({ ...spec, strategy: STRATEGIES[kk].defaults })} className={`text-left card-soft p-3 ${spec.strategy.kind === kk ? "!border-[var(--brand)] !bg-[var(--bg2)]" : ""}`}>
                      <div className="font-bold text-sm">{STRATEGIES[kk].name}</div><div className="text-xs text-[var(--muted)] mt-1">Buys when {STRATEGIES[kk].buys}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-x-6 gap-y-4">
                {meta.params.map((p) => { const v = (spec.strategy as unknown as Record<string, number>)[p.key]; return (
                  <Slider key={p.key} label={p.label} value={v} min={p.min} max={p.max} step={p.step} unit={p.unit} onChange={(x) => setParam(p.key, x)} />); })}
              </div>
              <div>
                <div className="label mb-3">Exits and risk · on top of the strategy</div>
                <div className="grid sm:grid-cols-2 gap-x-6 gap-y-4">
                  <Slider label="Take profit" value={spec.tp ?? 0} min={0} max={100} step={1} unit="%" off onChange={(x) => setSpec({ ...spec, tp: x })} />
                  <Slider label="Stop loss" value={spec.sl ?? 0} min={0} max={50} step={0.5} unit="%" off onChange={(x) => setSpec({ ...spec, sl: x })} />
                  <Slider label="Time stop" value={spec.maxHold ?? 0} min={0} max={168} step={1} unit="h" off onChange={(x) => setSpec({ ...spec, maxHold: x })} />
                  <Slider label="Size per entry" value={Math.round(spec.size * 100)} min={10} max={100} step={5} unit="%" onChange={(x) => setSpec({ ...spec, size: x / 100 })} />
                  <Slider label="Safety line" value={spec.fireLine} min={2} max={40} step={1} unit="% drawdown" accent onChange={(x) => setSpec({ ...spec, fireLine: x })} />
                </div>
              </div>
            </>
          ) : (
            <>
              <div>
                <div className="label mb-3">Side</div>
                <div className="flex gap-2">
                  <button onClick={() => setTrench({ ...trench, side: "bull", copycatsOnly: false })} className={`btn !py-2 text-sm ${trench.side === "bull" ? "btn-brand" : "btn-ghost"}`}>Bullish calls</button>
                  <button onClick={() => setTrench({ ...trench, side: "bear", copycatsOnly: true, minBuysH1: 0, minBuyRatio: 0 })} className={`btn !py-2 text-sm ${trench.side === "bear" ? "btn-brand" : "btn-ghost"}`}>Bearish on copycats</button>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-x-6 gap-y-4">
                <Slider label="Max token age" value={trench.maxAgeH} min={1} max={72} step={1} unit="h" onChange={(x) => setTrench({ ...trench, maxAgeH: x })} />
                <Slider label="Min liquidity" value={trench.minLiq} min={1000} max={100000} step={1000} prefix="$" onChange={(x) => setTrench({ ...trench, minLiq: x })} />
                <Slider label="Min FDV" value={trench.minFdv} min={1000} max={500000} step={1000} prefix="$" onChange={(x) => setTrench({ ...trench, minFdv: x })} />
                <Slider label="Max FDV" value={trench.maxFdv} min={10000} max={5000000} step={10000} prefix="$" onChange={(x) => setTrench({ ...trench, maxFdv: x })} />
                {trench.side === "bull" && <>
                  <Slider label="Min buys this hour" value={trench.minBuysH1} min={0} max={300} step={5} onChange={(x) => setTrench({ ...trench, minBuysH1: x })} />
                  <Slider label="Min buys per sell" value={trench.minBuyRatio} min={0} max={5} step={0.1} onChange={(x) => setTrench({ ...trench, minBuyRatio: x })} />
                  <Slider label="Max 1h pump" value={trench.maxChH1} min={0} max={1000} step={10} unit="%" onChange={(x) => setTrench({ ...trench, maxChH1: x })} />
                  <Slider label="Min 5-min momentum" value={trench.minChM5} min={-100} max={50} step={1} unit="%" off offAt={-100} onChange={(x) => setTrench({ ...trench, minChM5: x })} />
                </>}
              </div>
              <div>
                <div className="label mb-3">Exits and risk</div>
                <div className="grid sm:grid-cols-2 gap-x-6 gap-y-4">
                  <Slider label="Take profit" value={trench.tp} min={5} max={300} step={5} unit="%" onChange={(x) => setTrench({ ...trench, tp: x })} />
                  <Slider label="Stop" value={trench.sl} min={5} max={80} step={1} unit="%" onChange={(x) => setTrench({ ...trench, sl: x })} />
                  <Slider label="Time stop" value={trench.maxHold} min={1} max={72} step={1} unit="h" onChange={(x) => setTrench({ ...trench, maxHold: x })} />
                  <Slider label="Safety line" value={trench.fireLine} min={5} max={60} step={1} unit="% drawdown" accent onChange={(x) => setTrench({ ...trench, fireLine: x })} />
                </div>
              </div>
            </>
          )}
        </div>

        {/* PREVIEW */}
        <div className="space-y-5">
          {universe === "market" ? (
            <div className="card p-6">
              <div className="flex items-center justify-between"><div className="label">Backtest · last 720 hourly candles</div><span className="text-xs text-[var(--muted)]">{loading ? "running…" : "real prices"}</span></div>
              {bt && <>
                <p className="mt-3 text-sm">{bt.describe}</p>
                <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[["Return", sgn(bt.ret), bt.ret >= 0 ? "up" : "down"], [`Holding ${spec.market}`, sgn(bt.hold), ""], ["Edge", sgn(bt.edge), bt.edge >= 0 ? "up" : "down"], ["Max drawdown", `${bt.maxDD}%`, ""]].map(([l, v, c]) => (
                    <div key={l} className="card-soft p-3"><div className={`text-xl font-bold num ${c}`}>{v}</div><div className="text-xs text-[var(--muted)]">{l}</div></div>
                  ))}
                </div>
                <div className="mt-5 relative">
                  <Spark data={bt.holdCurve} w={600} h={110} color="#4a4945" fill={false} />
                  <div className="absolute inset-0"><Spark data={bt.curve} w={600} h={110} color={bt.edge >= 0 ? "var(--up)" : "var(--down)"} /></div>
                </div>
                <div className="mt-2 flex gap-5 text-xs text-[var(--muted)]"><span><span className="inline-block w-3 h-0.5 bg-[var(--up)] align-middle mr-1" />agent</span><span><span className="inline-block w-3 h-0.5 bg-[#4a4945] align-middle mr-1" />holding</span><span>{bt.trades} trades · {bt.winRate}% winners{bt.fired ? " · would have been fired" : ""}</span></div>
                <div className="mt-5 divide-y divide-[var(--line)]">
                  {bt.decisions.slice(0, 5).map((d, i) => <div key={i} className="py-2 flex gap-3 text-sm"><span className={`font-bold w-12 shrink-0 ${d.action === "BUY" ? "up" : d.action === "HOLD" ? "text-[var(--muted)]" : "down"}`}>{d.action}</span><span className="truncate">{d.reason}</span></div>)}
                </div>
              </>}
            </div>
          ) : (
            <div className="card p-6">
              <div className="flex items-center justify-between"><div className="label">Would call right now</div><span className="text-xs text-[var(--muted)]">{live.length} of {floor.length} tokens on the floor</span></div>
              <p className="mt-3 text-sm">{describeTrench(trench)}</p>
              <div className="mt-4 divide-y divide-[var(--line)]">
                {live.slice(0, 8).map((t) => (
                  <a key={t.token} href={`https://dexscreener.com/robinhood/${t.pair}`} target="_blank" className="py-2.5 flex items-center gap-3 text-sm hover:bg-[var(--bg2)] -mx-2 px-2 rounded">
                    <TokenLogo addr={t.token} symbol={t.symbol} image={t.image} />
                    <span className="font-bold w-24 truncate">${t.symbol}</span><span className="text-[var(--muted)] num flex-1">${k(t.fdv)} FDV · ${k(t.liq)} liq</span><span className={`num font-semibold ${t.ch_h1 >= 0 ? "up" : "down"}`}>{t.ch_h1 >= 0 ? "+" : ""}{t.ch_h1}% 1h</span>
                  </a>
                ))}
                {!live.length && <p className="py-4 text-sm text-[var(--muted)]">Nothing on the floor matches these rules right now. Loosen a filter, or launch it and it will call the next one that does.</p>}
              </div>
            </div>
          )}

          {universe === "market" && (
            <div className="card p-6">
              <div className="flex items-center justify-between gap-3"><div className="label">Compare every strategy on {spec.market}</div><button onClick={runCompare} disabled={comparing} className="btn btn-ghost !py-1.5 !px-3 text-sm">{comparing ? "Tuning…" : rows ? "Run again" : "Compare + auto-tune"}</button></div>
              {rows && <div className="mt-4 overflow-x-auto"><table className="w-full text-sm num">
                <thead><tr className="text-left text-xs text-[var(--muted)]"><th className="py-2 font-semibold">Strategy</th><th className="font-semibold">Default edge</th><th className="font-semibold">Tuned edge</th><th className="font-semibold">Unseen data</th><th /></tr></thead>
                <tbody>{rows.map((r) => (
                  <tr key={r.kind} className="border-t border-[var(--line)]"><td className="py-2.5 font-semibold font-sans">{r.name}</td><td className={r.defaults.edge >= 0 ? "up" : "down"}>{sgn(r.defaults.edge)}</td><td className={r.best.edge >= 0 ? "up" : "down"}>{sgn(r.best.edge)}</td><td className={r.best.outOfSample.edge >= 0 ? "up" : "down"}>{sgn(r.best.outOfSample.edge)}</td>
                    <td className="text-right"><button onClick={() => setSpec({ ...spec, strategy: r.best.strategy })} className="btn btn-brand !py-1 !px-3 text-xs">Use</button></td></tr>
                ))}</tbody></table>
                <p className="mt-3 text-xs text-[var(--muted)]">Tuned on the first 75% of the data, then scored on the last 25% it never saw. Edge is return minus simply holding.</p></div>}
            </div>
          )}

          {/* LAUNCH */}
          <div className="card p-6 bg-[#070807] text-white border-y border-[var(--line)] !border-[var(--brand)]">
            <div className="label !text-[#9a9a9a]">Launch in public</div>
            <div className="mt-3 flex flex-col sm:flex-row gap-2">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name your agent" maxLength={24} className="!bg-[#161616] !border-[#2a2a2a] !text-white flex-1" />
              <button onClick={launch} disabled={launching} className="btn btn-accent">{launching ? "Launching…" : "Launch agent"}</button>
            </div>
            {err && <p className="mt-2 text-sm text-[#ff8a7a]">{err}</p>}
            <p className="mt-3 text-xs text-[#9a9a9a]">It gets a public page, a decision log and a seat on the leaderboard. Paper money, real prices, nothing to fund. Every move lands on its public page.</p>
          </div>
        </div>
      </div>
    </main>
  );
}

function Slider({ label, value, min, max, step, unit, prefix, onChange, off, offAt, accent }: { label: string; value: number; min: number; max: number; step: number; unit?: string; prefix?: string; onChange: (v: number) => void; off?: boolean; offAt?: number; accent?: boolean }) {
  const isOff = off && value === (offAt ?? 0);
  return (
    <label className="block text-sm">
      <div className="flex justify-between"><span className="text-[var(--muted)]">{label}</span><span className={`font-bold num ${accent ? "brand" : ""}`}>{isOff ? "off" : `${prefix ?? ""}${prefix === "$" ? k(value) : value}${unit && !isOff ? (unit.startsWith("%") || unit === "h" || unit === "σ" ? unit : " " + unit) : ""}`}</span></div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(+e.target.value)} className="w-full mt-1.5" />
    </label>
  );
}
