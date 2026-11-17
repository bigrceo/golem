"use client";
/** MURMUR's hero orb, on paper: a point sphere wired to its nearest neighbours, assembling from a scattered cloud,
 *  breathing, following the mouse. Labels around it send pulses into the orb: read, decide, trade, learn. */
import { useMemo, useRef } from "react";
import { useCanvasLoop, mouse } from "./loop";

const STEPS = [["Read", "18%", "30%"], ["Decide", "6%", "62%"], ["Trade", "82%", "28%"], ["Learn", "92%", "64%"]] as const;

export default function NeuralOrb({ className = "" }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const { P, E } = useMemo(() => {
    const N = 900, P: { x: number; y: number; z: number; sx: number; sy: number; sz: number }[] = [];
    let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < N; i++) { const y = rnd() * 2 - 1, r = Math.sqrt(1 - y * y), th = rnd() * 6.2832; const k = 1.6 + rnd() * 1.4; P.push({ x: Math.cos(th) * r, y, z: Math.sin(th) * r, sx: Math.cos(th) * r * k, sy: y * k, sz: Math.sin(th) * r * k }); }
    const E: [number, number][] = [];
    for (let i = 0; i < N; i++) {
      let b1 = [Infinity, -1], b2 = [Infinity, -1];
      for (let j = 0; j < N; j++) { if (i === j) continue; const d = (P[i].x - P[j].x) ** 2 + (P[i].y - P[j].y) ** 2 + (P[i].z - P[j].z) ** 2; if (d < b1[0]) { b2 = b1; b1 = [d, j]; } else if (d < b2[0]) b2 = [d, j]; }
      if (b1[1] > i) E.push([i, b1[1]]); if (b2[1] > i) E.push([i, b2[1]]);
    }
    return { P, E };
  }, []);
  useCanvasLoop(ref, (c, w, h, t, dpr) => {
    c.clearRect(0, 0, w, h);
    const k = Math.min(1, t / 2.4), ease = 1 - Math.pow(1 - k, 3);
    const R = Math.min(w, h) * 0.3 * (1 + 0.02 * Math.sin(t * 1.3)), cx = w / 2, cy = h / 2;
    const ry = t * 0.18 + mouse.x * 0.8, rx = 0.35 + mouse.y * 0.5;
    const cY = Math.cos(ry), sY = Math.sin(ry), cX = Math.cos(rx), sX = Math.sin(rx);
    const pr = P.map((p) => {
      const n = 1 + 0.07 * Math.sin(p.x * 4 + t * 1.7) * Math.cos(p.y * 5 - t);
      const x = p.x * n * ease + p.sx * (1 - ease), y = p.y * n * ease + p.sy * (1 - ease), z = p.z * n * ease + p.sz * (1 - ease);
      const X = x * cY - z * sY; let Z = x * sY + z * cY; const Y = y * cX - Z * sX; Z = y * sX + Z * cX;
      const s = 2.6 / (2.6 + Z); return [cx + X * R * s, cy + Y * R * s, Z];
    });
    c.lineWidth = dpr * 0.7;
    for (const [a, b] of E) { const A = pr[a], B = pr[b]; const z = (A[2] + B[2]) / 2; c.strokeStyle = `rgba(236,233,224,${(0.06 + (1 - z) * 0.26) * ease * ease})`; c.beginPath(); c.moveTo(A[0], A[1]); c.lineTo(B[0], B[1]); c.stroke(); }
    for (const [x, y, z] of pr) { c.fillStyle = `rgba(236,233,224,${(0.25 + (1 - z) * 0.45) * ease})`; c.beginPath(); c.arc(x, y, dpr * 0.9, 0, 6.2832); c.fill(); }
    // a few hot nodes: the agents
    for (let i = 0; i < pr.length; i += 97) { const [x, y, z] = pr[i]; if (z > 0.2) continue; const g = c.createRadialGradient(x, y, 0, x, y, 9 * dpr); g.addColorStop(0, `rgba(255,106,36,${0.9 * ease})`); g.addColorStop(1, "rgba(255,106,36,0)"); c.fillStyle = g; c.beginPath(); c.arc(x, y, 9 * dpr, 0, 6.3); c.fill(); }
    // pulses from labels into the orb
    const hb = box.current?.getBoundingClientRect(); if (!hb) return;
    box.current!.querySelectorAll<HTMLElement>("[data-step]").forEach((el, i) => {
      const r = el.getBoundingClientRect(); const x0 = (r.left + r.width / 2 - hb.left) * dpr, y0 = (r.top - hb.top + r.height + 6) * dpr; const q = (t * 0.35 + i * 0.25) % 1;
      c.strokeStyle = `rgba(236,233,224,${0.12 * ease})`; c.setLineDash([2 * dpr, 6 * dpr]); c.beginPath(); c.moveTo(x0, y0); c.lineTo(cx, cy); c.stroke(); c.setLineDash([]);
      c.fillStyle = i === 3 ? "#ff6a24" : "rgba(236,233,224,.85)"; c.beginPath(); c.arc(x0 + (cx - x0) * q, y0 + (cy - y0) * q, 1.8 * dpr, 0, 6.2832); c.fill();
    });
  }, [P, E]);
  return (
    <div ref={box} className={`relative ${className}`}>
      <canvas ref={ref} className="absolute inset-0 w-full h-full fade-edges" aria-hidden />
      {STEPS.map(([l, x, y], i) => <span key={l} data-step className={`absolute -translate-x-1/2 text-sm font-semibold tracking-wide ${i === 3 ? "brand" : ""}`} style={{ left: x, top: y }}>{l}</span>)}
    </div>
  );
}
