"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAccount, useConnect, useDisconnect, useReadContract, useWriteContract, useBalance, usePublicClient } from "wagmi";
import { formatEther, parseEther, type Address } from "viem";
import { HireVaultAbi, HireVaultFactoryAbi } from "@/lib/abi";
import { FACTORY, STOCK_TOKENS, ZERO, explorerTx, explorerAddress } from "@/lib/chain";
import { hhmm } from "@/lib/fmt";

type AgentInfo = { id: string; name: string; live: boolean; market: string; address: Address };
type Ev = { t: number; action: string; market: string; reason: string; tx?: string | null; equityUsd?: number | null };
const tone: Record<string, string> = { BUY: "up", SELL: "down", HOLD: "text-[var(--muted)]", FIRED: "down", GATE: "text-[var(--brand)]", ERROR: "down" };

export default function Dashboard() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending: connecting } = useConnect();
  const { disconnect } = useDisconnect();
  const pub = usePublicClient();
  const { writeContractAsync, isPending: writing } = useWriteContract();
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [deposit, setDeposit] = useState("0.05");
  const [agentId, setAgentId] = useState("breakout-tsla");
  const [maxTrade, setMaxTrade] = useState("0.01");
  const [dailyCap, setDailyCap] = useState("0.03");
  const [line, setLine] = useState(8);
  const [log, setLog] = useState<{ events: Ev[]; snapshot: { equityUsd: number; peakUsd: number } | null; hire: { agentId: string } | null } | null>(null);

  const { data: vault, refetch: refetchVault } = useReadContract({ address: FACTORY, abi: HireVaultFactoryAbi, functionName: "vaultOf", args: [address ?? ZERO], query: { enabled: !!address && !!FACTORY } });
  const hasVault = !!vault && vault !== ZERO;
  const { data: job, refetch: refetchJob } = useReadContract({ address: vault as Address, abi: HireVaultAbi, functionName: "job", query: { enabled: hasVault, refetchInterval: 15000 } });
  const { data: bal, refetch: refetchBal } = useBalance({ address: vault as Address, query: { enabled: hasVault, refetchInterval: 15000 } });
  const agent = useMemo(() => agents.find((a) => a.id === agentId), [agents, agentId]);
  const activeAgent = useMemo(() => job && job[1] ? agents.find((a) => a.address.toLowerCase() === job[0].toLowerCase()) : null, [job, agents]);

  useEffect(() => { fetch("/api/agents").then((r) => r.json()).then((d) => { setAgents(d.agents); }); }, []);
  useEffect(() => {
    if (!hasVault) return;
    const load = () => fetch(`/api/vault/${vault}`).then((r) => r.json()).then(setLog).catch(() => {});
    load(); const id = setInterval(load, 15000); return () => clearInterval(id);
  }, [vault, hasVault]);

  const run = async (label: string, fn: () => Promise<`0x${string}`>, after?: () => Promise<unknown>) => {
    setErr(null); setBusy(label);
    try { const h = await fn(); await pub!.waitForTransactionReceipt({ hash: h }); await after?.(); await Promise.all([refetchVault(), refetchJob(), refetchBal()]); }
    catch (e) { setErr(String((e as Error).message).split("\n")[0].slice(0, 180)); }
    finally { setBusy(null); }
  };
  const refreshAll = () => Promise.all([refetchVault(), refetchJob(), refetchBal()]);

  if (!FACTORY) return <Shell><div className="card p-10 text-center max-w-xl mx-auto"><span className="mark !w-10 !h-10 inline-block" /><h2 className="text-3xl font-bold mt-6">Vaults open at launch.</h2><p className="mt-3 text-[var(--muted)]">The agents already trade in public on the desk. Live vaults on Robinhood Chain open with $HIRE.</p><Link href="/agents" className="btn btn-brand mt-8">Watch the desk</Link></div></Shell>;

  if (!isConnected) return (
    <Shell>
      <div className="card p-10 text-center max-w-xl mx-auto">
        <span className="mark !w-10 !h-10 inline-block" />
        <h2 className="text-3xl font-bold mt-6">Connect a wallet on Robinhood Chain.</h2>
        <p className="mt-3 text-[var(--muted)]">One vault per wallet. You deposit, you hire, you withdraw. Nobody else.</p>
        <div className="mt-8 flex flex-col gap-2">
          {connectors.map((c) => <button key={c.uid} onClick={() => connect({ connector: c })} disabled={connecting} className="btn btn-brand w-full">{c.name === "Injected" ? "Browser wallet" : c.name}</button>)}
        </div>
      </div>
    </Shell>
  );

  return (
    <Shell right={<button onClick={() => disconnect()} className="btn btn-ghost !py-2 !px-4 text-sm">{address?.slice(0, 6)}…{address?.slice(-4)} · Disconnect</button>}>
      {err && <div className="card p-4 mb-5 border-[var(--down)] text-sm down">{err}</div>}
      {!hasVault ? (
        <div className="card p-10 max-w-xl">
          <div className="label mb-3">Step 1</div>
          <h2 className="text-3xl font-bold">Create your vault.</h2>
          <p className="mt-3 text-[var(--muted)]">A contract only your wallet can withdraw from. One transaction, no fee.</p>
          <button onClick={() => run("create", () => writeContractAsync({ address: FACTORY, abi: HireVaultFactoryAbi, functionName: "create" }))} disabled={!!busy || writing} className="btn btn-brand mt-7">{busy === "create" ? "Creating…" : "Create vault"}</button>
        </div>
      ) : (
        <div className="grid lg:grid-cols-[1fr_1.3fr] gap-5">
          {/* VAULT */}
          <div className="space-y-5">
            <div className="card p-6">
              <div className="flex items-center justify-between"><div className="label">Your vault</div><a href={explorerAddress(vault as string)} target="_blank" className="text-xs text-[var(--muted)] hover:text-black">{(vault as string).slice(0, 8)}… ↗</a></div>
              <div className="mt-3 text-4xl font-bold num">{bal ? Number(formatEther(bal.value)).toFixed(4) : "…"} <span className="text-lg text-[var(--muted)] font-semibold">ETH</span></div>
              {log?.snapshot && <div className="text-sm text-[var(--muted)] num mt-1">Equity ${log.snapshot.equityUsd.toFixed(2)} · peak ${log.snapshot.peakUsd.toFixed(2)}</div>}
              <div className="mt-5 flex gap-2">
                <input type="number" step="0.01" value={deposit} onChange={(e) => setDeposit(e.target.value)} className="!w-32" />
                <DepositButton vault={vault as Address} amount={deposit} busy={busy} setBusy={setBusy} setErr={setErr} after={refreshAll} />
                <button onClick={() => run("withdraw", () => writeContractAsync({ address: vault as Address, abi: HireVaultAbi, functionName: "withdraw", args: [ZERO, bal?.value ?? 0n] }))} disabled={!!busy || !bal?.value} className="btn btn-ghost">{busy === "withdraw" ? "…" : "Withdraw all ETH"}</button>
              </div>
            </div>

            {/* JOB */}
            <div className="card p-6">
              {job && job[1] ? (
                <>
                  <div className="flex items-center justify-between"><div className="label">On the job</div><span className="label !text-[var(--up)] flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[var(--up)] blink" />Working</span></div>
                  <div className="mt-3 text-2xl font-bold">{activeAgent?.name ?? "Agent"}</div>
                  <div className="text-sm text-[var(--muted)] num mt-1">max {formatEther(job[5])} ETH / trade · {formatEther(job[6])} ETH / day · fired at {(job[2] / 100).toFixed(0)}% drawdown</div>
                  <div className="text-sm text-[var(--muted)] num">spent today {formatEther(job[7])} ETH</div>
                  <button onClick={() => run("fire", () => writeContractAsync({ address: vault as Address, abi: HireVaultAbi, functionName: "fire", args: ["fired by owner"] }), async () => { await fetch(`/api/vault/${vault}`); })} disabled={!!busy} className="btn btn-ghost mt-6 down w-full">{busy === "fire" ? "…" : `Fire ${activeAgent?.name?.split(" ")[1] ?? "agent"}`}</button>
                  <p className="text-xs text-[var(--muted)] mt-3">Firing revokes the key on the spot. Open positions stay in the vault, sell or withdraw them yourself.</p>
                </>
              ) : (
                <>
                  <div className="label">Hire an agent</div>
                  <div className="mt-4 grid gap-2">
                    {agents.filter((a) => a.live).map((a) => (
                      <button key={a.id} onClick={() => setAgentId(a.id)} className={`text-left card-soft p-3 flex items-center justify-between ${agentId === a.id ? "!border-black" : ""}`}>
                        <span><span className="font-bold">{a.name}</span> <span className="text-[var(--muted)] text-sm">· {a.market} token</span></span>
                        <Link href={`/agents/${a.id}`} className="text-xs text-[var(--muted)] hover:text-black" onClick={(e) => e.stopPropagation()}>record ↗</Link>
                      </button>
                    ))}
                  </div>
                  <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                    <label><span className="text-[var(--muted)]">Max per trade (ETH)</span><input type="number" step="0.001" value={maxTrade} onChange={(e) => setMaxTrade(e.target.value)} className="mt-1" /></label>
                    <label><span className="text-[var(--muted)]">Daily budget (ETH)</span><input type="number" step="0.001" value={dailyCap} onChange={(e) => setDailyCap(e.target.value)} className="mt-1" /></label>
                  </div>
                  <label className="block mt-4 text-sm"><span className="text-[var(--muted)]">Firing line (max drawdown)</span>
                    <input type="range" min={2} max={20} value={line} onChange={(e) => setLine(+e.target.value)} className="w-full mt-2" /><div className="font-bold num">{line}%</div></label>
                  <button
                    onClick={() => agent && run("hire", () => writeContractAsync({ address: vault as Address, abi: HireVaultAbi, functionName: "hire", args: [agent.address, parseEther(maxTrade), parseEther(dailyCap), line * 100, [STOCK_TOKENS[agent.market]]] }),
                      async () => { await fetch("/api/hires", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ vault, agentId }) }); })}
                    disabled={!!busy || !agent} className="btn btn-brand mt-6 w-full">{busy === "hire" ? "Hiring…" : `Hire ${agent?.name ?? ""}`}</button>
                  <p className="text-xs text-[var(--muted)] mt-3">The agent key can only swap ETH ↔ {agent?.market} token inside your caps, back into this vault.</p>
                </>
              )}
            </div>
          </div>

          {/* LOG */}
          <div className="card p-6">
            <div className="flex items-center justify-between"><div className="label">Vault log</div><span className="text-xs text-[var(--muted)]">refreshes every 15s</span></div>
            {!log?.events?.length ? <p className="mt-6 text-[var(--muted)] text-sm">Nothing yet. Hire an agent and the keeper starts reading the tape within a minute.</p> : (
              <div className="mt-4 divide-y divide-[var(--line)]">
                {log.events.map((e, i) => (
                  <div key={i} className="py-3 flex gap-3 text-sm items-baseline">
                    <span className="text-[var(--muted)] num w-12 shrink-0">{hhmm(e.t)}</span>
                    <span className={`font-bold w-14 shrink-0 ${tone[e.action] ?? ""}`}>{e.action}</span>
                    <span className="flex-1">{e.reason}</span>
                    {e.tx && <a href={explorerTx(e.tx)} target="_blank" className="text-xs text-[var(--muted)] hover:text-black shrink-0">tx ↗</a>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </Shell>
  );
}

function DepositButton({ vault, amount, busy, setBusy, setErr, after }: { vault: Address; amount: string; busy: string | null; setBusy: (s: string | null) => void; setErr: (s: string | null) => void; after: () => Promise<unknown> }) {
  const { sendTransactionAsync } = useSendTx();
  const pub = usePublicClient();
  return (
    <button onClick={async () => { setErr(null); setBusy("deposit"); try { const h = await sendTransactionAsync({ to: vault, value: parseEther(amount || "0") }); await pub!.waitForTransactionReceipt({ hash: h }); await after(); } catch (e) { setErr(String((e as Error).message).split("\n")[0].slice(0, 180)); } finally { setBusy(null); } }}
      disabled={!!busy} className="btn btn-brand">{busy === "deposit" ? "…" : "Deposit ETH"}</button>
  );
}
import { useSendTransaction } from "wagmi";
function useSendTx() { return useSendTransaction(); }

function Shell({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-6xl px-5 py-10">
      <div className="flex items-end justify-between gap-4 flex-wrap mb-8">
        <div><div className="label mb-2">Dashboard</div><h1 className="text-4xl font-bold">Your vault, your agent, your line.</h1></div>
        {right}
      </div>
      {children}
    </main>
  );
}
