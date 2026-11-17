import { STRATEGIES, type Spec, type Strategy } from "./rules";
import { MARKETS } from "./candles";

/** Turns a sentence into an agent. Deterministic keyword reading, no AI, no key. */
export function parse(text: string, fallbackMarket = "BTC"): { spec: Spec; understood: string[] } {
  const t = " " + text.toLowerCase().replace(/,/g, " ") + " ";
  const understood: string[] = [];
  const num = (re: RegExp) => { const m = t.match(re); return m ? parseFloat(m[1]) : undefined; };
  const alias: Record<string, string> = { bitcoin: "BTC", btc: "BTC", ether: "ETH", ethereum: "ETH", eth: "ETH", solana: "SOL", sol: "SOL", tesla: "TSLA", nvidia: "NVDA", apple: "AAPL", microsoft: "MSFT", amazon: "AMZN", google: "GOOGL", alphabet: "GOOGL", meta: "META", coinbase: "COIN", "s&p": "SPY", nasdaq: "QQQ" };
  let market = MARKETS.find((m) => new RegExp(`[^a-z]\\$?${m.id.toLowerCase()}[^a-z]`).test(t))?.id;
  if (!market) for (const [k, v] of Object.entries(alias)) if (t.includes(k)) { market = v; break; }
  if (market) understood.push(`market ${market}`); else market = fallbackMarket;

  let strategy: Strategy;
  if (/rsi|oversold|overbought/.test(t)) {
    const d = STRATEGIES.rsi.defaults as Extract<Strategy, { kind: "rsi" }>;
    strategy = { ...d, buyBelow: num(/(?:below|under|<)\s*(\d+)/) ?? d.buyBelow, sellAbove: num(/(?:above|over|>)\s*(\d+)/) ?? d.sellAbove };
    understood.push(`RSI reversal ${strategy.buyBelow}/${strategy.sellAbove}`);
  } else if (/dip|pullback|uptrend/.test(t)) {
    strategy = { ...STRATEGIES.dip.defaults } as Strategy; understood.push("buy the dip in an uptrend");
  } else if (/cross|moving average|\bma\b|ema/.test(t)) {
    const d = STRATEGIES.macross.defaults as Extract<Strategy, { kind: "macross" }>;
    const pair = t.match(/(\d+)\s*\/\s*(\d+)/);
    strategy = { ...d, fast: pair ? +pair[1] : d.fast, slow: pair ? +pair[2] : d.slow }; understood.push(`MA crossover ${(strategy as { fast: number }).fast}/${(strategy as { slow: number }).slow}`);
  } else if (/mean|revert|stretched|average|sigma|σ/.test(t)) {
    strategy = { ...STRATEGIES.meanrev.defaults } as Strategy; understood.push("mean reversion");
  } else {
    const d = STRATEGIES.momentum.defaults as Extract<Strategy, { kind: "momentum" }>;
    strategy = { ...d, window: num(/(\d+)\s*h(?:our)?s?\s*high/) ?? (/(daily|24h|day)/.test(t) ? 24 : /week/.test(t) ? 168 : d.window) };
    understood.push(`momentum breakout ${(strategy as { window: number }).window}h`);
  }
  const tp = num(/(?:take profit|tp|profit at|sell at \+?)\s*(?:at\s*)?\+?(\d+(?:\.\d+)?)\s*%/);
  const sl = num(/(?:stop loss|stop|sl|cut at|cut)\s*(?:at\s*)?-?(\d+(?:\.\d+)?)\s*%/);
  const fire = num(/(?:fire(?:d)?(?: it)?(?: at| if| when)?(?: down)?|drawdown|line)\s*(?:at|of)?\s*-?(\d+(?:\.\d+)?)\s*%/);
  const hold = num(/(?:hold|max)\s*(?:for\s*)?(?:max\s*)?(\d+)\s*h/);
  let size = 1;
  if (/half/.test(t)) size = 0.5; else if (/quarter/.test(t)) size = 0.25; else { const s = num(/(\d+)\s*%\s*(?:of the vault|of my|per trade|size)/); if (s) size = Math.min(1, Math.max(0.1, s / 100)); }
  if (tp) understood.push(`take profit +${tp}%`); if (sl) understood.push(`stop loss -${sl}%`); if (fire) understood.push(`fired at ${fire}%`); if (hold) understood.push(`time stop ${hold}h`); if (size !== 1) understood.push(`${Math.round(size * 100)}% per entry`);
  return { spec: { market, strategy, size, tp: tp ?? 0, sl: sl ?? 0, maxHold: hold ?? 0, fireLine: fire ?? 10 }, understood };
}
