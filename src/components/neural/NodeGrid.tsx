"use client";
/** MURMUR's perspective grid: one lit node per agent, orange pulses running along the wires. */
import { useRef } from "react";
import { useCanvasLoop } from "./loop";

export default function NodeGrid({ lit = 24 }: { lit?: number }) {
  const ref = useRef<HTMLCanvasElement>(null); const pulses = useRef<{ i: number; j: number; d: [number, number]; p: number }[]>([]);
  useCanvasLoop(ref, (c, w, h, t, dpr) => {
    c.clearRect(0, 0, w, h);
    const C = 14, R = 12; const proj = (i: number, j: number) => { const x = (i / (C - 1) - 0.5) * 2, z = j / (R - 1); const s = 1 / (0.6 + z * 1.4); return [w / 2 + x * w * 0.62 * s, h * 0.12 + z * h * 0.8 * s * 0.95]; };
    c.strokeStyle = "rgba(236,233,224,.1)"; c.lineWidth = dpr;
    for (let i = 0; i < C; i++) { c.beginPath(); for (let j = 0; j < R; j++) { const [x, y] = proj(i, j); if (j) c.lineTo(x, y); else c.moveTo(x, y); } c.stroke(); }
    for (let j = 0; j < R; j++) { c.beginPath(); for (let i = 0; i < C; i++) { const [x, y] = proj(i, j); if (i) c.lineTo(x, y); else c.moveTo(x, y); } c.stroke(); }
    for (let j = 0; j < R; j++) for (let i = 0; i < C; i++) { const on = ((i * 7 + j * 13) % (C * R)) < lit; const [x, y] = proj(i, j); const s = (on ? 3.6 : 1.5) * dpr * (1 - (j / R) * 0.5); c.fillStyle = on ? `rgba(236,233,224,${0.55 + 0.4 * Math.sin(t * 2 + i + j)})` : "rgba(236,233,224,.2)"; c.beginPath(); c.arc(x, y, s / 2, 0, 6.2832); c.fill(); }
    if (Math.random() < 0.08) pulses.current.push({ i: (Math.random() * C) | 0, j: (Math.random() * R) | 0, d: Math.random() < 0.5 ? [1, 0] : [0, 1], p: 0 });
    for (const p of pulses.current) { p.p += 0.04; const a = proj(p.i + p.d[0] * Math.floor(p.p), p.j + p.d[1] * Math.floor(p.p)), b = proj(p.i + p.d[0] * Math.ceil(p.p), p.j + p.d[1] * Math.ceil(p.p)); const f = p.p % 1; const px = a[0] + (b[0] - a[0]) * f, py = a[1] + (b[1] - a[1]) * f; const g = c.createRadialGradient(px, py, 0, px, py, 7 * dpr); g.addColorStop(0, "rgba(255,106,36,.95)"); g.addColorStop(1, "rgba(255,106,36,0)"); c.fillStyle = g; c.beginPath(); c.arc(px, py, 7 * dpr, 0, 6.2832); c.fill(); }
    while (pulses.current.length && pulses.current[0].p > 5) pulses.current.shift();
  }, [lit]);
  return <canvas ref={ref} className="w-full h-full" aria-hidden />;
}
