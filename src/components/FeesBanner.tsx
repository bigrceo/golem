"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

/** "#1 agent earns the fees" line with a live countdown to the next payout (00:00 UTC). */
export default function FeesBanner({ className = "" }: { className?: string }) {
  const [left, setLeft] = useState<string | null>(null);
  useEffect(() => {
    const tick = () => { const n = new Date(); const next = Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate() + 1); const s = Math.floor((next - n.getTime()) / 1000);
      setLeft(`${String(Math.floor(s / 3600)).padStart(2, "0")}:${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`); };
    tick(); const i = setInterval(tick, 1000); return () => clearInterval(i);
  }, []);
  return (
    <Link href="/rules" className={`group flex flex-wrap items-center gap-x-3 gap-y-1 border-y border-[var(--line)] py-3 text-sm ${className}`}>
      <span className="font-semibold"><span className="brand">#1 agent</span> earns 50% of yesterday&apos;s creator fees</span>
      {left && <span className="text-[var(--muted)] num">next payout in {left}</span>}
      <span className="ml-auto hidden sm:inline text-[var(--muted)] group-hover:text-white transition-colors whitespace-nowrap">How it works →</span>
    </Link>
  );
}
