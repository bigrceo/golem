/** Floor computed on Vercel, used when the worker can't answer: pool creations from the chain + DexScreener + the Gate. */
import { unstable_cache } from "next/cache";
import type { FloorToken } from "./trench";

const RPC = "https://rpc.mainnet.chain.robinhood.com";
const PM = "0x8366a39CC670B4001A1121B8F6A443A643e40951";
const INIT = "0xdd466e674ea557f56295e2d0218a125ea4b4f0f6f3307b95f85e6110838d6438";
const BASES = new Set(["0x0000000000000000000000000000000000000000", "0x0bd7d308f8e1639fab988df18a8011f41eacad73", "0x5fc5360d0400a0fd4f2af552add042d716f1d168"]);
const RESERVED = new Set(["USDG", "USDC", "USDT", "WETH", "ETH", "TSLA", "NVDA", "AAPL", "HOOD"]);

async function rpc(method: string, params: unknown[]) {
  for (let k = 0; k < 4; k++) { const r = await fetch(RPC, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }), cache: "no-store" }).then((x) => x.json()).catch(() => ({})); if (r.result !== undefined) return r.result; await new Promise((s) => setTimeout(s, 700 * (k + 1))); }
  throw new Error(method);
}
type Ds = { pairAddress: string; baseToken: { address: string; symbol: string; name: string }; priceUsd?: string; fdv?: number; liquidity?: { usd?: number }; txns?: { h1?: { buys: number; sells: number } }; priceChange?: { m5?: number; h1?: number; h24?: number }; volume?: { h24?: number }; pairCreatedAt?: number; info?: { imageUrl?: string } };

export function gate(t: FloorToken, big: Map<string, number>, now = Date.now()) {
  const ageMin = (now - t.created) / 60000; const copy = (big.get(t.symbol.toUpperCase()) ?? 0) > t.fdv * 1.5;
  const ratio = t.sells_h1 ? t.buys_h1 / t.sells_h1 : t.buys_h1 ? Infinity : 0;
  const checks = [
    { name: "Liquidity", ok: t.liq >= 3000, detail: `$${Math.round(t.liq).toLocaleString("en-US")} in the pool, needs $3,000` },
    { name: "Depth", ok: t.fdv > 0 && t.liq / t.fdv >= 0.05, detail: `pool holds ${t.fdv ? ((t.liq / t.fdv) * 100).toFixed(1) : 0}% of market cap, needs 5%` },
    { name: "Sellable", ok: t.sells_h1 > 0, detail: `${t.sells_h1} sells this hour` },
    { name: "Organic", ok: ratio <= 20, detail: ratio === Infinity ? "only buys, no sells" : `${ratio.toFixed(1)} buys per sell` },
    { name: "Original", ok: !copy, detail: copy ? `a bigger $${t.symbol} exists` : "biggest token with this ticker" },
    { name: "Settled", ok: ageMin >= 10, detail: `${ageMin < 60 ? Math.round(ageMin) + " min" : (ageMin / 60).toFixed(1) + " h"} old` },
    { name: "Not late", ok: t.ch_h1 <= 500, detail: `${t.ch_h1}% this hour` },
  ];
  return { passed: checks.every((c) => c.ok), checks };
}

async function build() {
  const head = parseInt(await rpc("eth_blockNumber", []), 16);
  const toks = new Set<string>();
  for (let from = head - 600_000; from <= head; from += 50_000) {
    const logs: { topics: string[] }[] = await rpc("eth_getLogs", [{ address: PM, topics: [INIT], fromBlock: "0x" + from.toString(16), toBlock: "0x" + Math.min(head, from + 49_999).toString(16) }]).catch(() => []);
    for (const l of logs) { const c0 = "0x" + l.topics[2].slice(26), c1 = "0x" + l.topics[3].slice(26); const t = BASES.has(c0) && !BASES.has(c1) ? c1 : BASES.has(c1) && !BASES.has(c0) ? c0 : null; if (t) toks.add(t.toLowerCase()); }
  }
  const list = [...toks].slice(-300); const best = new Map<string, Ds>();
  for (let i = 0; i < list.length; i += 30) {
    const r = await fetch(`https://api.dexscreener.com/tokens/v1/robinhood/${list.slice(i, i + 30).join(",")}`, { cache: "no-store" }).then((x) => (x.ok ? x.json() : [])).catch(() => []);
    for (const p of r as Ds[]) { const k = p.baseToken.address.toLowerCase(); const c = best.get(k); if (!c || (p.liquidity?.usd ?? 0) > (c.liquidity?.usd ?? 0)) best.set(k, p); }
  }
  const now = Date.now();
  const all: FloorToken[] = [...best.entries()].map(([k, p]) => ({ token: k, pair: p.pairAddress, symbol: p.baseToken.symbol, name: p.baseToken.name, created: p.pairCreatedAt ?? now, price: +(p.priceUsd ?? 0), fdv: p.fdv ?? 0, liq: p.liquidity?.usd ?? 0, buys_h1: p.txns?.h1?.buys ?? 0, sells_h1: p.txns?.h1?.sells ?? 0, ch_m5: p.priceChange?.m5 ?? 0, ch_h1: p.priceChange?.h1 ?? 0, ch_h24: p.priceChange?.h24 ?? 0, vol_h24: p.volume?.h24 ?? 0, image: p.info?.imageUrl ?? null, passed: 0, gate: [] }));
  const big = new Map<string, number>(); for (const t of all) big.set(t.symbol.toUpperCase(), Math.max(big.get(t.symbol.toUpperCase()) ?? 0, t.fdv));
  for (const t of all) { const g = gate(t, big, now); t.passed = g.passed ? 1 : 0; t.gate = g.checks; }
  const live = all.filter((t) => t.price > 0 && t.liq >= 1000);
  const tokens = live.sort((a, b) => b.passed - a.passed || b.vol_h24 - a.vol_h24).slice(0, 60);
  const checks = live.filter((t) => t.passed).slice(0, 12).map((t) => ({ agent: "scout", symbol: t.symbol, t: now, passed: 1, reason: `Gate passed. $${Math.round(t.fdv / 1000)}K MC, $${Math.round(t.liq / 1000)}K liquidity, ${t.buys_h1} buys / ${t.sells_h1} sells this hour.` }))
    .concat(live.filter((t) => !t.passed && !RESERVED.has(t.symbol.toUpperCase())).slice(0, 8).map((t) => ({ agent: "scout", symbol: t.symbol, t: now, passed: 0, reason: t.gate.filter((c) => !c.ok).map((c) => `${c.name}: ${c.detail}`).join("; ") })));
  return { at: now, lastRun: now, live: true, stats: { pools: toks.size, tracked: live.length, passed: live.filter((t) => t.passed).length, blocked: live.filter((t) => !t.passed).length }, tokens, checks };
}
export const floorLive = unstable_cache(build, ["floor-live-v1"], { revalidate: 300 });
