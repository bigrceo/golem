import type { Candle } from "./rules";

export const MARKETS: { id: string; name: string; kind: "crypto" | "stock" }[] = [
  { id: "BTC", name: "Bitcoin", kind: "crypto" }, { id: "ETH", name: "Ether", kind: "crypto" }, { id: "SOL", name: "Solana", kind: "crypto" },
  { id: "TSLA", name: "Tesla", kind: "stock" }, { id: "NVDA", name: "NVIDIA", kind: "stock" }, { id: "AAPL", name: "Apple", kind: "stock" },
  { id: "MSFT", name: "Microsoft", kind: "stock" }, { id: "AMZN", name: "Amazon", kind: "stock" }, { id: "GOOGL", name: "Alphabet", kind: "stock" },
  { id: "META", name: "Meta", kind: "stock" }, { id: "COIN", name: "Coinbase", kind: "stock" }, { id: "SPY", name: "S&P 500", kind: "stock" }, { id: "QQQ", name: "Nasdaq 100", kind: "stock" },
];
export const isMarket = (m: string) => MARKETS.some((x) => x.id === m);

async function binance(sym: string): Promise<Candle[]> {
  const r = await fetch(`https://api.binance.com/api/v3/klines?symbol=${sym}USDT&interval=1h&limit=720`, { next: { revalidate: 300 } });
  const rows = await r.json(); if (!Array.isArray(rows)) throw new Error("blocked");
  return rows.map((k: (string | number)[]) => ({ t: +k[0], o: +k[1], h: +k[2], l: +k[3], c: +k[4] }));
}
async function coinbase(sym: string): Promise<Candle[]> {
  const out: Candle[] = []; let end = Math.floor(Date.now() / 3600_000) * 3600;
  for (let page = 0; page < 3; page++) {
    const start = end - 300 * 3600;
    const r = await fetch(`https://api.exchange.coinbase.com/products/${sym}-USD/candles?granularity=3600&start=${new Date(start * 1000).toISOString()}&end=${new Date(end * 1000).toISOString()}`, { headers: { "user-agent": "hire" }, next: { revalidate: 300 } });
    const rows: number[][] = await r.json(); if (!Array.isArray(rows)) break;
    for (const k of rows) out.push({ t: k[0] * 1000, l: k[1], h: k[2], o: k[3], c: k[4] });
    end = start;
  }
  return out.sort((a, b) => a.t - b.t).filter((x, i, a) => i === 0 || x.t !== a[i - 1].t).slice(-720);
}
async function yahoo(sym: string): Promise<Candle[]> {
  const r = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${sym}?interval=1h&range=6mo`, { headers: { "user-agent": "Mozilla/5.0" }, next: { revalidate: 600 } });
  const j = await r.json(); const res = j.chart.result[0]; const q = res.indicators.quote[0]; const out: Candle[] = [];
  (res.timestamp as number[]).forEach((t, i) => { if (q.close[i] != null) out.push({ t: t * 1000, o: q.open[i], h: q.high[i], l: q.low[i], c: q.close[i] }); });
  return out.slice(-720);
}

export async function candles(market: string): Promise<Candle[]> {
  const m = MARKETS.find((x) => x.id === market); if (!m) throw new Error("unknown market");
  if (m.kind === "stock") return yahoo(m.id);
  try { const c = await binance(m.id); if (c.length > 100) return c; } catch {}
  return coinbase(m.id);
}
