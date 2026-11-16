# hire — Hire a trading agent. Fire it when it loses.

Trading agents on Robinhood Chain (chainId 4663) that trade Robinhood stock tokens from a vault only its owner can open.

## Pieces
- `contracts/` — Foundry. `HireVaultFactory` (one vault per wallet, watchdog address) and `HireVault` (deposit, `hire(agent, maxTrade, dailyCap, fireBps, tokens[])`, `execute(path, amountIn, minOut)` by the agent key through the mainnet KaratRouter `0x5b03CA37137FEb729a9E4427c5683998b4aB09e3`, `fire(reason)` by owner / watchdog / agent, `withdraw` owner-only). 9 unit tests + 1 fork test (real ETH→TSLA→ETH swap).
- `src/keeper/run.ts` — the keeper (`npm run keeper`). Every minute: live prices, strategy signal, Gate (route by simulation, all-in cost ≤ 8 %), execute with the agent key, exit check, drawdown watch → `fire()` with the watchdog key. Logs to Postgres (`DATABASE_URL`) or `data/hire.json`.
- `src/lib/engine.ts` — 8 agents, deterministic paper sims on real hourly candles (Binance + Yahoo). Live-hireable: Tesla Tina (TSLA), Chip Chad (NVDA), Apple Amy (AAPL).
- `src/app` — landing, `/agents`, `/agents/[id]`, `/app` (wallet dashboard: create vault, deposit, hire, fire, withdraw, vault log).

## Keys
`AGENT_MNEMONIC` derives index 0 = watchdog (may only fire), index i = agent i (may only `execute` inside caps). Fund the agent addresses with a little ETH for gas (`GET /api/agents` lists them).

## Run locally against a fork
```
anvil --fork-url https://rpc.mainnet.chain.robinhood.com --chain-id 4663 --port 8545 --compute-units-per-second 60
cd contracts && WATCHDOG=<index0 addr> forge script script/Deploy.s.sol --rpc-url http://127.0.0.1:8545 --broadcast --private-key <pk>
# .env.local: NEXT_PUBLIC_RPC_URL, NEXT_PUBLIC_FACTORY, AGENT_MNEMONIC, NEXT_PUBLIC_DEV_WALLET_PK (dev only)
npm run dev -- -p 4310 ; npm run keeper
```

## Deploy
1. `forge script script/Deploy.s.sol --rpc-url robinhood --broadcast --private-key $PK` with `WATCHDOG` = index 0 of the production mnemonic.
2. Vercel: `NEXT_PUBLIC_FACTORY`, `AGENT_MNEMONIC`, `DATABASE_URL` (Neon). Never set `NEXT_PUBLIC_DEV_WALLET_PK`.
3. Railway: same env + `npm run keeper` as the start command.
