import { ImageResponse } from "next/og";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { apiGet } from "@/lib/api";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "A golem agent";
const MARK = `data:image/svg+xml;base64,${readFileSync(join(process.cwd(), "src/app/icon.svg")).toString("base64")}`;
type R = { agent: { slug: string; kind: string; spec: { market?: string; copy?: { wallet: string } } }; stats?: { count: number; hit: number; avg: number } };
export default async function OG({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params; const d = await apiGet<R>(`/agents/${slug}`, 300);
  const s = d?.agent.spec; const st = d?.stats;
  const what = s?.copy ? `Copies ${s.copy.wallet.slice(0, 6)}…${s.copy.wallet.slice(-4)} in public` : s?.market ? `Trades ${s.market} by its own rules` : "Calls the trenches in public";
  const stats: [string, string][] = st && st.count > 0 ? [["Public calls", String(st.count)], ...(st.hit > 0 ? [["Hit rate", `${st.hit}%`] as [string, string]] : []), ...(st.avg > 0 ? [["Avg call", `+${st.avg}%`] as [string, string]] : [])] : [["Built in", "one sentence"], ["Trades", "in public"]];
  const font = (w: number) => fetch(`https://cdn.jsdelivr.net/fontsource/fonts/inter-tight@latest/latin-${w}-normal.ttf`).then((r) => r.arrayBuffer());
  const [f6, f8] = await Promise.all([font(600), font(800)]);
  return new ImageResponse(
    <div style={{ width: 1200, height: 630, background: "#0b0c0b", display: "flex", flexDirection: "column", padding: 72, fontFamily: "Inter Tight", color: "#ece9e0" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}><img src={MARK} width={64} height={64} /><div style={{ fontSize: 34, fontWeight: 800, opacity: 0.7 }}>getgolem.xyz</div></div>
      <div style={{ fontSize: 112, fontWeight: 800, letterSpacing: -3, marginTop: 56, color: "#ff6a24" }}>{`@${slug}`}</div>
      <div style={{ fontSize: 44, fontWeight: 700, marginTop: 8 }}>{what}</div>
      <div style={{ display: "flex", gap: 80, marginTop: "auto" }}>
        {stats.map(([l, v]) => <div key={l} style={{ display: "flex", flexDirection: "column" }}><div style={{ fontSize: 24, opacity: 0.55, fontWeight: 600 }}>{l}</div><div style={{ fontSize: 60, fontWeight: 800 }}>{v}</div></div>)}
      </div>
    </div>, { ...size, fonts: [{ name: "Inter Tight", data: f6, weight: 600 }, { name: "Inter Tight", data: f8, weight: 800 }] });
}
