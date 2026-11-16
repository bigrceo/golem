"use client";
/**
 * Dev-only browser wallet: when NEXT_PUBLIC_DEV_WALLET_PK is set, exposes a minimal EIP-1193
 * provider on window.ethereum backed by that key, so the dashboard can be driven without MetaMask.
 * Never set in production.
 */
import { useEffect } from "react";
import { createWalletClient, createPublicClient, http, numberToHex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { CHAIN, RPC } from "@/lib/chain";

const PK = process.env.NEXT_PUBLIC_DEV_WALLET_PK as `0x${string}` | undefined;

export default function DevWallet() {
  useEffect(() => {
    if (!PK || typeof window === "undefined") return;
    const account = privateKeyToAccount(PK);
    const wallet = createWalletClient({ account, chain: CHAIN, transport: http(RPC) });
    const pub = createPublicClient({ chain: CHAIN, transport: http(RPC) });
    const provider = {
      isDevWallet: true,
      async request({ method, params }: { method: string; params?: unknown[] }) {
        switch (method) {
          case "eth_requestAccounts": case "eth_accounts": return [account.address];
          case "eth_chainId": return numberToHex(CHAIN.id);
          case "wallet_switchEthereumChain": return null;
          case "eth_sendTransaction": {
            const t = (params as [{ to?: `0x${string}`; value?: `0x${string}`; data?: `0x${string}`; gas?: `0x${string}` }])[0];
            return wallet.sendTransaction({ to: t.to, value: t.value ? BigInt(t.value) : undefined, data: t.data, gas: t.gas ? BigInt(t.gas) : undefined });
          }
          case "personal_sign": return account.signMessage({ message: { raw: (params as [`0x${string}`])[0] } });
          default: return pub.request({ method, params } as never);
        }
      },
      on() {}, removeListener() {},
    };
    (window as unknown as { ethereum: unknown }).ethereum = provider;
  }, []);
  return null;
}
