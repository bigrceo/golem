"use client";
/** MURMUR's three layered surfaces. Scroll through the section and the stack rotates and folds; `onLayer` reports which layer is active. */
import { useEffect, useRef } from "react";
import { useCanvasLoop } from "./loop";

export default function LayerWaves({ section, labels, onLayer }: { section: string; labels: string[]; onLayer?: (i: number) => void }) {
  const ref = useRef<HTMLCanvasElement>(null); const prog = useRef(0);
  useEffect(() => {
    const on = () => { const sec = document.getElementById(section); if (!sec) return; const r = sec.getBoundingClientRect(); prog.current = Math.max(0, Math.min(1, -r.top / Math.max(1, r.height - innerHeight))); onLayer?.(Math.min(2, Math.floor(prog.current * 3))); };
    on(); addEventListener("scroll", on, { passive: true }); return () => removeEventListener("scroll", on);
  }, [section, onLayer]);
  const G = 40;
  useCanvasLoop(ref, (c, w, h, t, dpr) => {
    c.clearRect(0, 0, w, h);
    const p = prog.current, tilt = 0.42 + p * 1.0, yaw = 0.62 + p * 0.9, spread = (1 - p) * 0.95;
    const ct = Math.cos(tilt), st = Math.sin(tilt), cy = Math.cos(yaw), sy = Math.sin(yaw), sc = Math.min(w, h) * 0.32;
    const proj = (x: number, y: number, z: number) => { const X = x * cy - z * sy; let Z = x * sy + z * cy; const Y = y * ct - Z * st; Z = y * st + Z * ct; const s = 3.2 / (3.2 + Z); return [w / 2 + X * sc * s, h / 2 + Y * sc * s]; };
    for (let L = 0; L < 3; L++) {
      const off = (L - 1) * spread, A = [0.22, 0.3, 0.18][L], f = [2.2, 3.1, 4][L];
      const hgt = (u: number, v: number) => { const r = Math.hypot(u, v); return off - A * Math.exp(-r * r * 2.2) * Math.cos(r * f * 2 - t * 1.4 + L) - 0.04 * Math.sin(u * 6 + t) * Math.cos(v * 5 - t * 0.8); };
      for (let dir = 0; dir < 2; dir++) for (let i = 0; i <= G; i++) {
        c.beginPath();
        for (let j = 0; j <= G; j++) { const u = (dir ? i : j) / G * 2 - 1, v = (dir ? j : i) / G * 2 - 1; const [X, Y] = proj(u, -hgt(u, v), v); if (j) c.lineTo(X, Y); else c.moveTo(X, Y); }
        const heat = Math.max(0, 1 - Math.abs(i / G - 0.5) * 2 * 1.6);
        c.strokeStyle = heat > 0.05 ? `rgba(255,106,36,${0.12 + heat * 0.45})` : "rgba(236,233,224,.13)"; c.lineWidth = dpr * 0.7; c.stroke();
      }
      const [lx, ly] = proj(-1.05, -off, 1); c.fillStyle = "#8f8c83"; c.font = `600 ${11 * dpr}px 'Inter Tight', Inter, sans-serif`; const txt = `0${L + 1} ${labels[L] ?? ""}`; const tw = c.measureText(txt).width; c.fillText(txt, Math.max(6 * dpr, lx - tw - 10 * dpr), ly);
      c.strokeStyle = "rgba(236,233,224,.2)"; c.beginPath(); [[-1, -1], [1, -1], [1, 1], [-1, 1], [-1, -1]].forEach(([u, v], k) => { const [X, Y] = proj(u, -off, v); if (k) c.lineTo(X, Y); else c.moveTo(X, Y); }); c.stroke();
    }
  }, [labels.join()]);
  return <canvas ref={ref} className="w-full h-full fade-edges" aria-hidden />;
}
