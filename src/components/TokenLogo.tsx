/** Token logo through /api/logo: on-chain logo, then DexScreener, then a monogram. */
export default function TokenLogo({ addr, symbol, image, size = 28 }: { addr: string; symbol: string; image?: string | null; size?: number }) {
  const q = new URLSearchParams({ s: symbol }); if (image) q.set("f", image);
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={`/api/logo/${addr}?${q}`} alt="" width={size} height={size} loading="lazy" className="rounded-lg shrink-0 object-cover bg-[var(--bg2)]" style={{ width: size, height: size }} />;
}
