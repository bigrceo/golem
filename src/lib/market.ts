import type { Candle, Market, MarketId } from "./engine";

const CRYPTO: { id: MarketId; name: string; sym: string }[] = [
  { id: "BTC", name: "Bitcoin", sym: "BTCUSDT" }, { id: "ETH", name: "Ether", sym: "ETHUSDT" }, { id: "SOL", name: "Solana", sym: "SOLUSDT" },
];
const STOCKS: { id: MarketId; name: string }[] = [
  { id: "TSLA", name: "Tesla token" }, { id: "NVDA", name: "NVIDIA token" }, { id: "AAPL", name: "Apple token" },
];

async function binance(sym: string): Promise<Candle[]> {
  const r = await fetch(`https://api.binance.com/api/v3/klines?symbol=${sym}&interval=1h&limit=168`, { next: { revalidate: 60 } });
  const rows: (string | number)[][] = await r.json();
  return rows.map((k) => ({ t: +k[0], o: +k[1], h: +k[2], l: +k[3], c: +k[4] }));
}
async function yahoo(sym: string): Promise<Candle[]> {
  const r = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${sym}?interval=1h&range=1mo`, {
    headers: { "user-agent": "Mozilla/5.0" }, next: { revalidate: 300 },
  });
  const j = await r.json();
  const res = j.chart.result[0]; const q = res.indicators.quote[0];
  const out: Candle[] = [];
  (res.timestamp as number[]).forEach((t, i) => { if (q.close[i] != null) out.push({ t: t * 1000, o: q.open[i], h: q.high[i], l: q.low[i], c: q.close[i] }); });
  return out;
}

export async function loadMarkets(): Promise<Market[]> {
  const jobs = [
    ...CRYPTO.map(async (m) => { try { const c = await binance(m.sym); return mk(m.id, m.name, "crypto", c); } catch { return null; } }),
    ...STOCKS.map(async (m) => { try { const c = await yahoo(m.id); return mk(m.id, m.name, "stock", c); } catch { return null; } }),
  ];
  return (await Promise.all(jobs)).filter(Boolean) as Market[];
}
function mk(id: MarketId, name: string, kind: Market["kind"], candles: Candle[]): Market {
  const last = candles[candles.length - 1]; const ref = candles[Math.max(0, candles.length - (kind === "crypto" ? 25 : 8))];
  return { id, name, kind, candles, price: last.c, change24: Math.round((last.c / ref.c - 1) * 10000) / 100 };
}
