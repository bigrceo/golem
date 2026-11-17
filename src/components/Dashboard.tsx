"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AGENTS } from "@/lib/engine";
import { money, signed, hhmm } from "@/lib/fmt";
import Spark from "./Spark";
import Avatar from "./Avatar";

type Hire = { id: string; agentId: string; since: number; cash: number; fireAt: number; firedAt?: number; finalEquity?: number; firedReason?: string };
type Vault = { createdAt: number; deposit: number; hires: Hire[] };
type Dec = { t: number; action: string; market: string; reason: string; price: number };
type Res = { id: string; agentId: string; name: string; strategy: string; markets: string[]; equity: number; pnl: number; holdPnl: number; edge: number; maxDrawdown: number; status: "working" | "fired"; curve: number[]; decisions: Dec[]; trades: number; inPosition: boolean };

const KEY = "hire:vault:v1";
const tone: Record<string, string> = { BUY: "up", SELL: "down", HOLD: "text-[var(--muted)]", FIRED: "down" };
const load = (): Vault | null => { try { const v = localStorage.getItem(KEY); return v ? JSON.parse(v) : null; } catch { return null; } };
const save = (v: Vault | null) => { try { if (v) localStorage.setItem(KEY, JSON.stringify(v)); else localStorage.removeItem(KEY); } catch {} };

export default function Dashboard() {
  const [vault, setVault] = useState<Vault | null>(null);
  const [ready, setReady] = useState(false);
  const [res, setRes] = useState<Record<string, Res>>({});
  const [deposit, setDeposit] = useState(10000);
  const [agentId, setAgentId] = useState(AGENTS[0].id);
  const [alloc, setAlloc] = useState(2500);
  const [line, setLine] = useState(8);
  const [updated, setUpdated] = useState(0);

  useEffect(() => { setVault(load()); setReady(true); const q = new URLSearchParams(location.search).get("agent"); if (q && AGENTS.some((a) => a.id === q)) setAgentId(q); }, []);
  const commit = (v: Vault | null) => { setVault(v); save(v); };

  const refresh = useCallback(async () => {
    if (!vault?.hires.length) { setRes({}); return; }
    const r = await fetch("/api/replay", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ hires: vault.hires.map((h) => ({ id: h.id, agentId: h.agentId, since: h.since, cash: h.cash, fireAt: h.fireAt })) }) }).then((x) => x.json()).catch(() => null);
    if (!r) return;
    setRes(Object.fromEntries(r.results.filter((x: Res & { error?: string }) => !x.error).map((x: Res) => [x.id, x])));
    setUpdated(Date.now());
  }, [vault]);
  useEffect(() => { refresh(); const id = setInterval(refresh, 30000); return () => clearInterval(id); }, [refresh]);

  // An agent the engine fired stays fired: freeze it in the vault.
  useEffect(() => {
    if (!vault) return;
    let changed = false;
    const hires = vault.hires.map((h) => {
      const r = res[h.id];
      if (!h.firedAt && r?.status === "fired") { changed = true; const f = r.decisions.find((d) => d.action === "FIRED"); return { ...h, firedAt: f?.t ?? Date.now(), finalEquity: r.equity, firedReason: f?.reason ?? "drawdown line crossed" }; }
      return h;
    });
    if (changed) commit({ ...vault, hires });
  }, [res]); // eslint-disable-line react-hooks/exhaustive-deps

  const active = vault?.hires.filter((h) => !h.firedAt) ?? [];
  const closed = vault?.hires.filter((h) => h.firedAt) ?? [];
  const allocated = active.reduce((a, h) => a + h.cash, 0);
  const returned = closed.reduce((a, h) => a + (h.finalEquity ?? h.cash) - h.cash, 0);
  const free = vault ? vault.deposit - allocated + returned : 0;
  const working = active.reduce((a, h) => a + (res[h.id]?.equity ?? h.cash), 0);
  const total = free + working;
  const pnl = vault ? total - vault.deposit : 0;

  const log = useMemo(() => (vault?.hires ?? []).flatMap((h) => (res[h.id]?.decisions ?? []).filter((d) => d.action !== "HOLD" || d.reason.startsWith("hired")).map((d) => ({ ...d, who: res[h.id]?.name ?? h.agentId }))).sort((a, b) => b.t - a.t).slice(0, 30), [vault, res]);

  const hire = () => {
    if (!vault || alloc <= 0 || alloc > free) return;
    commit({ ...vault, hires: [...vault.hires, { id: crypto.randomUUID(), agentId, since: Date.now() - 60 * 60 * 1000, cash: alloc, fireAt: line / 100 }] });
  };
  const fire = (h: Hire) => {
    if (!vault) return;
    const r = res[h.id];
    commit({ ...vault, hires: vault.hires.map((x) => (x.id === h.id ? { ...x, firedAt: Date.now(), finalEquity: r?.equity ?? x.cash, firedReason: "fired by you" } : x)) });
  };
  const spec = AGENTS.find((a) => a.id === agentId)!;

  if (!ready) return <Shell><div className="h-64" /></Shell>;

  if (!vault) return (
    <Shell>
      <div className="grid lg:grid-cols-[1.1fr_1fr] gap-5">
        <div className="card p-8 md:p-10">
          <div className="label mb-3">Step 1</div>
          <h2 className="text-3xl md:text-4xl font-bold">Open your paper vault.</h2>
          <p className="mt-3 text-[var(--muted)] max-w-md">Real prices, virtual USDG. Hire agents, set their firing lines, watch them work. No wallet, no gas, nothing to fund.</p>
          <label className="block mt-8 text-sm"><span className="text-[var(--muted)]">Starting balance</span>
            <div className="mt-2 flex gap-2 flex-wrap">{[1000, 10000, 50000].map((v) => <button key={v} onClick={() => setDeposit(v)} className={`btn !py-2.5 ${deposit === v ? "btn-brand" : "btn-ghost"}`}>{v.toLocaleString()} USDG</button>)}</div>
          </label>
          <button onClick={() => commit({ createdAt: Date.now(), deposit, hires: [] })} className="btn btn-accent mt-8">Open vault</button>
        </div>
        <div className="card-soft p-8 md:p-10">
          <div className="label mb-5">How the vault works</div>
          {[["Hire", "Pick an agent, give it part of the vault, set the drawdown that gets it fired."], ["Watch", "It trades its market on live prices. Every call shows up in your log with the reason."], ["Fire", "Cross your line and it is fired on the spot. Or fire it yourself, anytime."]].map(([t, d], i) => (
            <div key={t} className="flex gap-4 mb-6 last:mb-0"><div className="icon-box num text-sm shrink-0">0{i + 1}</div><div><div className="font-bold">{t}</div><p className="text-sm text-[var(--muted)] mt-1">{d}</p></div></div>
          ))}
        </div>
      </div>
    </Shell>
  );

  return (
    <Shell right={<button onClick={() => { if (confirm("Close this paper vault and start over?")) commit(null); }} className="btn btn-ghost !py-2 !px-4 text-sm">Reset vault</button>}>
      {/* SUMMARY */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[["Vault value", money(total), ""], ["Since opening", `${pnl >= 0 ? "+" : ""}${money(pnl)}`, pnl >= 0 ? "up" : "down"], ["Free to allocate", money(free), ""], ["Agents", `${active.length} working · ${closed.length} fired`, ""]].map(([l, v, c]) => (
          <div key={l} className="card p-5"><div className="label mb-3">{l}</div><div className={`text-2xl font-bold num ${c}`}>{v}</div></div>
        ))}
      </div>

      <div className="mt-5 grid lg:grid-cols-[1.35fr_1fr] gap-5">
        <div className="space-y-5">
          {/* TEAM */}
          <div className="card p-6">
            <div className="flex items-center justify-between"><div className="label">Your team</div><span className="text-xs text-[var(--muted)]">{updated ? `updated ${hhmm(updated)}` : "loading…"}</span></div>
            {!vault.hires.length && <p className="mt-5 text-[var(--muted)] text-sm">Nobody hired yet. Pick an agent on the right.</p>}
            <div className="mt-4 space-y-3">
              {[...active, ...closed].map((h) => {
                const r = res[h.id]; const a = AGENTS.find((x) => x.id === h.agentId)!; const fired = !!h.firedAt;
                const eq = fired ? h.finalEquity ?? h.cash : r?.equity ?? h.cash; const p = (eq / h.cash - 1) * 100;
                return (
                  <div key={h.id} className={`card-soft p-4 ${fired ? "opacity-70" : ""}`}>
                    <div className="flex items-center gap-3">
                      <Avatar id={a.id} name={a.name} size={40} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2"><Link href={`/agents/${a.id}`} className="font-bold hover:underline">{a.name}</Link><span className={`label !tracking-[0.12em] ${fired ? "down" : "up"}`}>{fired ? "Fired" : "Working"}</span></div>
                        <div className="text-xs text-[var(--muted)] truncate">{a.strategy} · {a.markets.join("/")} · line {(h.fireAt * 100).toFixed(0)}% · {money(h.cash)}</div>
                      </div>
                      <div className="text-right"><div className="font-bold num">{money(eq)}</div><div className={`text-xs num font-semibold ${p >= 0 ? "up" : "down"}`}>{signed(p)}{!fired && r ? ` · vs hold ${signed(r.holdPnl)}` : ""}</div></div>
                    </div>
                    {r && !fired && <div className="mt-3 flex items-end justify-between gap-3"><Spark data={r.curve} w={260} h={34} color={p >= 0 ? "var(--up)" : "var(--down)"} /><button onClick={() => fire(h)} className="btn btn-ghost !py-1.5 !px-3 text-xs down">Fire</button></div>}
                    {fired && <div className="mt-2 text-xs down">{h.firedReason}</div>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* LOG */}
          <div className="card p-6">
            <div className="label">Vault log</div>
            {!log.length ? <p className="mt-5 text-[var(--muted)] text-sm">Calls show up here as your agents make them.</p> : (
              <div className="mt-3 divide-y divide-[var(--line)]">
                {log.map((d, i) => (
                  <div key={i} className="py-3 flex gap-3 text-sm items-baseline">
                    <span className="text-[var(--muted)] num w-12 shrink-0">{hhmm(d.t)}</span>
                    <span className={`font-bold w-12 shrink-0 ${tone[d.action] ?? ""}`}>{d.action}</span>
                    <span className="flex-1"><b>{d.who.split(" ")[1]}</b> · {d.reason}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* HIRE */}
        <div className="card p-6 h-fit lg:sticky lg:top-24">
          <div className="label">Hire an agent</div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {AGENTS.map((a) => (
              <button key={a.id} onClick={() => { setAgentId(a.id); setLine(Math.round(a.fireAt * 100)); }} className={`text-left card-soft p-3 flex items-center gap-2.5 ${agentId === a.id ? "!border-[var(--brand)] !bg-[var(--bg2)]" : ""}`}>
                <Avatar id={a.id} name={a.name} size={28} /><span className="min-w-0"><span className="block font-bold text-sm truncate">{a.name}</span><span className="block text-xs text-[var(--muted)]">{a.markets.join("/")}</span></span>
              </button>
            ))}
          </div>
          <p className="mt-4 text-sm text-[var(--muted)]">{spec.pitch}</p>
          <label className="block mt-5 text-sm"><span className="text-[var(--muted)]">Allocation</span>
            <input type="range" min={100} max={Math.max(100, Math.floor(free / 100) * 100)} step={100} value={Math.min(alloc, Math.max(100, free))} onChange={(e) => setAlloc(+e.target.value)} className="w-full mt-2" />
            <div className="font-bold num">{money(Math.min(alloc, free))} <span className="text-[var(--muted)] font-normal">of {money(free)} free</span></div></label>
          <label className="block mt-4 text-sm"><span className="text-[var(--muted)]">Firing line</span>
            <input type="range" min={2} max={20} value={line} onChange={(e) => setLine(+e.target.value)} className="w-full mt-2" />
            <div className="font-bold num">{line}% <span className="text-[var(--muted)] font-normal">max drawdown</span></div></label>
          <button onClick={() => { setAlloc(Math.min(alloc, free)); hire(); }} disabled={free < 100} className="btn btn-brand mt-6 w-full">Hire {spec.name.split(" ")[1]}</button>
          <p className="mt-3 text-xs text-[var(--muted)]">Paper vault on live prices. The agent starts from the last closed hourly candle.</p>
        </div>
      </div>
    </Shell>
  );
}

function Shell({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-6xl px-5 py-10">
      <div className="flex items-end justify-between gap-4 flex-wrap mb-8">
        <div><div className="label mb-2 flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[var(--up)] blink" />Dashboard · paper mode</div><h1 className="text-4xl md:text-5xl font-bold">Your vault, your team, your line.</h1></div>
        {right}
      </div>
      {children}
    </main>
  );
}
