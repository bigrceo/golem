"use client";
import { useEffect, type RefObject } from "react";
/** MURMUR's canvas loop: DPR-aware, paused off-screen and on hidden tabs, honours reduced motion (draws one frame). */
export function useCanvasLoop(ref: RefObject<HTMLCanvasElement | null>, draw: (c: CanvasRenderingContext2D, w: number, h: number, t: number, dpr: number) => void, deps: unknown[] = []) {
  useEffect(() => {
    const cv = ref.current; if (!cv) return;
    const ctx = cv.getContext("2d")!; const dpr = Math.min(2, devicePixelRatio || 1);
    let vis = true, raf = 0; const t0 = performance.now();
    const io = new IntersectionObserver(([e]) => { vis = e.isIntersecting; }, { rootMargin: "120px" }); io.observe(cv);
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const fit = () => { const r = cv.getBoundingClientRect(); const W = Math.round(r.width * dpr), H = Math.round(r.height * dpr); if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; } return [W, H]; };
    const f = (now: number) => { if (vis && !document.hidden) { const [w, h] = fit(); draw(ctx, w, h, reduce ? 6 : (now - t0) / 1000, dpr); } if (!reduce) raf = requestAnimationFrame(f); };
    raf = requestAnimationFrame(f);
    // first frame even where rAF is throttled (background tabs, previews)
    const first = setTimeout(() => { const [w, h] = fit(); draw(ctx, w, h, 4, dpr); }, 60);
    return () => { cancelAnimationFrame(raf); clearTimeout(first); io.disconnect(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
export const mouse = { x: 0, y: 0 };
if (typeof window !== "undefined") addEventListener("pointermove", (e) => { mouse.x = e.clientX / innerWidth - 0.5; mouse.y = e.clientY / innerHeight - 0.5; }, { passive: true });
