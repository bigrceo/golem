import { NextResponse } from "next/server";

/** Reads Uniswap v4 pool creations on Robinhood Chain for the hire-api worker (Cloudflare IPs get rate-limited on eth_getLogs). */
export const dynamic = "force-dynamic";
export const maxDuration = 30;
const RPC = "https://rpc.mainnet.chain.robinhood.com";
const PM = "0x8366a39CC670B4001A1121B8F6A443A643e40951";
const INIT = "0xdd466e674ea557f56295e2d0218a125ea4b4f0f6f3307b95f85e6110838d6438";
const BASES = new Set(["0x0000000000000000000000000000000000000000", "0x0bd7d308f8e1639fab988df18a8011f41eacad73", "0x5fc5360d0400a0fd4f2af552add042d716f1d168"]);

async function call(method: string, params: unknown[]) {
  for (let k = 0; k < 4; k++) {
    const r = await fetch(RPC, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }), cache: "no-store" });
    const j = await r.json().catch(() => ({}));
    if (j.result !== undefined) return j.result;
    await new Promise((s) => setTimeout(s, 800 * (k + 1)));
  }
  throw new Error(`rpc ${method} failed`);
}

export async function GET(req: Request) {
  if (req.headers.get("x-hire-secret") !== process.env.HIRE_API_SECRET) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const head = parseInt(await call("eth_blockNumber", []), 16);
  let from = Number(new URL(req.url).searchParams.get("from") || head - 3000);
  from = Math.max(from, head - 150_000);
  const tokens = new Set<string>();
  while (from <= head) {
    const to = Math.min(head, from + 49_999);
    const logs: { topics: string[] }[] = await call("eth_getLogs", [{ address: PM, topics: [INIT], fromBlock: "0x" + from.toString(16), toBlock: "0x" + to.toString(16) }]);
    for (const l of logs) { const c0 = "0x" + l.topics[2].slice(26), c1 = "0x" + l.topics[3].slice(26); const t = BASES.has(c0) && !BASES.has(c1) ? c1 : BASES.has(c1) && !BASES.has(c0) ? c0 : null; if (t) tokens.add(t.toLowerCase()); }
    from = to + 1;
  }
  return NextResponse.json({ head, next: head + 1, tokens: [...tokens] });
}
