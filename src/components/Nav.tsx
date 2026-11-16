"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
const links = [["/agents", "Agents"], ["/#gate", "Gate"], ["/#token", "$HIRE"], ["/#faq", "FAQ"]];
export default function Nav() {
  const p = usePathname();
  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-[rgba(255,255,255,0.8)] border-b border-[var(--line)]">
      <div className="mx-auto max-w-7xl px-5 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 font-bold tracking-tight text-xl"><span className="mark" />hire</Link>
        <nav className="hidden md:flex items-center gap-7 text-sm text-[var(--muted)]">
          {links.map(([h, l]) => <Link key={h} href={h} className={`hover:text-black ${p === h ? "text-black" : ""}`}>{l}</Link>)}
        </nav>
        <div className="flex items-center gap-3">
          <Link href="/agents" className="hidden sm:inline-flex btn btn-ghost !py-2.5 !px-4 text-sm">The desk</Link>
          <Link href="/app" className="btn btn-brand !py-2.5 !px-4 text-sm">Open Dashboard</Link>
        </div>
      </div>
    </header>
  );
}
