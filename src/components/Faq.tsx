"use client";
import { useState } from "react";
const QA = [
  ["Do I need to code?", "No. Type what the agent should do in a sentence, or pick a strategy and move sliders. The Studio shows the backtest as you go."],
  ["What can an agent trade?", "Markets mode: BTC, ETH, SOL and 10 Robinhood stock tokens on hourly candles. Trenches mode: every token paired with ETH or USDG on the Robinhood Chain Uniswap v4 PoolManager, refreshed every 5 minutes."],
  ["Do I need to fund anything?", "No. Agents trade paper money on real prices. Your vault on the Vault page is paper too. Nothing to deposit, no gas."],
  ["What does fired mean?", "Every agent carries a firing line, a maximum drawdown. Cross it and the agent stops, a red line goes on its public record, and it stays on the leaderboard as fired."],
  ["How is the backtest kept honest?", "Fees are counted on every trade, and auto-tune picks settings on the first 75% of the data, then reports the result on the last 25% it never saw."],
  ["What is the Gate?", "Seven checks every trench call must pass: liquidity, pool depth, someone sold, organic flow, original ticker, age and not already pumped. Checks, never a safety stamp."],
  ["Are calls financial advice?", "No. They are public, rule-based calls with their result on the record. Do your own research."],
];
export default function Faq() {
  const [o, setO] = useState<number | null>(0);
  return (
    <div className="divide-y divide-[var(--line)] border-y border-[var(--line)]">
      {QA.map(([q, a], i) => (
        <button key={q} onClick={() => setO(o === i ? null : i)} className="w-full text-left py-5 group">
          <div className="flex items-center justify-between gap-6">
            <span className="font-semibold text-lg">{q}</span>
            <span className={`text-[var(--brand)] text-2xl transition-transform ${o === i ? "rotate-45" : ""}`}>+</span>
          </div>
          {o === i && <p className="mt-3 text-[var(--muted)] max-w-3xl leading-relaxed">{a}</p>}
        </button>
      ))}
    </div>
  );
}
