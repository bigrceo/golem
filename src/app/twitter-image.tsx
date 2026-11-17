import { ImageResponse } from "next/og";
import { readFileSync } from "node:fs";
import { join } from "node:path";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "hire — Hire a trading agent in one sentence. Fire it when it loses.";
const FLOOR = `data:image/jpeg;base64,${readFileSync(join(process.cwd(), "public/art/floor.jpg")).toString("base64")}`;
export default function OG() {
  return new ImageResponse(
    <div style={{ width: 1200, height: 630, background: "#f5f1e8", display: "flex", flexDirection: "column", position: "relative", fontFamily: "sans-serif" }}>
      <img src={FLOOR} width={1200} height={374} style={{ position: "absolute", left: 0, bottom: 0, opacity: 0.9 }} />
      <div style={{ position: "absolute", left: 0, top: 0, width: 1200, height: 400, background: "linear-gradient(#f5f1e8 62%, rgba(245,241,232,0))" }} />
      <div style={{ display: "flex", alignItems: "center", gap: 18, padding: "56px 72px 0" }}>
        <svg width="60" height="60" viewBox="0 0 64 64"><rect width="64" height="64" rx="15" fill="#171c18" /><path d="M22 24V52M22 39c0-7.5 4.8-11.5 10.8-11.5S43 31.5 43 39v13" fill="none" stroke="#f5f1e8" strokeWidth="9.5" strokeLinecap="square" strokeLinejoin="round" /><circle cx="22" cy="14.5" r="6.5" fill="#f2621b" /></svg>
        <div style={{ fontSize: 46, fontWeight: 800, color: "#171c18", letterSpacing: -2 }}>hire</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", padding: "34px 72px 0", fontSize: 76, fontWeight: 800, color: "#171c18", letterSpacing: -3, lineHeight: 1.02 }}>
        <div>Hire an agent in one sentence.</div><div style={{ color: "#f2621b" }}>Fire it when it loses.</div>
      </div>
    </div>, size);
}
