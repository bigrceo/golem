export type Candle = { t: number; o: number; h: number; l: number; c: number };
export type MarketId = "BTC" | "ETH" | "SOL" | "TSLA" | "NVDA" | "AAPL";
export type Market = { id: MarketId; name: string; kind: "crypto" | "stock"; candles: Candle[]; price: number; change24: number };

export type Decision = { t: number; action: "BUY" | "SELL" | "HOLD" | "FIRED"; market: MarketId; reason: string; price: number; equity: number };
export type AgentSpec = {
  id: string; name: string; handle: string; strategy: string; markets: MarketId[];
  fireAt: number; pitch: string; hires: number; risk: "Low" | "Medium" | "High";
};
export type AgentResult = AgentSpec & {
  equity: number; pnl: number; holdPnl: number; edge: number; trades: number; maxDrawdown: number;
  status: "working" | "fired"; curve: number[]; decisions: Decision[]; lastAction: Decision | null; winRate: number;
};

export const AGENTS: AgentSpec[] = [
  { id: "breakout-btc", name: "Breakout Bob", handle: "bob", strategy: "24h breakout", markets: ["BTC"], fireAt: 0.06, risk: "Medium", hires: 418,
    pitch: "Buys BTC when it clears the 24h high, sells when it loses the 12h low. Never guesses, never averages down." },
  { id: "meanrev-eth", name: "Dip Daisy", handle: "daisy", strategy: "RSI mean reversion", markets: ["ETH"], fireAt: 0.07, risk: "Medium", hires: 362,
    pitch: "Buys ETH when RSI drops under 32, sells it back over 68. Loves red candles, hates holding bags." },
  { id: "momo-sol", name: "Momo Max", handle: "max", strategy: "EMA 9/21 cross", markets: ["SOL"], fireAt: 0.09, risk: "High", hires: 290,
    pitch: "Rides SOL when the fast average crosses the slow one. Fast in, fast out." },
  { id: "dca-btc", name: "Patient Pat", handle: "pat", strategy: "Hourly DCA", markets: ["BTC"], fireAt: 0.12, risk: "Low", hires: 611,
    pitch: "Buys a slice of BTC every six hours whatever the chart looks like. Boring on purpose." },
  { id: "breakout-tsla", name: "Tesla Tina", handle: "tina", strategy: "Open-range breakout", markets: ["TSLA"], fireAt: 0.05, risk: "Medium", hires: 247,
    pitch: "Trades the Robinhood TSLA token on the open-range breakout, flat before the close." },
  { id: "momo-nvda", name: "Chip Chad", handle: "chad", strategy: "EMA 9/21 cross", markets: ["NVDA"], fireAt: 0.05, risk: "Medium", hires: 331,
    pitch: "Momentum on the NVDA token. Long when the trend is up, cash when it bends." },
  { id: "meanrev-aapl", name: "Apple Amy", handle: "amy", strategy: "RSI mean reversion", markets: ["AAPL"], fireAt: 0.04, risk: "Low", hires: 198,
    pitch: "Buys AAPL token dips under RSI 35, takes profit over 65. Small moves, many of them." },
  { id: "rotate-crypto", name: "Rotator Rex", handle: "rex", strategy: "Strongest-of-three rotation", markets: ["BTC", "ETH", "SOL"], fireAt: 0.08, risk: "High", hires: 274,
    pitch: "Every 6 hours, moves the whole stack into whichever of BTC, ETH or SOL moved most in the last day." },
];

const FEE = 0.001;
const START = 10_000;

function ema(vals: number[], n: number): number[] {
  const k = 2 / (n + 1); const out: number[] = []; let e = vals[0];
  vals.forEach((v, i) => { e = i === 0 ? v : v * k + e * (1 - k); out.push(e); });
  return out;
}
function rsi(vals: number[], n = 14): number[] {
  const out: number[] = new Array(vals.length).fill(50);
  let g = 0, l = 0;
  for (let i = 1; i < vals.length; i++) {
    const d = vals[i] - vals[i - 1];
    if (i <= n) { if (d > 0) g += d; else l -= d; if (i === n) { out[i] = 100 - 100 / (1 + (g / n) / ((l / n) || 1e-9)); } continue; }
    g = (g * (n - 1) + Math.max(d, 0)) / n; l = (l * (n - 1) + Math.max(-d, 0)) / n;
    out[i] = 100 - 100 / (1 + g / (l || 1e-9));
  }
  return out;
}
const pct = (x: number) => Math.round(x * 10000) / 100;

type Sim = { cash: number; units: number; equity: number; peak: number; dd: number; trades: number; wins: number; entry: number; decisions: Decision[]; curve: number[]; fired: boolean };

function run(spec: AgentSpec, mk: Record<MarketId, Market>): AgentResult {
  const s: Sim = { cash: START, units: 0, equity: START, peak: START, dd: 0, trades: 0, wins: 0, entry: 0, decisions: [], curve: [], fired: false };
  const main = mk[spec.markets[0]];
  const n = Math.min(...spec.markets.map((m) => mk[m].candles.length));
  const closes = Object.fromEntries(spec.markets.map((m) => [m, mk[m].candles.slice(-n).map((c) => c.c)])) as Record<MarketId, number[]>;
  const candles = main.candles.slice(-n);
  const ind = {
    e9: ema(closes[spec.markets[0]], 9), e21: ema(closes[spec.markets[0]], 21), rsi: rsi(closes[spec.markets[0]]),
  };
  let held: MarketId = spec.markets[0];
  const note = (i: number, action: Decision["action"], market: MarketId, reason: string, price: number) => {
    s.decisions.push({ t: candles[i].t, action, market, reason, price, equity: s.equity });
  };
  const buy = (i: number, m: MarketId, reason: string) => {
    const p = closes[m][i]; if (s.cash <= 1) return;
    s.units = (s.cash * (1 - FEE)) / p; s.cash = 0; s.entry = p; held = m; s.trades++; note(i, "BUY", m, reason, p);
  };
  const sell = (i: number, m: MarketId, reason: string) => {
    const p = closes[m][i]; if (s.units <= 0) return;
    s.cash = s.units * p * (1 - FEE); if (p > s.entry) s.wins++; s.units = 0; s.trades++; note(i, "SELL", m, reason, p);
  };
  const warm = 24;
  for (let i = 0; i < n; i++) {
    const p = closes[held][i];
    s.equity = s.cash + s.units * p; s.curve.push(s.equity);
    s.peak = Math.max(s.peak, s.equity); s.dd = Math.max(s.dd, 1 - s.equity / s.peak);
    if (s.fired) continue;
    if (1 - s.equity / s.peak >= spec.fireAt) {
      s.fired = true; sell(i, held, "drawdown limit hit");
      note(i, "FIRED", held, `down ${pct(1 - s.equity / s.peak)}% from peak, limit ${pct(spec.fireAt)}%. Funds back in the vault.`, p);
      continue;
    }
    if (i < warm) continue;
    const m = spec.markets[0]; const c = closes[m];
    const inPos = s.units > 0;
    const lastHold = (reason: string) => { if (i === n - 1 || i % 3 === 0) note(i, "HOLD", held, reason, p); };
    switch (spec.strategy) {
      case "24h breakout": case "Open-range breakout": {
        const hi = Math.max(...c.slice(i - 24, i)); const lo = Math.min(...c.slice(i - 12, i));
        if (!inPos && c[i] > hi) buy(i, m, `${m} broke the 24h high ${hi.toFixed(2)}`);
        else if (inPos && c[i] < lo) sell(i, m, `${m} lost the 12h low ${lo.toFixed(2)}`);
        else lastHold(inPos ? `${m} above the 12h low, trend intact` : `${m} no breakout (${pct(c[i] / hi - 1)}% vs 24h high)`);
        break;
      }
      case "RSI mean reversion": {
        const r = ind.rsi[i]; const lowT = m === "AAPL" ? 35 : 32; const hiT = m === "AAPL" ? 65 : 68;
        if (!inPos && r < lowT) buy(i, m, `${m} RSI ${r.toFixed(0)}, oversold`);
        else if (inPos && r > hiT) sell(i, m, `${m} RSI ${r.toFixed(0)}, taking profit`);
        else lastHold(`${m} RSI ${r.toFixed(0)}, waiting for ${inPos ? hiT : lowT}`);
        break;
      }
      case "EMA 9/21 cross": {
        const up = ind.e9[i] > ind.e21[i]; const wasUp = ind.e9[i - 1] > ind.e21[i - 1];
        if (!inPos && up && !wasUp) buy(i, m, `${m} fast average crossed above slow`);
        else if (inPos && !up && wasUp) sell(i, m, `${m} fast average crossed below slow`);
        else lastHold(`${m} trend ${up ? "up" : "down"}, ${inPos ? "staying long" : "staying in cash"}`);
        break;
      }
      case "Hourly DCA": {
        if (i % 6 === 0 && s.cash > 1) {
          const spend = Math.min(s.cash, START / 20); const price = c[i];
          s.units += (spend * (1 - FEE)) / price; s.cash -= spend; s.trades++; s.entry = price;
          note(i, "BUY", m, `slice ${Math.round(spend)} USDG of ${m} at ${price.toFixed(0)}`, price);
        } else lastHold(`next ${m} slice in ${6 - (i % 6)}h`);
        break;
      }
      case "Strongest-of-three rotation": {
        if (i % 6 === 0) {
          const best = spec.markets.map((mm) => ({ mm, r: closes[mm][i] / closes[mm][i - 24] - 1 })).sort((a, b) => b.r - a.r)[0];
          if (best.r <= 0) { if (inPos) sell(i, held, `all three red over 24h, going to cash`); else lastHold(`all three red, staying in cash`); }
          else if (!inPos) buy(i, best.mm, `${best.mm} strongest (+${pct(best.r)}% 24h)`);
          else if (held !== best.mm) { sell(i, held, `rotating out of ${held}`); buy(i, best.mm, `${best.mm} strongest (+${pct(best.r)}% 24h)`); }
          else lastHold(`${held} still the strongest`);
        }
        break;
      }
    }
  }
  const hold = closes[spec.markets[0]];
  const holdPnl = hold[n - 1] / hold[warm] - 1;
  const pnl = s.equity / START - 1;
  const closed = s.decisions.filter((d) => d.action === "SELL").length;
  return {
    ...spec, equity: Math.round(s.equity * 100) / 100, pnl: pct(pnl), holdPnl: pct(holdPnl), edge: pct(pnl - holdPnl),
    trades: s.trades, maxDrawdown: pct(s.dd), status: s.fired ? "fired" : "working", curve: s.curve.map((v) => Math.round(v)),
    decisions: s.decisions.slice(-40).reverse(), lastAction: s.decisions[s.decisions.length - 1] ?? null,
    winRate: closed ? Math.round((s.wins / closed) * 100) : 0,
  };
}

export function runDesk(markets: Market[]) {
  const mk = Object.fromEntries(markets.map((m) => [m.id, m])) as Record<MarketId, Market>;
  return AGENTS.filter((a) => a.markets.every((m) => mk[m]?.candles.length > 30)).map((a) => run(a, mk)).sort((a, b) => b.edge - a.edge);
}
