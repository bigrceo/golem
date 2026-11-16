"use client";
import { useEffect, useState } from "react";

type A = { id: string; name: string; handle: string; fireAt: number; status: string; hires: number; live?: boolean };
export default function HireBox({ agent }: { agent: A }) {
  const [amt, setAmt] = useState(1000);
  const [line, setLine] = useState(Math.round(agent.fireAt * 100));
  const [hired, setHired] = useState<null | { at: number; amt: number; line: number }>(null);
  const key = `hire:${agent.id}`;
  useEffect(() => { try { const v = localStorage.getItem(key); if (v) setHired(JSON.parse(v)); } catch {} }, [key]);
  const hire = () => { const h = { at: Date.now(), amt, line }; setHired(h); try { localStorage.setItem(key, JSON.stringify(h)); } catch {} };
  const fire = () => { setHired(null); try { localStorage.removeItem(key); } catch {} };
  const coin = Math.round(amt * 0.02);

  return (
    <div className="card p-6 h-fit lg:sticky lg:top-24">
      <div className="label mb-2">Hire {agent.name}</div>
      {hired ? (
        <>
          <div className="text-2xl font-bold">Working for you.</div>
          <p className="mt-2 text-sm text-[var(--muted)]">Paper vault of {hired.amt.toLocaleString()} USDG, fired at {hired.line}% drawdown. Hired {new Date(hired.at).toLocaleDateString()}.</p>
          <button onClick={fire} className="btn btn-ghost mt-6 w-full justify-center down">Fire {agent.name.split(" ")[1]}</button>
        </>
      ) : (
        <>
          <div className="text-2xl font-bold">Paper first. Free.</div>
          <label className="block mt-6 text-sm"><span className="text-[var(--muted)]">Vault size (USDG)</span>
            <input type="range" min={100} max={10000} step={100} value={amt} onChange={(e) => setAmt(+e.target.value)} className="w-full accent-[var(--brand)] mt-2" />
            <div className="font-bold num text-lg">{amt.toLocaleString()} USDG</div></label>
          <label className="block mt-5 text-sm"><span className="text-[var(--muted)]">Firing line (max drawdown)</span>
            <input type="range" min={2} max={20} step={1} value={line} onChange={(e) => setLine(+e.target.value)} className="w-full accent-[var(--brand)] mt-2" />
            <div className="font-bold num text-lg">{line}%</div></label>
          <div className="mt-5 text-sm text-[var(--muted)] space-y-1">
            <div className="flex justify-between"><span>Buys ${agent.handle.toUpperCase()} on the curve</span><span className="num text-[var(--fg)]">{coin} USDG</span></div>
            <div className="flex justify-between"><span>Platform fee</span><span className="num text-[var(--fg)]">10% of profit</span></div>
            <div className="flex justify-between"><span>Already hired by</span><span className="num text-[var(--fg)]">{agent.hires} vaults</span></div>
          </div>
          <button onClick={hire} disabled={agent.status === "fired"} className="btn btn-brand mt-6 w-full justify-center disabled:opacity-40">
            {agent.status === "fired" ? "Fired, not for hire" : `Hire ${agent.name.split(" ")[1]} in paper`}
          </button>
          {agent.live ? <a href="/app" className="btn btn-ghost mt-3 w-full justify-center">Hire live from your vault →</a> : <p className="mt-3 text-xs text-[var(--muted)]">Paper only for now: this market has no deep ETH pool on Robinhood Chain yet.</p>}
        </>
      )}
    </div>
  );
}
