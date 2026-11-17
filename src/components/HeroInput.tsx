"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
const TRIES = ["Buy ETH when RSI drops below 25, max drawdown 12%", "Momentum on Tesla, take profit 20%", "Buy the dip on BTC in an uptrend"];
export default function HeroInput() {
  const [t, setT] = useState(""); const r = useRouter();
  const go = (x = t) => r.push(`/studio?q=${encodeURIComponent(x || TRIES[0])}`);
  return (
    <div className="max-w-2xl mx-auto">
      <div className="card p-2 flex gap-2 shadow-[0_10px_40px_-20px_rgba(0,0,0,0.25)]">
        <input value={t} onChange={(e) => setT(e.target.value)} onKeyDown={(e) => e.key === "Enter" && go()} placeholder={TRIES[0]} className="!border-0 flex-1 !text-base !px-4 outline-none" />
        <button onClick={() => go()} className="btn btn-accent">Build it</button>
      </div>
      <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm">{TRIES.slice(1).map((x) => <button key={x} onClick={() => go(x)} className="text-[var(--muted)] hover:text-white hover:underline underline-offset-4">{x}</button>)}</div>
    </div>
  );
}
