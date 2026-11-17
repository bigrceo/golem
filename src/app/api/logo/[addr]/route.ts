import { NextResponse } from "next/server";

/** Token logo: the on-chain `logo()` of Pons/Karat tokens (IPFS), else the DexScreener image passed as ?f=, else a monogram. */
export const revalidate = 86400;
const RPC = "https://rpc.mainnet.chain.robinhood.com";
const SEL = { logo: "0xfb7f21eb", logoURI: "0x6bb38b28", image: "0xf3ccaac0" };
const GATEWAYS = ["https://gateway.pinata.cloud/ipfs/", "https://ipfs.io/ipfs/", "https://dweb.link/ipfs/"];

function decodeString(hex: string) {
  try { const b = Buffer.from(hex.slice(2), "hex"); if (b.length < 64) return null; const len = Number(BigInt("0x" + b.subarray(32, 64).toString("hex"))); return b.subarray(64, 64 + len).toString("utf8"); } catch { return null; }
}
async function onchain(addr: string) {
  for (const data of Object.values(SEL)) {
    const r = await fetch(RPC, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_call", params: [{ to: addr, data }, "latest"] }), next: { revalidate: 86400 } }).then((x) => x.json()).catch(() => null);
    const s = r?.result && r.result !== "0x" ? decodeString(r.result) : null;
    if (s && /^(ipfs:\/\/|https?:\/\/|data:image)/.test(s)) return s;
  }
  return null;
}
function monogram(sym: string) {
  const ch = (sym || "?").replace(/^\$/, "").slice(0, 1).toUpperCase();
  let h = 0; for (const c of sym) h = (h * 31 + c.charCodeAt(0)) % 360;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="hsl(${h} 30% 18%)"/><text x="32" y="42" text-anchor="middle" font-family="Arial, sans-serif" font-weight="800" font-size="28" fill="hsl(${h} 70% 75%)">${ch.replace(/[<&>]/g, "")}</text></svg>`;
}
export async function GET(req: Request, { params }: { params: Promise<{ addr: string }> }) {
  const { addr } = await params; const u = new URL(req.url);
  const sym = u.searchParams.get("s") ?? ""; const fb = u.searchParams.get("f") ?? "";
  const cache = { "cache-control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800" };
  if (/^0x[0-9a-fA-F]{40}$/.test(addr)) {
    const src = await onchain(addr);
    if (src) {
      if (src.startsWith("ipfs://")) {
        const cid = src.slice(7);
        for (const g of GATEWAYS) { const r = await fetch(g + cid, { next: { revalidate: 86400 } }).catch(() => null); if (r?.ok && (r.headers.get("content-type") ?? "").startsWith("image")) return new NextResponse(await r.arrayBuffer(), { headers: { "content-type": r.headers.get("content-type")!, ...cache } }); }
      } else if (src.startsWith("http")) return NextResponse.redirect(src, { headers: cache });
    }
  }
  if (/^https:\/\/(dd\.dexscreener\.com|cdn\.dexscreener\.com)\//.test(fb)) return NextResponse.redirect(fb, { headers: cache });
  return new NextResponse(monogram(sym), { headers: { "content-type": "image/svg+xml", ...cache } });
}
