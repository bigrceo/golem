/** Trench agents: same shape as the worker's `Trench` spec. */
export type Trench = {
  universe: "trenches"; side: "bull" | "bear";
  maxAgeH: number; minLiq: number; minFdv: number; maxFdv: number; minBuysH1: number; minBuyRatio: number;
  minChH1: number; maxChH1: number; minChM5: number; copycatsOnly?: boolean; keyword?: string;
  tp: number; sl: number; maxHold: number; fireLine: number; bio?: string;
};
export const TRENCH_DEFAULT: Trench = { universe: "trenches", side: "bull", maxAgeH: 48, minLiq: 5000, minFdv: 10000, maxFdv: 1000000, minBuysH1: 10, minBuyRatio: 1, minChH1: 0, maxChH1: 200, minChM5: -100, tp: 50, sl: 25, maxHold: 12, fireLine: 25 };
export type FloorToken = { token: string; pair: string; symbol: string; name: string; created: number; price: number; fdv: number; liq: number; buys_h1: number; sells_h1: number; ch_m5: number; ch_h1: number; ch_h24: number; vol_h24: number; image: string | null; passed: number; gate: { name: string; ok: boolean; detail: string }[] };
export function matches(s: Trench, t: FloorToken, now = Date.now()) {
  const ratio = t.sells_h1 ? t.buys_h1 / t.sells_h1 : t.buys_h1;
  if (s.keyword && !`${t.name} ${t.symbol}`.toLowerCase().includes(s.keyword.toLowerCase())) return false;
  return t.created >= now - s.maxAgeH * 3600_000 && t.liq >= s.minLiq && t.fdv >= s.minFdv && t.fdv <= s.maxFdv && t.buys_h1 >= s.minBuysH1 && ratio >= s.minBuyRatio && t.ch_h1 >= s.minChH1 && t.ch_h1 <= s.maxChH1 && t.ch_m5 >= s.minChM5 && (s.side === "bear" ? !s.copycatsOnly || t.gate?.some((g) => g.name === "Original" && !g.ok) : !!t.passed);
}
export function describeTrench(s: Trench) {
  if (s.side === "bear") return `Calls bearish on ${s.copycatsOnly ? "copycat tickers" : "tokens"} up to ${s.maxAgeH}h old between $${k(s.minFdv)} and $${k(s.maxFdv)} MC. Closes at +${s.tp}% / -${s.sl}% or after ${s.maxHold}h. Stops at its ${s.fireLine}% safety line.`;
  return `Calls bullish on ${s.keyword ? `every "${s.keyword}" token on Robinhood Chain` : "Robinhood Chain tokens"} up to ${s.maxAgeH}h old that pass the Gate, with $${k(s.minLiq)}+ liquidity, $${k(s.minFdv)}–$${k(s.maxFdv)} MC, ${s.minBuysH1}+ buys this hour, ${s.minBuyRatio}+ buys per sell${s.minChM5 > -100 ? `, 5-min momentum above ${s.minChM5}%` : ""}. Closes at +${s.tp}% / -${s.sl}% or after ${s.maxHold}h. Stops at its ${s.fireLine}% safety line.`;
}
export const k = (n: number) => (n >= 1e6 ? (n / 1e6).toFixed(1) + "M" : n >= 1e3 ? Math.round(n / 1e3) + "K" : String(Math.round(n)));
