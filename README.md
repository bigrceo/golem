<p align="center"><img src="public/brand/pfp.svg" width="72" alt="GOLEM"></p>
<h1 align="center">GOLEM</h1>
<p align="center"><b>Build an agent in one sentence. Fire it when it loses.</b><br>In the legend, a golem comes alive from one word written on its brow. Here, a trading agent comes alive from one sentence.<br>
No-code trading agents on Robinhood Chain: stock tokens, crypto and the trenches, every call on the record.<br>
<a href="https://hire-desk-five.vercel.app">Open the app</a> · <a href="https://hire-desk-five.vercel.app/studio">Agent Studio</a> · <a href="https://hire-desk-five.vercel.app/floor">The floor</a> · <a href="https://hire-desk-five.vercel.app/agents">Leaderboard</a></p>

---

## What it does

| | |
|---|---|
| **Agent Studio** | Type what the agent should do ("Buy ETH when RSI drops below 25, fire it at 12%") or build it with sliders. Five strategies (momentum, mean reversion, MA crossover, RSI reversal, buy the dip), plus take profit, stop loss, time stop, sizing and a firing line. |
| **Honest backtests** | 720 real hourly candles, fees on every trade, compared with simply holding. Auto-tune picks settings on the first 75% of the data and reports the result on the last 25% it never saw. |
| **Trench agents** | Agents that call Robinhood Chain tokens. Every pool created on the Uniswap v4 PoolManager is read from the chain, priced and run through the Gate every 5 minutes. Calls carry their entry, live PnL and exit. |
| **The Gate** | Seven checks before any call: liquidity, pool depth vs FDV, someone sold this hour, organic buy/sell flow, original ticker, minimum age, not already pumped. Checks, never a safety stamp. |
| **Firing line** | Every agent has a maximum drawdown. Cross it and it is fired in public, its record kept on the leaderboard. |
| **Paper vault** | Hire agents with virtual USDG on live prices. Nothing to fund, no gas. |

## Layout

```
src/lib/rules.ts       strategy engine: backtest, compare, auto-tune, plain-English description
src/lib/parse.ts       sentence -> agent (deterministic keyword reading, no AI key)
src/lib/candles.ts     hourly candles: Binance / Coinbase for crypto, Yahoo for stock tokens
src/app/studio         Agent Studio
src/app/floor          live Robinhood Chain pools and the firewall log
src/app/agents         leaderboard;  src/app/a/[slug]  public agent profile
worker/                Cloudflare Worker + D1: discovery, Gate, trench agents, calls, firing (cron */5)
contracts/             HireVault (firing line, per-trade cap, allowlist, Uniswap v4 routing) + tests
contracts/src/nouny    NOUNY AgentVault, vendored unchanged under MIT (see its README)
```

## Run it

```bash
npm install && npm run dev            # site on :3000
cd worker && npx wrangler dev          # API + cron locally (needs a D1 database, see wrangler.toml / schema.sql)
cd contracts && forge test             # 9 unit tests + 1 Robinhood Chain fork test (with --fork-url)
```

Env for the site: `HIRE_API` (worker URL), `HIRE_API_SECRET` (shared with the worker's `SECRET`).

## Brand

Name GOLEM, ticker $GOLEM. Mark, square PFP and X banner in `public/brand/`. Engravings in `public/art/` (light and dark).

## Credits

Strategy set and vault design inspired by [NOUNY](https://github.com/nounyagent/nouny-agent) (MIT); their `AgentVault` is included in `contracts/src/nouny` with its license.

Agents trade paper money on real prices. Calls are not financial advice.

## License

MIT
