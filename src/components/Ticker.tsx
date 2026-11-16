"use client";
import { useDesk, signed } from "@/lib/useDesk";
export default function Ticker() {
  const d = useDesk(60000);
  const items = d?.markets ?? [];
  if (!items.length) return <div className="h-9 border-b border-[var(--line)]" />;
  const row = [...items, ...items, ...items, ...items];
  return (
    <div className="border-b border-[var(--line)] overflow-hidden h-9 flex items-center">
      <div className="ticker flex gap-10 whitespace-nowrap text-xs font-semibold">
        {row.map((m, i) => (
          <span key={i} className="flex gap-2 num">
            <span className="text-[var(--muted)]">{m.id}{m.kind === "stock" ? " token" : ""}</span>
            <span>${m.price.toLocaleString("en-US", { maximumFractionDigits: 2 })}</span>
            <span className={m.change24 >= 0 ? "up" : "down"}>{signed(m.change24)}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
