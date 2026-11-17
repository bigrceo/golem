"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
const links = [["/studio", "Studio"], ["/floor", "Floor"], ["/agents", "Leaderboard"], ["/app", "Vault"], ["/#token", "$HIRE"]];
export default function Nav() {
  const p = usePathname();
  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-[rgba(255,255,255,0.85)] border-b border-[var(--line)]">
      <div className="mx-auto max-w-7xl px-5 h-16 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2.5 font-bold tracking-tight text-xl"><span className="mark" />hire</Link>
        <nav className="hidden md:flex items-center gap-7 text-sm text-[var(--muted)]">
          {links.map(([h, l]) => <Link key={h} href={h} className={`hover:text-black ${p === h ? "text-black font-semibold" : ""}`}>{l}</Link>)}
        </nav>
        <Link href="/studio" className="btn btn-brand !py-2.5 !px-4 text-sm">Build an agent</Link>
      </div>
      <nav className="md:hidden flex gap-5 px-5 pb-2 text-sm text-[var(--muted)] overflow-x-auto">{links.map(([h, l]) => <Link key={h} href={h} className={p === h ? "text-black font-semibold" : ""}>{l}</Link>)}</nav>
    </header>
  );
}
