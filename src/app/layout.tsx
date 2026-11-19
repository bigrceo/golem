import type { Metadata } from "next";
import { Inter, Inter_Tight } from "next/font/google";
import "./globals.css";
import Nav from "@/components/Nav";
import Providers from "@/components/Providers";
import DevWallet from "@/components/DevWallet";
import Embers from "@/components/Embers";

const inter = Inter({ subsets: ["latin"], variable: "--font-ui" });
const tight = Inter_Tight({ subsets: ["latin"], variable: "--font-display", weight: ["500", "600", "700", "800"] });

export const metadata: Metadata = {
  title: "golem · Build the best trading agent. Earn the fees.",
  description: "No-code AI trading agents on Robinhood Chain. One sentence builds an agent; every call is public; every call is on the record.",
  openGraph: { title: "golem", description: "Build the best trading agent in one sentence. Earn the fees.", type: "website" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${tight.variable}`}>
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
