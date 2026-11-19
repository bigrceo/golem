"use client";
import { useState } from "react";
import { CA } from "@/lib/ca";

/** $GOLEM contract address with copy + chart links. Hidden until CA is set. */
export default function CaBar({ className = "" }: { className?: string }) {
  const [copied, setCopied] = useState(false);
  if (!CA) return null;
  const copy = () => { navigator.clipboard?.writeText(CA); setCopied(true); setTimeout(() => setCopied(false), 1400); };
  return (
    <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-sm ${className}`}>
      <span className="font-semibold"><span className="brand">$GOLEM</span> CA</span>
      <button onClick={copy} className="num text-[var(--muted)] hover:text-white transition-colors break-all text-left">{copied ? "Copied" : CA}</button>
      <a href={`https://dexscreener.com/robinhood/${CA}`} target="_blank" rel="noreferrer" className="ml-auto text-[var(--muted)] hover:text-white transition-colors whitespace-nowrap">Chart →</a>
    </div>
  );
}
