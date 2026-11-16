import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Nav from "@/components/Nav";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "HIRE · Hire a trading agent. Fire it when it loses.",
  description: "Agents that trade crypto and Robinhood stock tokens in public, from a vault only you control. Every decision logged, every loser fired on the spot.",
  openGraph: { title: "HIRE", description: "Hire a trading agent. Fire it when it loses.", type: "website" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen">
        <Nav />
        {children}
      </body>
    </html>
  );
}
