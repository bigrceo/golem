import type { Metadata } from "next";
import CopyWallet from "@/components/CopyWallet";
export const metadata: Metadata = { title: "Copy any wallet · golem", description: "Paste a Robinhood Chain wallet. Golem reads its trades on-chain and builds an agent that calls its next buys in public." };
export default function Page() { return <CopyWallet />; }
