import { ImageResponse } from "next/og";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "hire — Hire a trading agent. Fire it when it loses.";
export default function OG() {
  return new ImageResponse(
    <div style={{ width: 1200, height: 630, background: "#f5f1e8", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, fontFamily: "sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <div style={{ width: 44, height: 44, background: "#f2621b", clipPath: "polygon(0 0,100% 0,100% 45%,45% 45%,45% 100%,0 100%)" }} />
        <div style={{ fontSize: 44, fontWeight: 800, color: "#171c18", letterSpacing: -2 }}>hire</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", fontSize: 96, fontWeight: 800, color: "#171c18", letterSpacing: -4, lineHeight: 1.02 }}>
        <div>Hire a trading agent.</div><div style={{ display: "flex" }}>Fire it when it <span style={{ color: "#f2621b", marginLeft: 24 }}>loses.</span></div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 26, color: "#6c6a62" }}>
        <div>Trading agents in public · Robinhood stock tokens + crypto</div><div>Robinhood Chain</div>
      </div>
    </div>, size);
}
