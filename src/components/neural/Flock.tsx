"use client";
/** MURMUR's murmuration: 600 agents flocking around a figure-eight attractor, halftone dots, an orange orbit ring and
 *  corner brackets locked on the flock's centre. Drawn for dark sections. */
import { useMemo, useRef } from "react";
import { useCanvasLoop } from "./loop";

export default function Flock({ label = "THE GATE" }: { label?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const B = useMemo(() => { let s = 11; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647); return Array.from({ length: 600 }, () => ({ x: 0.3 + r() * 0.4, y: 0.3 + r() * 0.3, vx: (r() - 0.5) * 0.004, vy: (r() - 0.5) * 0.004 })); }, []);
  useCanvasLoop(ref, (c, w, h, t, dpr) => {
    c.globalCompositeOperation = "destination-out"; c.fillStyle = "rgba(0,0,0,.3)"; c.fillRect(0, 0, w, h); c.globalCompositeOperation = "source-over";
    const S = Math.min(w, h * 0.82), ox = (w - S) / 2, oy = h * 0.04;
    const ax = 0.5 + 0.22 * Math.sin(t * 0.37), ay = 0.45 + 0.16 * Math.sin(t * 0.74);
    const cell = new Map<string, typeof B>(); const key = (x: number, y: number) => ((x * 12) | 0) + "," + ((y * 12) | 0);
    for (const b of B) { const k = key(b.x, b.y); (cell.get(k) ?? cell.set(k, []).get(k)!).push(b); }
    let sx = 0, sy = 0;
    for (const b of B) {
      let cx = 0, cy = 0, vx = 0, vy = 0, px = 0, py = 0, n = 0; const gx = (b.x * 12) | 0, gy = (b.y * 12) | 0;
      for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (const o of cell.get(gx + i + "," + (gy + j)) ?? []) { if (o === b) continue; const dx = o.x - b.x, dy = o.y - b.y, d2 = dx * dx + dy * dy; if (d2 > 0.006) continue; n++; cx += o.x; cy += o.y; vx += o.vx; vy += o.vy; if (d2 < 0.0004) { px -= dx; py -= dy; } }
      if (n) { b.vx += (cx / n - b.x) * 0.006 + (vx / n - b.vx) * 0.08 + px * 0.03; b.vy += (cy / n - b.y) * 0.006 + (vy / n - b.vy) * 0.08 + py * 0.03; }
      b.vx += (ax - b.x) * 0.0007; b.vy += (ay - b.y) * 0.0007;
      const sp = Math.hypot(b.vx, b.vy); if (sp > 0.0058) { b.vx *= 0.0058 / sp; b.vy *= 0.0058 / sp; } if (sp < 0.0024) { b.vx *= 0.0024 / sp; b.vy *= 0.0024 / sp; }
      b.x += b.vx; b.y += b.vy; sx += b.x; sy += b.y;
    }
    for (const b of B) { const s = dpr * (1.2 + 1.4 * Math.abs(Math.sin(b.x * 30 + t))); const g = 150 + ((b.y * 105) | 0); c.fillStyle = `rgb(${g},${g - 6},${g - 14})`; c.beginPath(); c.arc(ox + b.x * S, oy + b.y * S, s / 2, 0, 6.2832); c.fill(); }
    const mx = ox + (sx / B.length) * S, my = oy + (sy / B.length) * S;
    c.strokeStyle = "#ff6a24"; c.lineWidth = 2 * dpr; c.beginPath(); c.ellipse(mx, my, S * 0.19, S * 0.17, t * 0.4, 0, Math.PI * 2); c.stroke();
    c.strokeStyle = "#f5f1e8"; c.lineWidth = dpr;
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([i, j], k) => { const X = mx + i * S * (0.2 + 0.015 * Math.sin(t * 2 + k)), Y = my + j * S * (0.18 + 0.015 * Math.cos(t * 2 + k)); c.beginPath(); c.moveTo(X - 6 * dpr * i, Y); c.lineTo(X, Y); c.lineTo(X, Y - 6 * dpr * j); c.stroke(); });
    c.fillStyle = "#d8d3c6"; c.font = `700 ${S * 0.06}px 'Inter Tight', Inter, sans-serif`; c.textAlign = "center"; c.fillText(label, w / 2, oy + S + S * 0.07);
  });
  return <canvas ref={ref} className="w-full h-full fade-edges" aria-hidden />;
}
