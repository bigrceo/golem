import { mnemonicToAccount } from "viem/accounts";
import { AGENTS } from "./engine";

/** Each agent has its own trade-only key, derived from one mnemonic. Dev default is a public test mnemonic. */
const MNEMONIC = process.env.AGENT_MNEMONIC || "test test test test test test test test test test test junk";

export function agentAccount(agentId: string) {
  const idx = AGENTS.findIndex((a) => a.id === agentId);
  if (idx < 0) throw new Error(`unknown agent ${agentId}`);
  return mnemonicToAccount(MNEMONIC, { addressIndex: idx + 1 });
}
export function agentAddresses() {
  return Object.fromEntries(AGENTS.map((a, i) => [a.id, mnemonicToAccount(MNEMONIC, { addressIndex: i + 1 }).address]));
}
/** Index 0 is the watchdog: the key allowed to fire agents (never to move funds). */
export const watchdogAccount = () => mnemonicToAccount(MNEMONIC, { addressIndex: 0 });
