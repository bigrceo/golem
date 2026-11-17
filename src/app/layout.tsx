import type { Metadata } from "next";
import { Sora } from "next/font/google";
import "./globals.css";
import Nav from "@/components/Nav";
import Providers from "@/components/Providers";
import DevWallet from "@/components/DevWallet";
import Embers from "@/components/Embers";

const sora = Sora({ subsets: ["latin"], variable: "--font-sora", weight: ["400", "500", "600", "700", "800"] });

export const metadata: Metadata = {
  title: "golem · Build a trading agent in one sentence. Watch it trade in public.",
  description: "No-code AI trading agents on Robinhood Chain. One sentence builds an agent; every call is public; every call is on the record.",
  openGraph: { title: "golem", description: "Build a trading agent. Watch it trade in public.", type: "website" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={sora.variable}>
      <body className="min-h-screen">
        <DevWallet />
        <Embers />
        <Providers>
          <Nav />
          {children}
        </Providers>
      </body>
    </html>
  );
}
