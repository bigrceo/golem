import { unstable_cache } from "next/cache";
/** Does this token have a real, loadable logo (on-chain logo() of Pons/Karat tokens, or a DexScreener image)? Cached a day. */
const RPC = "https://rpc.mainnet.chain.robinhood.com";
const SELS = ["0xfb7f21eb", "0x6bb38b28", "0xf3ccaac0"];
const GW = "https://gateway.pinata.cloud/ipfs/";
function decode(hex: string) { try { const b = Buffer.from(hex.slice(2), "hex"); const len = Number(BigInt("0x" + b.subarray(32, 64).toString("hex"))); return b.subarray(64, 64 + len).toString("utf8"); } catch { return null; } }
async function loads(url: string) {
  const r = await fetch(url, { method: "GET", headers: { range: "bytes=0-64" }, cache: "no-store", signal: AbortSignal.timeout(12000) }).catch(() => null);
  return !!r && r.ok && (r.headers.get("content-type") ?? "").startsWith("image");
}
async function check(addr: string, image: string) {
  if (image) return loads(image);
  for (const data of SELS) {
    const r = await fetch(RPC, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_call", params: [{ to: addr, data }, "latest"] }), cache: "no-store" }).then((x) => x.json()).catch(() => null);
    const s = r?.result && r.result.length > 130 ? decode(r.result) : null;
    if (!s) continue;
    if (s.startsWith("ipfs://")) return loads(GW + s.slice(7));
    if (s.startsWith("http")) return loads(s);
    if (s.startsWith("data:image")) return true;
  }
  return false;
}
const cached = unstable_cache(check, ["token-logo-loads-v2"], { revalidate: 86400 });
export async function withLogos<T extends { token: string; image?: string | null }>(list: T[]) {
  const flags = await Promise.all(list.map((t) => cached(t.token, t.image ?? "").catch(() => false)));
  return list.filter((_, i) => flags[i]);
}
