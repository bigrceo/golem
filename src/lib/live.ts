import { candles } from "./candles";
import { run, describe, type Spec } from "./rules";

/** A user market agent: its record since launch (live) and its 30-day backtest. */
export async function marketRecord(spec: Spec, createdAt: number) {
  const c = await candles(spec.market);
  const idx = c.findIndex((x) => x.t >= createdAt - 3600_000);
  const start = idx < 0 ? c.length - 1 : idx;
  const live = run(c, spec, { start, keepDecisions: 40 });
  const backtest = run(c, spec, { keepDecisions: 0 });
  return { live, backtest, describe: describe(spec), liveHours: c.length - start };
}
