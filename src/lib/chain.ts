import { defineChain } from "viem";

export const RPC = process.env.NEXT_PUBLIC_RPC_URL || "https://rpc.mainnet.chain.robinhood.com";
export const CHAIN = defineChain({
  id: Number(process.env.NEXT_PUBLIC_CHAIN_ID || 4663),
  name: "Robinhood Chain",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: [RPC] } },
  blockExplorers: { default: { name: "Blockscout", url: "https://robinhoodchain.blockscout.com" } },
});
export const EXPLORER = "https://robinhoodchain.blockscout.com";
export const FACTORY = (process.env.NEXT_PUBLIC_FACTORY || "") as `0x${string}`;
export const KARAT_ROUTER = "0x5b03CA37137FEb729a9E4427c5683998b4aB09e3" as const;
export const ZERO = "0x0000000000000000000000000000000000000000" as const;

/** Robinhood stock tokens the agents may hold, and the v4 pools (no hook) that price them in ETH. */
export const STOCK_TOKENS: Record<string, `0x${string}`> = {
  TSLA: "0x322F0929c4625eD5bAd873c95208D54E1c003b2d",
  NVDA: "0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC",
  AAPL: "0xaF3D76f1834A1d425780943C99Ea8A608f8a93f9",
};
export type Pool = { fee: number; tickSpacing: number };
export const ETH_POOLS: Record<string, Pool[]> = {
  TSLA: [{ fee: 50000, tickSpacing: 1000 }, { fee: 2500, tickSpacing: 25 }],
  NVDA: [{ fee: 50000, tickSpacing: 1000 }, { fee: 500, tickSpacing: 10 }],
  AAPL: [{ fee: 2500, tickSpacing: 25 }, { fee: 800, tickSpacing: 8 }],
};
export const explorerTx = (h: string) => `${EXPLORER}/tx/${h}`;
export const explorerAddress = (a: string) => `${EXPLORER}/address/${a}`;
