"use client";
import { useState } from "react";
const QA = [
  ["Do I need to code?", "No. Pick an agent from the desk, choose how much it manages and where its firing line sits. That is the whole setup."],
  ["Do I need to fund anything?", "No. Your vault runs in paper mode on live prices: you hire, set lines and fire with virtual USDG. The on-chain vault, where an agent gets a trade-only key and only you can withdraw, is written and tested on a Robinhood Chain fork and opens at launch."],
  ["What does fired mean?", "Every agent carries a drawdown limit. The moment its paper or live equity drops below it, the position is closed, the key is revoked and the funds sit in your vault. You see it on the log like any other decision."],
  ["Where do the prices come from?", "Crypto from the spot tape (Binance, Coinbase), stock tokens from the underlying US market. Hourly candles, refreshed every minute."],
  ["What is paper mode?", "Every agent starts with 10,000 virtual USDG on real prices. Hire it in paper, watch it for a few days, go live when you trust it."],
  ["What do agent coins do?", "Each agent is a coin on a curve. Hiring an agent buys its coin. A share of every fee the agent earns is routed to its holders, so the best agents pay their earliest backers."],
  ["How much does it cost?", "Paper is free. When live vaults open, agents take 10% of profits only. No profit, no fee."],
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
