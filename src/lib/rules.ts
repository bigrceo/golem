/**
 * The no-code agent: a strategy (NOUNY's five, same settings) plus universal exits,
 * sizing and a safety line. Pure functions: backtest, live replay, compare, auto-tune.
 */
export type Candle = { t: number; o: number; h: number; l: number; c: number };

export type Strategy =
  | { kind: "momentum"; window: number; trail: number }
  | { kind: "meanrev"; window: number; sigma: number; stop: number }
  | { kind: "macross"; fast: number; slow: number; stop: number; tp: number }
  | { kind: "rsi"; period: number; buyBelow: number; sellAbove: number; stop: number }
  | { kind: "dip"; trend: number; window: number; sigma: number; trail: number };

export type Spec = {
  market: string;
  strategy: Strategy;
  size: number; // fraction of the vault per entry, 0.1..1
  tp?: number; // extra take profit %, 0 = off
  sl?: number; // extra stop loss %, 0 = off
  maxHold?: number; // hours, 0 = off
  fireLine: number; // drawdown % that fires the agent
};

export const STRATEGIES: Record<Strategy["kind"], { name: string; buys: string; sells: string; defaults: Strategy;
  params: { key: string; label: string; min: number; max: number; step: number; unit?: string }[] }> = {
  momentum: { name: "Momentum", buys: "price breaks above its recent high and is above its average", sells: "price falls a set % from its peak since entry",
    defaults: { kind: "momentum", window: 24, trail: 6 },
    params: [{ key: "window", label: "Breakout window", min: 6, max: 168, step: 1, unit: "h" }, { key: "trail", label: "Trailing stop", min: 1, max: 30, step: 0.5, unit: "%" }] },
  meanrev: { name: "Mean reversion", buys: "price is unusually far below its average", sells: "price is back at the average, or the stop hits",
    defaults: { kind: "meanrev", window: 48, sigma: 2, stop: 8 },
    params: [{ key: "window", label: "Average window", min: 10, max: 200, step: 1, unit: "h" }, { key: "sigma", label: "Entry distance", min: 0.5, max: 4, step: 0.1, unit: "σ" }, { key: "stop", label: "Stop loss", min: 1, max: 50, step: 0.5, unit: "%" }] },
  macross: { name: "MA crossover", buys: "the fast average crosses above the slow one", sells: "fast crosses below slow, stop loss or take profit",
    defaults: { kind: "macross", fast: 9, slow: 21, stop: 6, tp: 15 },
    params: [{ key: "fast", label: "Fast average", min: 2, max: 100, step: 1, unit: "h" }, { key: "slow", label: "Slow average", min: 5, max: 400, step: 1, unit: "h" }, { key: "stop", label: "Stop loss", min: 1, max: 50, step: 0.5, unit: "%" }, { key: "tp", label: "Take profit", min: 1, max: 100, step: 1, unit: "%" }] },
  rsi: { name: "RSI reversal", buys: "the RSI drops below your buy level", sells: "the RSI rises above your sell level, or the stop hits",
    defaults: { kind: "rsi", period: 14, buyBelow: 30, sellAbove: 70, stop: 8 },
    params: [{ key: "period", label: "RSI period", min: 5, max: 50, step: 1, unit: "h" }, { key: "buyBelow", label: "Buy below", min: 5, max: 45, step: 1 }, { key: "sellAbove", label: "Sell above", min: 55, max: 95, step: 1 }, { key: "stop", label: "Stop loss", min: 1, max: 50, step: 0.5, unit: "%" }] },
  dip: { name: "Buy the dip in an uptrend", buys: "price is above its long trend and dips below its short average", sells: "it bounces back above the short average, or the trailing stop hits",
    defaults: { kind: "dip", trend: 120, window: 24, sigma: 1.5, trail: 6 },
    params: [{ key: "trend", label: "Trend average", min: 48, max: 400, step: 1, unit: "h" }, { key: "window", label: "Dip window", min: 10, max: 100, step: 1, unit: "h" }, { key: "sigma", label: "Dip depth", min: 0.5, max: 4, step: 0.1, unit: "σ" }, { key: "trail", label: "Trailing stop", min: 1, max: 30, step: 0.5, unit: "%" }] },
};

export type Decision = { t: number; action: "BUY" | "SELL" | "HOLD" | "STOP"; reason: string; price: number };
export type Result = {
  ret: number; hold: number; edge: number; maxDD: number; trades: number; winRate: number;
  equity: number; curve: number[]; holdCurve: number[]; decisions: Decision[]; fired: boolean; inPosition: boolean; signal: string; from: number; to: number;
};

const FEE = 0.001;
const sma = (v: number[], i: number, n: number) => { if (i + 1 < n) return NaN; let s = 0; for (let k = i - n + 1; k <= i; k++) s += v[k]; return s / n; };
const sd = (v: number[], i: number, n: number) => { const m = sma(v, i, n); if (isNaN(m)) return NaN; let s = 0; for (let k = i - n + 1; k <= i; k++) s += (v[k] - m) ** 2; return Math.sqrt(s / n); };
function rsiSeries(v: number[], n: number) {
  const out = new Array(v.length).fill(NaN); let g = 0, l = 0;
  for (let i = 1; i < v.length; i++) {
    const d = v[i] - v[i - 1];
    if (i <= n) { if (d > 0) g += d; else l -= d; if (i === n) { g /= n; l /= n; out[i] = 100 - 100 / (1 + g / (l || 1e-9)); } continue; }
    g = (g * (n - 1) + Math.max(d, 0)) / n; l = (l * (n - 1) + Math.max(-d, 0)) / n; out[i] = 100 - 100 / (1 + g / (l || 1e-9));
  }
  return out;
}
const f = (n: number, d = 2) => (Math.abs(n) >= 1000 ? n.toFixed(0) : n.toFixed(d));

export function warmup(s: Strategy) {
  switch (s.kind) { case "momentum": return s.window + 1; case "meanrev": return s.window; case "macross": return s.slow + 1; case "rsi": return s.period + 1; case "dip": return Math.max(s.trend, s.window); }
}

/**
 * Runs the spec on candles. `start` = index where the vault opens (hire time); before it the
 * agent only warms up. Equity starts at `cash`.
 */
export function run(candles: Candle[], spec: Spec, opts: { start?: number; cash?: number; keepDecisions?: number } = {}): Result {
  const c = candles.map((k) => k.c); const n = c.length; const st = spec.strategy;
  const w = warmup(st); const start = Math.max(w, opts.start ?? w); const cash0 = opts.cash ?? 10_000;
  const rsi = st.kind === "rsi" ? rsiSeries(c, st.period) : [];
  let cash = cash0, units = 0, entry = 0, peakSince = 0, entryIdx = 0, peak = cash0, maxDD = 0, trades = 0, wins = 0, closed = 0, fired = false;
  const curve: number[] = []; const holdCurve: number[] = []; const decisions: Decision[] = []; let signal = "warming up";
  const note = (i: number, action: Decision["action"], reason: string) => { decisions.push({ t: candles[i].t, action, reason, price: c[i] }); signal = reason; };
  const buy = (i: number, why: string) => { const spend = (cash + units * c[i]) * spec.size; const amt = Math.min(cash, spend); if (amt < 1) return; units += (amt * (1 - FEE)) / c[i]; cash -= amt; entry = c[i]; peakSince = c[i]; entryIdx = i; trades++; note(i, "BUY", `${why} · ${f(amt, 0)} USDG at ${f(c[i])}`); };
  const sell = (i: number, why: string) => { if (units <= 0) return; const got = units * c[i] * (1 - FEE); if (c[i] > entry) wins++; closed++; cash += got; units = 0; trades++; note(i, "SELL", `${why} · ${(((c[i] / entry) - 1) * 100).toFixed(1)}% on the trade`); };
  for (let i = start; i < n; i++) {
    const p = c[i]; const eq = cash + units * p; curve.push(eq); holdCurve.push((cash0 * p) / c[start]);
    peak = Math.max(peak, eq); const dd = 1 - eq / peak; maxDD = Math.max(maxDD, dd);
    if (fired) continue;
    if (dd * 100 >= spec.fireLine) { sell(i, "closing at the safety line"); note(i, "STOP", `reached its ${spec.fireLine}% safety line, vault protected`); fired = true; continue; }
    const inPos = units > 0;
    if (inPos) {
      peakSince = Math.max(peakSince, p); const pnl = (p / entry - 1) * 100; const fromPeak = (1 - p / peakSince) * 100;
      if (spec.sl && pnl <= -spec.sl) { sell(i, `stop loss ${spec.sl}%`); continue; }
      if (spec.tp && pnl >= spec.tp) { sell(i, `take profit ${spec.tp}%`); continue; }
      if (spec.maxHold && i - entryIdx >= spec.maxHold) { sell(i, `held ${spec.maxHold}h, time stop`); continue; }
      let exit: string | null = null;
      switch (st.kind) {
        case "momentum": if (fromPeak >= st.trail) exit = `${fromPeak.toFixed(1)}% off the peak, trailing stop ${st.trail}%`; break;
        case "meanrev": { const m = sma(c, i, st.window); if (p >= m) exit = `back at the ${st.window}h average ${f(m)}`; else if (pnl <= -st.stop) exit = `stop loss ${st.stop}%`; break; }
        case "macross": { const a = sma(c, i, st.fast), b = sma(c, i, st.slow); if (a < b) exit = `fast average crossed below slow`; else if (pnl <= -st.stop) exit = `stop loss ${st.stop}%`; else if (pnl >= st.tp) exit = `take profit ${st.tp}%`; break; }
        case "rsi": if (rsi[i] >= st.sellAbove) exit = `RSI ${rsi[i].toFixed(0)} above ${st.sellAbove}`; else if (pnl <= -st.stop) exit = `stop loss ${st.stop}%`; break;
        case "dip": { const m = sma(c, i, st.window); if (p > m && pnl > 0) exit = `bounced back above the ${st.window}h average`; else if (fromPeak >= st.trail) exit = `trailing stop ${st.trail}%`; break; }
      }
      if (exit) sell(i, exit); else if (i === n - 1 || (i - start) % 6 === 0) note(i, "HOLD", `long, ${pnl >= 0 ? "+" : ""}${pnl.toFixed(1)}% on the trade`);
    } else {
      let enter: string | null = null; let wait = "";
      switch (st.kind) {
        case "momentum": { let hi = -Infinity; for (let k = i - st.window; k < i; k++) hi = Math.max(hi, c[k]); const m = sma(c, i, st.window); if (p > hi && p > m) enter = `broke the ${st.window}h high ${f(hi)}`; else wait = `${((p / hi - 1) * 100).toFixed(2)}% vs ${st.window}h high`; break; }
        case "meanrev": { const m = sma(c, i, st.window), s = sd(c, i, st.window); const z = (p - m) / (s || 1e-9); if (z <= -st.sigma) enter = `${Math.abs(z).toFixed(1)}σ below the ${st.window}h average`; else wait = `${z.toFixed(1)}σ from average, needs -${st.sigma}σ`; break; }
        case "macross": { const a = sma(c, i, st.fast), b = sma(c, i, st.slow), a0 = sma(c, i - 1, st.fast), b0 = sma(c, i - 1, st.slow); if (a > b && a0 <= b0) enter = `${st.fast}h average crossed above ${st.slow}h`; else wait = `trend ${a > b ? "up, waiting for a fresh cross" : "down"}`; break; }
        case "rsi": if (rsi[i] <= st.buyBelow) enter = `RSI ${rsi[i].toFixed(0)} below ${st.buyBelow}`; else wait = `RSI ${rsi[i].toFixed(0)}, buys under ${st.buyBelow}`; break;
        case "dip": { const tr = sma(c, i, st.trend), m = sma(c, i, st.window), s = sd(c, i, st.window); const z = (p - m) / (s || 1e-9); if (p > tr && z <= -st.sigma) enter = `uptrend, dipped ${Math.abs(z).toFixed(1)}σ`; else wait = p > tr ? `uptrend, dip ${z.toFixed(1)}σ of -${st.sigma}σ` : `below the ${st.trend}h trend, no dips bought`; break; }
      }
      if (enter) buy(i, enter); else if (i === n - 1 || (i - start) % 6 === 0) note(i, "HOLD", `cash · ${wait}`);
    }
  }
  const eq = cash + units * c[n - 1];
  const ret = (eq / cash0 - 1) * 100; const hold = (c[n - 1] / c[start] - 1) * 100;
  return { ret: r2(ret), hold: r2(hold), edge: r2(ret - hold), maxDD: r2(maxDD * 100), trades, winRate: closed ? Math.round((wins / closed) * 100) : 0, equity: r2(eq),
    curve: thin(curve), holdCurve: thin(holdCurve), decisions: decisions.slice(-(opts.keepDecisions ?? 60)).reverse(), fired, inPosition: units > 0, signal, from: candles[start]?.t ?? 0, to: candles[n - 1]?.t ?? 0 };
}
const r2 = (x: number) => Math.round(x * 100) / 100;
function thin(v: number[], max = 160) { if (v.length <= max) return v.map(Math.round); const s = v.length / max; return Array.from({ length: max }, (_, i) => Math.round(v[Math.min(v.length - 1, Math.floor(i * s))])); }

/** Every strategy on the market with defaults, and with its best settings from a small grid. */
export function compare(candles: Candle[], base: Spec) {
  return (Object.keys(STRATEGIES) as Strategy["kind"][]).map((k) => {
    const def = { ...base, strategy: STRATEGIES[k].defaults };
    const d = run(candles, def, { keepDecisions: 0 });
    const best = tune(candles, def);
    return { kind: k, name: STRATEGIES[k].name, defaults: { ret: d.ret, edge: d.edge, maxDD: d.maxDD, trades: d.trades }, best };
  });
}

/** Grid search around the defaults, scored on edge with a drawdown penalty. Holds out the last 25% to avoid overfitting. */
export function tune(candles: Candle[], spec: Spec) {
  const meta = STRATEGIES[spec.strategy.kind];
  const grid = (p: (typeof meta.params)[number]) => { const out: number[] = []; for (let i = 0; i < 5; i++) out.push(+(p.min + ((p.max - p.min) * i) / 4).toFixed(2)); return out.map((x) => Math.round(x / p.step) * p.step); };
  const cut = Math.floor(candles.length * 0.75); const train = candles.slice(0, cut);
  let best: { strategy: Strategy; score: number } | null = null;
  const params = meta.params.slice(0, 3);
  const combos: Record<string, number>[] = [{}];
  for (const p of params) { const next: Record<string, number>[] = []; for (const c of combos) for (const v of grid(p)) next.push({ ...c, [p.key]: v }); combos.splice(0, combos.length, ...next); }
  for (const c of combos) {
    const strategy = { ...spec.strategy, ...c } as Strategy;
    if (strategy.kind === "macross" && strategy.fast >= strategy.slow) continue;
    if (strategy.kind === "rsi" && strategy.buyBelow >= strategy.sellAbove) continue;
    if (warmup(strategy) > train.length * 0.6) continue;
    const r = run(train, { ...spec, strategy, fireLine: 100 }, { keepDecisions: 0 });
    const score = r.edge - r.maxDD * 0.5 - (r.trades < 2 ? 5 : 0);
    if (!best || score > best.score) best = { strategy, score };
  }
  const chosen = best?.strategy ?? spec.strategy;
  const test = run(candles, { ...spec, strategy: chosen, fireLine: 100 }, { start: cut, keepDecisions: 0 });
  const full = run(candles, { ...spec, strategy: chosen }, { keepDecisions: 0 });
  return { strategy: chosen, ret: full.ret, edge: full.edge, maxDD: full.maxDD, trades: full.trades, outOfSample: { ret: test.ret, hold: test.hold, edge: test.edge } };
}

/** Plain-English description of a spec, with the actual numbers. */
export function describe(spec: Spec) {
  const s = spec.strategy; let buys = "", sells = "";
  switch (s.kind) {
    case "momentum": buys = `${spec.market} breaks its ${s.window}h high`; sells = `it falls ${s.trail}% from its peak`; break;
    case "meanrev": buys = `${spec.market} drops ${s.sigma}σ below its ${s.window}h average`; sells = `it is back at the average, or down ${s.stop}%`; break;
    case "macross": buys = `the ${s.fast}h average crosses above the ${s.slow}h`; sells = `it crosses back below, at -${s.stop}% or at +${s.tp}%`; break;
    case "rsi": buys = `${spec.market} RSI(${s.period}) drops below ${s.buyBelow}`; sells = `RSI goes above ${s.sellAbove}, or at -${s.stop}%`; break;
    case "dip": buys = `${spec.market} is above its ${s.trend}h trend and dips ${s.sigma}σ under its ${s.window}h average`; sells = `it bounces back, or falls ${s.trail}% from its peak`; break;
  }
  const extra = [spec.tp ? `takes profit at +${spec.tp}%` : "", spec.sl ? `cuts at -${spec.sl}%` : "", spec.maxHold ? `never holds over ${spec.maxHold}h` : ""].filter(Boolean);
  return `Buys ${Math.round(spec.size * 100)}% of the vault when ${buys}. Sells when ${sells}${extra.length ? `. Also ${extra.join(", ")}` : ""}. Stops at its ${spec.fireLine}% safety line.`;
}
