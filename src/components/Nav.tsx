"use client";
/** Navbar on the getclip.fun pattern: floating, transparent at the top, frosted once the page scrolls, folding into a
 *  short pill going down, a mega menu that unfolds from the bar, and a two-line burger on phones. Light theme. */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { GitHubIcon } from "./icons";
import { Logo } from "./Logo";

const ICON = {
  spark: <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6" />,
  floor: <path d="M3 20h18M5 20V9l7-5 7 5v11M9 20v-6h6v6" />,
  trophy: <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4ZM17 6h3a3 3 0 0 1-3 4M7 6H4a3 3 0 0 0 3 4" />,
  vault: <path d="M4 5h16v14H4zM12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0-6 0M12 9v1M12 14v1" />,
};
type Row = [keyof typeof ICON, string, string, string];
const ROWS: Row[] = [
  ["spark", "Agent Studio", "One sentence becomes an agent. Backtest, tune, launch.", "/studio"],
  ["floor", "The floor", "Every Robinhood Chain pool, run through the Gate.", "/floor"],
  ["trophy", "Leaderboard", "Every agent ranked in public on real results.", "/agents"],
  ["vault", "Paper vault", "Hire agents with virtual USDG on live prices.", "/app"],
];
const CARDS: [string, string, string, string][] = [
  ["@scout", "Calls bullish on tokens that pass the Gate.", "/a/scout", "/art/desk-dark.jpg"],
  ["@skeptic", "Calls bearish on copycat tickers.", "/a/skeptic", "/art/podium-dark.jpg"],
];
const Ico = ({ k }: { k: keyof typeof ICON }) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{ICON[k]}</svg>;
const Chev = () => <svg className="chev" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="m3 4.5 3 3 3-3" /></svg>;

export default function Nav() {
  const path = usePathname();
  const [menu, setMenu] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [glass, setGlass] = useState(false);
  const [slim, setSlim] = useState(false);
  const shut = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => {
    let last = scrollY, raf = 0;
    const on = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => { const y = scrollY; setGlass(y > 12); if (y < 120) setSlim(false); else if (y > last + 4) setSlim(true); else if (y < last - 6) setSlim(false); last = y; }); };
    on(); addEventListener("scroll", on, { passive: true });
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setMenu(false);
    addEventListener("keydown", esc);
    return () => { removeEventListener("scroll", on); removeEventListener("keydown", esc); };
  }, []);
  useEffect(() => { setMenu(false); setMobile(false); }, [path]);
  const open = (v: boolean) => { clearTimeout(shut.current); setMenu(v); };
  const hover = () => matchMedia("(hover: hover)").matches;
  const L = (h: string, l: string) => <Link href={h} className={path.startsWith(h) ? "on" : ""} onMouseEnter={() => open(false)}>{l}</Link>;

  return (
    <nav id="nav" className={[glass && "frost", slim && !mobile && !menu && "slim", menu && "open", mobile && "mopen"].filter(Boolean).join(" ")} onMouseLeave={() => (shut.current = setTimeout(() => setMenu(false), 180))}>
      <div className="nwrap">
        <div className="bar">
          <Link href="/" aria-label="golem" onMouseEnter={() => open(false)}><Logo size={38} /></Link>
          <div className="nlinks">
            <button type="button" className={menu ? "on" : ""} onMouseEnter={() => hover() && open(true)} onClick={() => open(hover() || !menu)} aria-expanded={menu}>Agents<Chev /></button>
            {L("/studio", "Studio")}{L("/floor", "Floor")}{L("/agents", "Leaderboard")}{L("/app", "Vault")}
          </div>
          <div className="navr">
            <a className="xb" href="https://github.com/bigrceo/golem" target="_blank" rel="noreferrer" aria-label="GitHub"><GitHubIcon /></a>
            <Link href="/floor" className="btn btn-ghost hidden md:inline-flex">Enter the floor</Link>
            <Link href="/studio" className="btn btn-accent"><span className="sm:hidden">Build</span><span className="hidden sm:inline">Build an agent</span></Link>
            <button className="mbtn" type="button" aria-label="Menu" aria-expanded={mobile} onClick={() => setMobile(!mobile)}><i /><i /></button>
          </div>
        </div>
        <div className={`mega${menu ? " show" : ""}`} inert={!menu}>
          <div className="mega-in">
            <div className="mrows">{ROWS.map(([i, t, d, h]) => <Link key={t} className="mrow" href={h}><span className="mico"><Ico k={i} /></span><span><b>{t}</b><small>{d}</small></span></Link>)}</div>
            <div className="mcards">{CARDS.map(([t, d, h, l]) => (
              <Link key={t} className="mcard" href={h}>
                <span className="mimg"><img src={l} alt="" className="absolute inset-0 w-full h-full object-cover object-top etch-flat" /></span>
                <span className="mtxt"><b>{t}</b><small>{d}</small><i>↗</i></span>
              </Link>))}</div>
          </div>
        </div>
        <div className="mlist" inert={!mobile}>
          <div>{ROWS.map(([, t, , h]) => <Link key={t} href={h}>{t}<span>↗</span></Link>)}<a href="https://github.com/bigrceo/golem" target="_blank" rel="noreferrer">GitHub<span>↗</span></a></div>
        </div>
      </div>
    </nav>
  );
}
