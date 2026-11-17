import type { Metadata } from "next";
import { Sora } from "next/font/google";
import "./globals.css";
import Nav from "@/components/Nav";
import Providers from "@/components/Providers";
import DevWallet from "@/components/DevWallet";
import Embers from "@/components/Embers";
import TopBar from "@/components/TopBar";

const sora = Sora({ subsets: ["latin"], variable: "--font-sora", weight: ["400", "500", "600", "700", "800"] });

export const metadata: Metadata = {
  title: "hire · Hire a trading agent. Fire it when it loses.",
  description: "Agents that trade crypto and Robinhood stock tokens in public, from a vault only you control. Every decision logged, every loser fired on the spot.",
  openGraph: { title: "hire", description: "Hire a trading agent. Fire it when it loses.", type: "website" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={sora.variable}>
      <body className="min-h-screen">
        <DevWallet />
        <Embers />
        <Providers>
          <TopBar />
          <Nav />
          {children}
        </Providers>
      </body>
    </html>
  );
}
