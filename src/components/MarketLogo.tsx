/** Real logo for a market ticker (crypto or Robinhood stock token). */
const HAS = new Set(["AAPL", "NVDA", "TSLA", "MSFT", "AMZN", "GOOGL", "META", "COIN", "SPY", "QQQ", "ETH", "BTC", "SOL", "USDG"]);
export default function MarketLogo({ id, size = 18 }: { id: string; size?: number }) {
  if (!HAS.has(id)) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={`/logos/${id}.svg`} alt="" width={size} height={size} className="rounded-full shrink-0 bg-white/90" style={{ width: size, height: size }} />;
}
