"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import TokenLogo from "@/components/TokenLogo";
import NeuralOrb from "@/components/neural/NeuralOrb";

type Row = { token: string; symbol: string; name: string; fdv: number; ch24: number; buys: number; sells: number; held: boolean; holdMin: number | null; lastIn: number };
type Prof = { wallet: string; trades: number; tokens: number; holding: number; medianHoldMin: number | null; style: string; rows: Row[]; error?: string };
const k = (n: number) => (n >= 1e6 ? `$${(n / 1e6).toFixed(1)}M` : `$${(n / 1e3).toFixed(1)}K`);
const dur = (m: number) => (m < 60 ? `${Math.round(m)} min` : `${(m / 60).toFixed(1)} h`);

export default function CopyWallet() {
  const router = useRouter();
  const [w, setW] = useState(""); const [p, setP] = useState<Prof | null>(null); const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null);
  const [name, setName] = useState("");
  const read = async () => {
    setErr(null); setP(null); setBusy(true);
    const r = await fetch(`/api/wallet/${w.trim()}`).then((x) => x.json()).catch(() => ({ error: "Network error" }));
    setBusy(false); if (r.error) setErr(r.error); else { setP(r); setName(`copy-${w.trim().slice(2, 6).toLowerCase()}`); }
  };
  const launch = async () => {
    setErr(null); setBusy(true);
    const r = await fetch("/api/create", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name, kind: "copy", spec: { wallet: p!.wallet } }) }).then((x) => x.json()).catch(() => ({ error: "Network error" }));
    setBusy(false); if (r.ok) router.push(`/a/${r.slug}?new=1`); else setErr(r.error ?? "Could not launch");
  };
  return (
    <main className="mx-auto max-w-6xl px-5 py-10">
      <div className="grid lg:grid-cols-[1.5fr_1fr] gap-4 items-center"><div><div className="label mb-2">Copy any wallet</div>
        <h1 className="text-4xl md:text-6xl font-bold">Paste a wallet. Get its agent.</h1>
        <p className="mt-4 text-lg opacity-70 max-w-2xl">Golem reads the wallet straight from Robinhood Chain, shows how it trades, and builds an agent that calls its next buys in public, filtered by the Gate.</p></div>
        <NeuralOrb className="hidden lg:block h-64" /></div>
      <div className="mt-8 card p-2 flex flex-col md:flex-row gap-2">
        <input value={w} onChange={(e) => setW(e.target.value)} onKeyDown={(e) => e.key === "Enter" && read()} placeholder="0x… any Robinhood Chain wallet" className="!border-0 !text-lg flex-1 !px-4 !py-3 outline-none" />
        <button onClick={read} disabled={busy} className="btn btn-accent">{busy && !p ? "Reading the chain…" : "Read wallet"}</button>
      </div>
      {err && <p className="mt-3 down">{err}</p>}
      {p && (p.rows.length ? (
        <section className="mt-8 grid lg:grid-cols-[1fr_1.4fr] gap-4">
          <div className="card p-6">
            <div className="label">Last 24 hours</div>
            <div className="mt-2 text-3xl font-bold capitalize">{p.style}</div>
            <div className="mt-5 grid grid-cols-2 gap-4">
              <div><div className="label">Trades</div><div className="text-2xl font-bold">{p.trades}</div></div>
              <div><div className="label">Tokens</div><div className="text-2xl font-bold">{p.tokens}</div></div>
              {p.holding > 0 && <div><div className="label">Still holding</div><div className="text-2xl font-bold">{p.holding}</div></div>}
              {p.medianHoldMin != null && <div><div className="label">Typical hold</div><div className="text-2xl font-bold">{dur(p.medianHoldMin)}</div></div>}
            </div>
            <div className="mt-6 label">Agent name</div>
            <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full" />
            <button onClick={launch} disabled={busy} className="btn btn-accent mt-4 w-full">{busy ? "Launching…" : "Launch the copy agent"}</button>
            <p className="mt-3 text-sm opacity-60">Every new buy from this wallet that passes the Gate becomes a public call, on paper, at the live price.</p>
          </div>
          <div className="card p-2">
            {p.rows.slice(0, 14).map((r) => (
              <div key={r.token} className="flex items-center gap-3 p-3 border-b border-white/5 last:border-0">
                <TokenLogo addr={r.token} symbol={r.symbol} size={32} />
                <div className="flex-1 min-w-0"><div className="font-semibold">${r.symbol}</div><div className="text-sm opacity-60 truncate">{r.held ? "Holding" : r.holdMin != null ? `Held ${dur(r.holdMin)}` : "Traded"} · {k(r.fdv)} FDV</div></div>
                <div className={r.ch24 >= 0 ? "up" : "down"}>{r.ch24 >= 0 ? "+" : ""}{r.ch24.toFixed(0)}%</div>
              </div>))}
          </div>
        </section>
      ) : <p className="mt-6 opacity-70">This wallet has been quiet for 24 hours. Try one that traded today.</p>)}
    </main>
  );
}
