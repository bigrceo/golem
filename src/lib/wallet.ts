/** Read a Robinhood Chain wallet's token activity straight from the chain (ERC-20 Transfer logs). */
const RPC = "https://rpc.mainnet.chain.robinhood.com";
const TRANSFER = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const SKIP = new Set(["0x0bd7d308f8e1639fab988df18a8011f41eacad73", "0x5fc5360d0400a0fd4f2af552add042d716f1d168", "0x80e0e24718dbfcad49ecaa6f1e6c89a190586ca8", "0xaf3d76f1834a1d425780943c99ea8a608f8a93f9", "0xd0601ce157db5bdc3162bbac2a2c8af5320d9eec", "0x322f0929c4625ed5bad873c95208d54e1c003b2d", "0xe93237c50d904957cf27e7b1133b510c669c2e74", "0x2e0847e8910a9732eb3fb1bb4b70a580adad4fe3", "0x12f190a9f9d7d37a250758b26824b97ce941bf54", "0xc0d6457c16cc70d6790dd43521c899c87ce02f35", "0x6330d8c3178a418788df01a47479c0ce7ccf450b", "0x117cc2133c37b721f49de2a7a74833232b3b4c0c", "0xd5f3879160bc7c32ebb4dc785f8a4f505888de68", "0xcec185eb182c47d1ba1efc84e6959e18cd620be4"]);
export const SEC_PER_BLOCK = 0.112;

export async function rpc(method: string, params: unknown[]) {
  for (let k = 0; k < 5; k++) {
    const r = await fetch(RPC, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }), cache: "no-store" }).then((x) => x.json()).catch(() => ({}));
    if (r.result !== undefined) return r.result;
    await new Promise((s) => setTimeout(s, 500 * (k + 1)));
  }
  throw new Error(method);
}
const pad = (a: string) => "0x" + a.toLowerCase().replace(/^0x/, "").padStart(64, "0");
type Log = { address: string; topics: string[]; data: string; blockNumber: string };

/** Transfers in and out of `wallet` between two blocks, in 50k-block chunks, 4 at a time. */
export async function transfers(wallet: string, from: number, to: number) {
  const ranges: [number, number][] = []; for (let b = from; b <= to; b += 50_000) ranges.push([b, Math.min(to, b + 49_999)]);
  const out: (Log & { dir: "in" | "out" })[] = [];
  for (let i = 0; i < ranges.length; i += 4) {
    const batch = await Promise.all(ranges.slice(i, i + 4).flatMap(([a, b]) => (["in", "out"] as const).map(async (dir) => {
      const topics = dir === "in" ? [TRANSFER, null, pad(wallet)] : [TRANSFER, pad(wallet)];
      const logs: Log[] = await rpc("eth_getLogs", [{ topics, fromBlock: "0x" + a.toString(16), toBlock: "0x" + b.toString(16) }]).catch(() => []);
      return logs.filter((l) => l.topics.length === 3 && !SKIP.has(l.address.toLowerCase())).map((l) => ({ ...l, dir }));
    })));
    for (const x of batch) out.push(...x);
  }
  return out;
}

export async function head() { return parseInt(await rpc("eth_blockNumber", []), 16); }

type Ds = { pairAddress: string; baseToken: { address: string; symbol: string; name: string }; priceUsd?: string; fdv?: number; liquidity?: { usd?: number }; priceChange?: { h1?: number; h24?: number }; info?: { imageUrl?: string } };
export async function dex(tokens: string[]) {
  const best = new Map<string, Ds>();
  for (let i = 0; i < tokens.length; i += 30) {
    const r = (await fetch(`https://api.dexscreener.com/tokens/v1/robinhood/${tokens.slice(i, i + 30).join(",")}`, { cache: "no-store" }).then((x) => (x.ok ? x.json() : [])).catch(() => [])) as Ds[];
    for (const p of r) { const k = p.baseToken.address.toLowerCase(); const c = best.get(k); if (!c || (p.liquidity?.usd ?? 0) > (c.liquidity?.usd ?? 0)) best.set(k, p); }
  }
  return best;
}

export async function profile(wallet: string, hours = 24) {
  const h = await head(); const from = h - Math.round((hours * 3600) / SEC_PER_BLOCK);
  const logs = await transfers(wallet, from, h);
  const now = Date.now(); const timeOf = (bn: string) => now - (h - parseInt(bn, 16)) * SEC_PER_BLOCK * 1000;
  const per = new Map<string, { token: string; buys: number; sells: number; firstIn: number; lastIn: number; firstOut: number; inAmt: bigint; outAmt: bigint }>();
  for (const l of logs) {
    const k = l.address.toLowerCase(); const t = timeOf(l.blockNumber); const amt = BigInt(l.data === "0x" ? 0 : l.data);
    const e = per.get(k) ?? { token: k, buys: 0, sells: 0, firstIn: 0, lastIn: 0, firstOut: 0, inAmt: 0n, outAmt: 0n };
    if (l.dir === "in") { e.buys++; e.inAmt += amt; if (!e.firstIn || t < e.firstIn) e.firstIn = t; e.lastIn = Math.max(e.lastIn, t); }
    else { e.sells++; e.outAmt += amt; if (!e.firstOut || t < e.firstOut) e.firstOut = t; }
    per.set(k, e);
  }
  const tokens = [...per.values()];
  const info = await dex(tokens.map((t) => t.token));
  const rows = tokens.map((t) => {
    const d = info.get(t.token); const held = t.inAmt > t.outAmt;
    const holdMin = t.firstIn && t.firstOut && t.firstOut > t.firstIn ? (t.firstOut - t.firstIn) / 60000 : null;
    return { token: t.token, symbol: d?.baseToken.symbol ?? "", name: d?.baseToken.name ?? "", image: d?.info?.imageUrl ?? null, pair: d?.pairAddress ?? "", fdv: d?.fdv ?? 0, ch24: d?.priceChange?.h24 ?? 0, buys: t.buys, sells: t.sells, held, holdMin, lastIn: t.lastIn };
  }).filter((r) => r.symbol && r.fdv > 0).sort((a, b) => b.lastIn - a.lastIn);
  const holds = rows.map((r) => r.holdMin).filter((x): x is number => x != null).sort((a, b) => a - b);
  const medianHold = holds.length ? holds[Math.floor(holds.length / 2)] : null;
  const style = !rows.length ? "quiet" : medianHold == null ? "holder" : medianHold < 15 ? "sniper" : medianHold < 120 ? "scalper" : "swing trader";
  return { wallet, hours, at: now, trades: rows.reduce((a, r) => a + r.buys + r.sells, 0), tokens: rows.length, holding: rows.filter((r) => r.held).length, medianHoldMin: medianHold, style, rows: rows.slice(0, 40) };
}
