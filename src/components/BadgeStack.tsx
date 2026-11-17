"use client";
/** Hero visual: agent ID badges floating on the desk. Every few seconds the leader is stamped TOP with a burst of embers,
 *  and a new agent joins the desk. */
import { useEffect, useRef, useState } from "react";
import Avatar from "./Avatar";

export type BadgeAgent = { slug: string; role: string; pnl: number; calls: number; hit: number };
const ROT = ["-7deg", "4deg", "-2deg"];
const POS = ["left-0 top-10", "right-0 top-0", "left-[18%] top-[46%]"];

function Badge({ a, n, fired }: { a: BadgeAgent; n: number; fired: boolean }) {
  return (
    <div className="card w-[260px] p-0 overflow-hidden relative">
      <div className="h-9 bg-black flex items-center justify-between px-4"><span className="text-white text-xs font-bold tracking-[.16em]">golem · AGENT</span><span className="w-10 h-2 rounded-full bg-[var(--bg2)]" /></div>
      <div className="p-4">
        <div className="flex items-center gap-3"><Avatar id={a.slug} name={a.slug} size={46} /><div className="min-w-0"><div className="font-bold truncate">@{a.slug}</div><div className="text-xs text-[var(--muted)] truncate">{a.role}</div></div></div>
        <div className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(0,1fr))] gap-2 text-center">
          {([["Edge", `${a.pnl >= 0 ? "+" : ""}${a.pnl.toFixed(1)}%`, a.pnl >= 0 ? "up" : "down", a.pnl !== 0], ["Trades", String(a.calls), "", a.calls > 0], ["Win", `${a.hit}%`, "", a.hit > 0]] as [string, string, string, boolean][]).filter((x) => x[3]).map(([l, v, c]) => (
            <div key={l} className="card-soft py-2"><div className={`text-sm font-bold num ${c}`}>{v}</div><div className="text-[10px] text-[var(--muted)] uppercase tracking-wider">{l}</div></div>))}
        </div>
        <div className="mt-4 flex items-end justify-between">
          <svg width="120" height="22" aria-hidden>{Array.from({ length: 34 }, (_, i) => <rect key={i} x={i * 3.5} y={0} width={(i * 7 + n) % 3 === 0 ? 2 : 1} height={22} fill="#ece9e0" opacity={(i * 13 + n) % 5 === 0 ? 0.25 : 0.85} />)}</svg>
          <span className="text-[10px] text-[var(--muted)] num">ID #{String(1000 + n * 37).padStart(4, "0")}</span>
        </div>
      </div>
      <span className={`stamp stamp-top ${fired ? "on" : ""}`}>TOP</span>
    </div>
  );
}

export default function BadgeStack({ agents }: { agents: BadgeAgent[] }) {
  const pool = agents.length >= 3 ? agents : [...agents, ...FALLBACK].slice(0, Math.max(3, agents.length));
  const [shown, setShown] = useState(() => pool.slice(0, 3).map((a, i) => ({ a, n: i, fired: false, out: false })));
  const next = useRef(3); const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => {
      setShown((s) => {
        const best = s.reduce((w, x, i) => (x.a.pnl > s[w].a.pnl ? i : w), 0);
        const worst = s.reduce((w, x, i) => (i !== best && (w === best || x.a.pnl < s[w].a.pnl) ? i : w), best === 0 ? 1 : 0);
        const el = box.current?.querySelectorAll<HTMLElement>("[data-badge]")[best];
        if (el) { const r = el.getBoundingClientRect(); setTimeout(() => dispatchEvent(new CustomEvent("hire:burst", { detail: { x: r.left + r.width / 2, y: r.top + r.height / 3 } })), 350); }
        setTimeout(() => setShown((t) => t.map((x, i) => (i === worst ? { ...x, out: true } : i === best ? { ...x, fired: false } : x))), 2600);
        setTimeout(() => setShown((t) => {
          const used = new Set(t.map((x) => x.a.slug));
          let a = pool[next.current % pool.length];
          for (let k = 0; k < pool.length && used.has(a.slug); k++) a = pool[++next.current % pool.length];
          next.current++;
          return t.map((x, i) => (i !== worst ? x : { a, n: next.current, fired: false, out: false }));
        }), 3300);
        return s.map((x, i) => (i === best ? { ...x, fired: true } : x));
      });
    }, 6500);
    return () => clearInterval(id);
  }, [pool]);
  return (
    <div ref={box} className="relative h-[460px] w-full max-w-[520px] mx-auto">
      {shown.map((x, i) => (
        <div key={i} data-badge className={`absolute ${POS[i]} badge-float`} style={{ ["--r" as string]: ROT[i], animationDelay: `${i * -2.3}s`, zIndex: 3 - i }}>
          <div className={`burn ${x.out ? "out" : ""}`}><Badge a={x.a} n={x.n} fired={x.fired} /></div>
        </div>))}
    </div>
  );
}
const FALLBACK: BadgeAgent[] = [
  { slug: "scout", role: "Bullish on Gate passes", pnl: 0, calls: 0, hit: 0 },
  { slug: "skeptic", role: "Bearish on copycats", pnl: 0, calls: 0, hit: 0 },
  { slug: "grad", role: "Fresh pools, momentum", pnl: 0, calls: 0, hit: 0 },
];
