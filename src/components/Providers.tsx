"use client";
import { WagmiProvider, createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CHAIN, RPC } from "@/lib/chain";
import { useState } from "react";

export const wagmiConfig = createConfig({ chains: [CHAIN], connectors: [injected({ shimDisconnect: true })], transports: { [CHAIN.id]: http(RPC) }, ssr: true });

export default function Providers({ children }: { children: React.ReactNode }) {
  const [qc] = useState(() => new QueryClient());
  return <WagmiProvider config={wagmiConfig}><QueryClientProvider client={qc}>{children}</QueryClientProvider></WagmiProvider>;
}
