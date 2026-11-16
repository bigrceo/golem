import { NextResponse } from "next/server";
import { createPublicClient, http, isAddress } from "viem";
import { db } from "@/lib/db";
import { CHAIN, RPC } from "@/lib/chain";
import { HireVaultAbi } from "@/lib/abi";
import { agentAddresses } from "@/lib/agentKeys";
import { AGENTS } from "@/lib/engine";
export const dynamic = "force-dynamic";

/** Registers a hire after the on-chain `hire()` tx: the keeper only trusts what the vault says. */
export async function POST(req: Request) {
  const { vault, agentId } = await req.json();
  if (!isAddress(vault) || !AGENTS.some((a) => a.id === agentId)) return NextResponse.json({ error: "bad input" }, { status: 400 });
  const pub = createPublicClient({ chain: CHAIN, transport: http(RPC) });
  const [owner, job] = await Promise.all([
    pub.readContract({ address: vault, abi: HireVaultAbi, functionName: "owner" }),
    pub.readContract({ address: vault, abi: HireVaultAbi, functionName: "job" }),
  ]);
  const expected = agentAddresses()[agentId].toLowerCase();
  if (!job[1] || job[0].toLowerCase() !== expected) return NextResponse.json({ error: "vault has no active job for this agent" }, { status: 409 });
  await db.upsertHire({ vault: vault.toLowerCase(), owner: owner.toLowerCase(), agentId, createdAt: Date.now(), live: true });
  await db.log({ vault: vault.toLowerCase(), t: Date.now(), action: "HOLD", market: AGENTS.find((a) => a.id === agentId)!.markets[0], reason: "hired, reading the tape" });
  return NextResponse.json({ ok: true });
}
