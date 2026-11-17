import Link from "next/link";
export default function TopBar() {
  return (
    <div className="topbar">
      <div className="mx-auto max-w-[1280px] px-5 h-9 flex items-center justify-between gap-4 text-[var(--muted)]">
        <div className="flex items-center gap-4 min-w-0">
          <span className="font-bold brand">$HIRE</span>
          <span className="hidden sm:inline">contract posted at launch</span>
          <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-[var(--up)] blink" />agents live on Robinhood Chain</span>
        </div>
        <div className="flex items-center gap-4 shrink-0">
          <Link href="/floor" className="hover:text-black hidden md:inline">The floor</Link>
          <a href="https://github.com/bigrceo/hire" target="_blank" rel="noreferrer" className="hover:text-black">GitHub · open source</a>
        </div>
      </div>
    </div>
  );
}
