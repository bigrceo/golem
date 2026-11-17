import { ImageResponse } from "next/og";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "hire — Hire a trading agent in one sentence. Fire it when it loses.";
const SITE = "https://hire-desk-five.vercel.app";
export default function OG() {
  return new ImageResponse(
    <div style={{ width: 1200, height: 630, background: "#f5f1e8", display: "flex", flexDirection: "column", position: "relative", fontFamily: "sans-serif" }}>
      <img src={`${SITE}/art/floor.jpg`} width={1200} height={374} style={{ position: "absolute", left: 0, bottom: 0, opacity: 0.9 }} />
      <div style={{ position: "absolute", left: 0, top: 0, width: 1200, height: 400, background: "linear-gradient(#f5f1e8 62%, rgba(245,241,232,0))" }} />
      <div style={{ display: "flex", alignItems: "center", gap: 18, padding: "56px 72px 0" }}>
        <svg width="60" height="60" viewBox="0 0 64 64"><rect width="64" height="64" rx="15" fill="#171c18" /><g transform="translate(-6.5 -5.5) scale(1.2)"><path d="M20 47c-1.6-4-2.5-8.2-2.5-12.6C17.5 23.5 25.4 15 35.6 15c8.9 0 15.9 6.6 15.9 15.4 0 3.2-.8 5.6-2.3 7.6l1.6 4.6-4.2 1v4.2c0 1.7-1.4 3.2-3.2 3.2h-6.1l-.6 3H22.5Z" fill="#f5f1e8" /><path d="M24.5 22.5c3.2 2.6 5.6 6 6.5 10.5" fill="none" stroke="#171c18" strokeWidth="1.3" opacity=".35"/><circle cx="31" cy="33" r="7.2" fill="#f2621b" /><circle cx="31" cy="33" r="3.4" fill="#171c18" /><circle cx="43.5" cy="28.5" r="1.9" fill="#171c18" /></g></svg>
        <div style={{ fontSize: 46, fontWeight: 800, color: "#171c18", letterSpacing: -2 }}>hire</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", padding: "34px 72px 0", fontSize: 76, fontWeight: 800, color: "#171c18", letterSpacing: -3, lineHeight: 1.02 }}>
        <div>Hire an agent in one sentence.</div><div style={{ color: "#f2621b" }}>Fire it when it loses.</div>
      </div>
    </div>, size);
}
