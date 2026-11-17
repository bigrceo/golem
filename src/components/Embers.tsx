"use client";
/** Background embers: soft orange sparks drifting up the page. `hire:burst` (detail {x, y} in viewport px) throws a burst. */
import { useEffect, useRef } from "react";

type P = { x: number; y: number; vx: number; vy: number; r: number; life: number; max: number; hot: boolean };
export default function Embers() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current!; const ctx = c.getContext("2d")!;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let w = 0, h = 0, dpr = 1, raf = 0, last = performance.now();
    const ps: P[] = [];
    const size = () => { dpr = Math.min(2, devicePixelRatio || 1); w = innerWidth; h = innerHeight; c.width = w * dpr; c.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
    const spawn = (x = Math.random() * w, y = h + 10, hot = false) => {
      const max = hot ? 0.9 + Math.random() * 0.9 : 7 + Math.random() * 8;
      ps.push({ x, y, vx: hot ? (Math.random() - 0.5) * 220 : (Math.random() - 0.5) * 14, vy: hot ? -60 - Math.random() * 220 : -14 - Math.random() * 26, r: hot ? 1 + Math.random() * 2.2 : 1.2 + Math.random() * 2.8, life: 0, max, hot });
    };
    size(); for (let i = 0; i < (reduce ? 14 : 40); i++) { spawn(); ps[i].y = Math.random() * h; ps[i].life = Math.random() * ps[i].max; }
    const burst = (e: Event) => { const d = (e as CustomEvent).detail as { x: number; y: number }; for (let i = 0; i < 46; i++) spawn(d.x + (Math.random() - 0.5) * 120, d.y + (Math.random() - 0.5) * 40, true); };
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      ctx.clearRect(0, 0, w, h);
      if (!reduce && ps.filter((p) => !p.hot).length < 40 && Math.random() < 0.35) spawn();
      for (let i = ps.length - 1; i >= 0; i--) {
        const p = ps[i]; p.life += dt;
        if (p.life > p.max || p.y < -20) { ps.splice(i, 1); continue; }
        if (p.hot) { p.vy += 60 * dt; p.vx *= 0.98; }
        p.x += (p.vx + Math.sin((now / 1000 + i) * 1.3) * (p.hot ? 0 : 6)) * dt; p.y += p.vy * dt;
        const t = p.life / p.max; const a = (t < 0.15 ? t / 0.15 : 1 - (t - 0.15) / 0.85) * (p.hot ? 1 : 0.55);
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 5);
        g.addColorStop(0, `rgba(255,${p.hot ? 170 : 140},70,${a})`); g.addColorStop(0.35, `rgba(242,98,27,${a * 0.45})`); g.addColorStop(1, "rgba(242,98,27,0)");
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 5, 0, Math.PI * 2); ctx.fill();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    addEventListener("resize", size); addEventListener("hire:burst", burst);
    const vis = () => { if (document.hidden) cancelAnimationFrame(raf); else { last = performance.now(); raf = requestAnimationFrame(tick); } };
    document.addEventListener("visibilitychange", vis);
    return () => { cancelAnimationFrame(raf); removeEventListener("resize", size); removeEventListener("hire:burst", burst); document.removeEventListener("visibilitychange", vis); };
  }, []);
  return <canvas ref={ref} aria-hidden className="fixed inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }} />;
}
