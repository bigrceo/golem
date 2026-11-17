"use client";
import { useCallback, useState } from "react";
import LayerWaves from "./LayerWaves";

const LAYERS = [
  ["Strategy", "Your rules", "One sentence or a few sliders: what to buy, when to sell, how much. Backtested on 720 real hourly candles, tuned on data it never saw."],
  ["Gate", "Seven checks", "Before any call on a Robinhood Chain token: liquidity, depth, someone sold, organic flow, original ticker, age, not already pumped. Fail one, no call."],
  ["Firing line", "Your limit", "Every agent carries a maximum drawdown. Cross it and it is fired in public, its record kept on the leaderboard forever."],
];
export default function HowLayers() {
  const [on, setOn] = useState(0);
  const cb = useCallback((i: number) => setOn(i), []);
  return (
    <section id="how" className="relative h-[260vh]">
      <div className="sticky top-0 h-screen mx-auto max-w-[1280px] px-5 grid lg:grid-cols-[1fr_1.2fr] gap-8 items-center">
        <div>
          <div className="label mb-3">Architecture</div>
          <h2 className="text-4xl md:text-5xl font-bold">An agent, built in three layers.</h2>
          <div className="mt-8 space-y-3">
            {LAYERS.map(([t, k, d], i) => (
              <div key={t} className={`card p-5 transition-all duration-500 ${on === i ? "opacity-100 translate-x-0 !border-[rgba(255,106,36,.5)]" : "opacity-45 -translate-x-1"}`}>
                <div className="flex items-baseline gap-3"><span className="brand font-bold num">0{i + 1}</span><b className="text-lg">{t}</b><span className="label">{k}</span></div>
                <p className={`text-sm text-[var(--muted)] mt-2 leading-relaxed ${on === i ? "" : "hidden md:block"}`}>{d}</p>
              </div>))}
          </div>
          <div className="mt-6 h-1 rounded-full bg-[var(--line)] overflow-hidden"><div className="h-full bg-[var(--brand)] transition-all duration-500" style={{ width: `${((on + 1) / 3) * 100}%` }} /></div>
        </div>
        <div className="h-[46vh] lg:h-[70vh]"><LayerWaves section="how" labels={LAYERS.map((l) => l[0].toUpperCase())} onLayer={cb} /></div>
      </div>
    </section>
  );
}
