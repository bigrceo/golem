"use client";
/** Token logo: DexScreener CDN image straight away when known, else /api/logo (on-chain logo through Pinata). */
export default function TokenLogo({ addr, symbol, image, size = 28 }: { addr: string; symbol: string; image?: string | null; size?: number }) {
  const q = new URLSearchParams({ s: symbol }); if (image) q.set("f", image);
  const api = `/api/logo/${addr}?${q}`;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={image || api} alt="" width={size} height={size} decoding="async" fetchPriority="high" onError={(e) => { if (e.currentTarget.src !== location.origin + api) e.currentTarget.src = api; }} className="rounded-lg shrink-0 object-cover" style={{ width: size, height: size }} />;
}
