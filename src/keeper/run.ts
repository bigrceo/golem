/**
 * HIRE keeper: every minute, for each live hire, read the vault, run the agent's strategy on
 * live prices, pass the Gate, execute through the vault with the agent's key, and fire the
 * agent (watchdog key) when the vault crosses its drawdown line. Everything is logged.
 *
 *   npm run keeper            (needs NEXT_PUBLIC_FACTORY, AGENT_MNEMONIC, optional DATABASE_URL)
 */
import { createPublicClient, createWalletClient, http, formatEther, parseEther, type Address } from "viem";
import { CHAIN, RPC, STOCK_TOKENS, ETH_POOLS, ZERO } from "../lib/chain";
import { HireVaultAbi } from "../lib/abi";
import { AGENTS, runDesk, type Market } from "../lib/engine";
import { loadMarkets } from "../lib/market";
import { db } from "../lib/db";
import { agentAccount, watchdogAccount } from "../lib/agentKeys";

const pub = createPublicClient({ chain: CHAIN, transport: http(RPC) });
const erc20 = [{ type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ name: "a", type: "address" }], outputs: [{ type: "uint256" }] }] as const;
const GATE_MAX_COST = Number(process.env.GATE_MAX_COST || 0.08); // 8 % all-in vs reference price
const DUST = parseEther("0.0001");
const holdLogEvery = 30 * 60 * 1000;
const lastHold = new Map<string, number>();

type Path = { key: { currency0: Address; currency1: Address; fee: number; tickSpacing: number; hooks: Address }; zeroForOne: boolean }[];
const path = (sym: string, pool: { fee: number; tickSpacing: number }, buy: boolean): Path => [
  { key: { currency0: ZERO, currency1: STOCK_TOKENS[sym], fee: pool.fee, tickSpacing: pool.tickSpacing, hooks: ZERO }, zeroForOne: buy },
];

async function quote(vault: Address, agent: Address, p: Path, amountIn: bigint): Promise<bigint> {
  try {
    const { result } = await pub.simulateContract({ address: vault, abi: HireVaultAbi, functionName: "execute", args: [p, amountIn, 0n], account: agent });
    return result as bigint;
  } catch { return 0n; }
}

/** The Gate: route (best pool by simulation), cost vs reference, test sell. Returns the chosen path or a reason. */
async function gate(vault: Address, agent: Address, sym: string, amountIn: bigint, buy: boolean, refOut: bigint) {
  let best: { p: Path; out: bigint; pool: { fee: number } } | null = null;
  for (const pool of ETH_POOLS[sym]) {
    const p = path(sym, pool, buy);
    const out = await quote(vault, agent, p, amountIn);
    if (out > 0n && (!best || out > best.out)) best = { p, out, pool };
  }
  if (!best) return { ok: false as const, fail: "no route gave a quote" };
  const cost = 1 - Number(best.out) / Number(refOut);
  if (cost > GATE_MAX_COST) return { ok: false as const, fail: `route cost ${(cost * 100).toFixed(1)}% vs reference, limit ${(GATE_MAX_COST * 100).toFixed(0)}%` };
  return { ok: true as const, p: best.p, out: best.out, pool: best.pool as { fee: number; tickSpacing: number }, cost };
}

async function tick() {
  const markets = await loadMarkets();
  const desk = runDesk(markets, true); // live vaults have their own firing line, the paper one does not apply
  const mk = Object.fromEntries(markets.map((m) => [m.id, m])) as Record<string, Market>;
  const ethUsd = mk.ETH?.price ?? 0;
  if (!ethUsd) { console.log("no ETH price, skip"); return; }
  const hires = await db.hires();
  console.log(new Date().toISOString(), `${hires.length} live hire(s), ETH ${ethUsd}`);

  for (const h of hires) {
    const vault = h.vault as Address;
    const spec = AGENTS.find((a) => a.id === h.agentId);
    const res = desk.find((a) => a.id === h.agentId);
    if (!spec || !res || !spec.live) { await db.endHire(h.vault); continue; }
    const sym = spec.markets[0];
    const token = STOCK_TOKENS[sym];
    const tokenUsd = mk[sym]?.price ?? 0;
    const agent = agentAccount(spec.id);
    const wallet = createWalletClient({ chain: CHAIN, transport: http(RPC), account: agent });

    try {
      const job = await pub.readContract({ address: vault, abi: HireVaultAbi, functionName: "job" });
      const [jobAgent, active, fireBps, , , maxTrade, dailyCap, spentToday] = job;
      if (!active || jobAgent.toLowerCase() !== agent.address.toLowerCase()) {
        await db.log({ vault: h.vault, t: Date.now(), action: "FIRED", market: sym, reason: "job ended on-chain" });
        await db.endHire(h.vault); continue;
      }
      const ethBal = await pub.getBalance({ address: vault });
      const tokBal = (await pub.readContract({ address: token, abi: erc20, functionName: "balanceOf", args: [vault] })) as bigint;
      const equityUsd = Number(formatEther(ethBal)) * ethUsd + Number(formatEther(tokBal)) * tokenUsd;
      const snap = (await db.snapshot(h.vault)) ?? { vault: h.vault, t: Date.now(), equityUsd, peakUsd: equityUsd, ethUsd };
      const peakUsd = Math.max(snap.peakUsd, equityUsd);
      await db.setSnapshot({ vault: h.vault, t: Date.now(), equityUsd, peakUsd, ethUsd });
      const holding = tokBal > DUST;
      const dd = peakUsd > 0 ? 1 - equityUsd / peakUsd : 0;

      // Firing line, enforced by the watchdog key.
      if (dd >= fireBps / 10_000 && peakUsd > 0) {
        if (holding) await sell(vault, agent, wallet, sym, tokBal, ethUsd, tokenUsd, h.vault, equityUsd, "closing before firing");
        const wd = createWalletClient({ chain: CHAIN, transport: http(RPC), account: watchdogAccount() });
        const reason = `down ${(dd * 100).toFixed(1)}% from peak, limit ${(fireBps / 100).toFixed(0)}%. Funds stay in the vault.`;
        const tx = await wd.writeContract({ address: vault, abi: HireVaultAbi, functionName: "fire", args: [reason] });
        await db.log({ vault: h.vault, t: Date.now(), action: "FIRED", market: sym, reason, tx, equityUsd });
        await db.endHire(h.vault); continue;
      }

      // Dev hook: KEEPER_FORCE_WANT=long|cash overrides the strategy, to exercise the pipeline on a fork.
      const want = process.env.KEEPER_FORCE_WANT ? process.env.KEEPER_FORCE_WANT === "long" : res.inPosition;
      if (want && !holding) {
        const room = dailyCap - spentToday;
        const amountIn = [maxTrade, room, ethBal - parseEther("0.0005")].reduce((a, b) => (a < b ? a : b));
        if (amountIn <= DUST) { await hold(h.vault, sym, `wants ${sym} but no budget left (${formatEther(room)} ETH today)`, equityUsd); continue; }
        const refOut = parseEther(((Number(formatEther(amountIn)) * ethUsd) / tokenUsd).toFixed(18));
        const g = await gate(vault, agent.address, sym, amountIn, true, refOut);
        if (!g.ok) { await db.log({ vault: h.vault, t: Date.now(), action: "GATE", market: sym, reason: `buy refused: ${g.fail}`, equityUsd }); continue; }
        const minOut = (g.out * 99n) / 100n;
        const tx = await wallet.writeContract({ address: vault, abi: HireVaultAbi, functionName: "execute", args: [g.p, amountIn, minOut] });
        await pub.waitForTransactionReceipt({ hash: tx });
        // exit check: the position must be sellable right away, or the log says so
        const got = (await pub.readContract({ address: token, abi: erc20, functionName: "balanceOf", args: [vault] })) as bigint;
        const back = await quote(vault, agent.address, path(sym, g.pool, false), got);
        const exit = back > 0n ? `exit verified: ${Number(formatEther(back)).toFixed(5)} ETH back` : "exit NOT verified, sell simulation failed";
        await db.log({ vault: h.vault, t: Date.now(), action: "BUY", market: sym, reason: `${res.signal} · ${formatEther(amountIn)} ETH → ${Number(formatEther(got)).toFixed(4)} ${sym} (cost ${(g.cost * 100).toFixed(1)}%, pool ${g.pool.fee / 10000}%) · ${exit}`, tx, equityUsd });
      } else if (!want && holding) {
        await sell(vault, agent, wallet, sym, tokBal, ethUsd, tokenUsd, h.vault, equityUsd, res.signal);
      } else {
        await hold(h.vault, sym, `${res.signal} · ${holding ? `holding ${Number(formatEther(tokBal)).toFixed(4)} ${sym}` : "in cash"} · ${(dd * 100).toFixed(1)}% off peak`, equityUsd);
      }
    } catch (e) {
      await db.log({ vault: h.vault, t: Date.now(), action: "ERROR", market: sym, reason: String((e as Error).message).slice(0, 200) });
      console.error(h.vault, e);
    }
  }
}

async function sell(vault: Address, agent: { address: Address }, wallet: ReturnType<typeof createWalletClient>, sym: string, tokBal: bigint, ethUsd: number, tokenUsd: number, v: string, equityUsd: number, why: string) {
  const refOut = parseEther(((Number(formatEther(tokBal)) * tokenUsd) / ethUsd).toFixed(18));
  const g = await gate(vault, agent.address, sym, tokBal, false, refOut);
  if (!g.ok) { await db.log({ vault: v, t: Date.now(), action: "GATE", market: sym, reason: `sell refused: ${g.fail}`, equityUsd }); return; }
  const tx = await wallet.writeContract({ address: vault, abi: HireVaultAbi, functionName: "execute", args: [g.p, tokBal, (g.out * 99n) / 100n], chain: CHAIN, account: wallet.account! });
  await pub.waitForTransactionReceipt({ hash: tx });
  await db.log({ vault: v, t: Date.now(), action: "SELL", market: sym, reason: `${why} · ${Number(formatEther(tokBal)).toFixed(4)} ${sym} → ${Number(formatEther(g.out)).toFixed(5)} ETH (cost ${(g.cost * 100).toFixed(1)}%)`, tx, equityUsd });
}
async function hold(vault: string, sym: string, reason: string, equityUsd: number) {
  const last = lastHold.get(vault) ?? 0;
  if (Date.now() - last < holdLogEvery) return;
  lastHold.set(vault, Date.now());
  await db.log({ vault, t: Date.now(), action: "HOLD", market: sym, reason, equityUsd });
}

const once = process.argv.includes("--once");
(async () => {
  for (;;) {
    try { await tick(); } catch (e) { console.error("tick failed", e); }
    if (once) break;
    await new Promise((r) => setTimeout(r, Number(process.env.KEEPER_EVERY_MS || 60_000)));
  }
})();
