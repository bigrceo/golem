import { ImageResponse } from "next/og";
import { readFileSync } from "node:fs";
import { join } from "node:path";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "GOLEM — Build a trading agent in one sentence. Fire it when it loses.";
const MARK = `data:image/svg+xml;base64,${readFileSync(join(process.cwd(), "src/app/icon.svg")).toString("base64")}`;
const FLOOR = `data:image/jpeg;base64,${readFileSync(join(process.cwd(), "public/art/floor-dark.jpg")).toString("base64")}`;
export default function OG() {
  return new ImageResponse(
    <div style={{ width: 1200, height: 630, background: "#0b0c0b", display: "flex", flexDirection: "column", position: "relative", fontFamily: "sans-serif" }}>
      <img src={FLOOR} width={1200} height={374} style={{ position: "absolute", left: 0, bottom: 0, opacity: 0.85 }} />
      <div style={{ position: "absolute", left: 0, top: 0, width: 1200, height: 400, background: "linear-gradient(#0b0c0b 62%, rgba(11,12,11,0))" }} />
      <div style={{ display: "flex", alignItems: "center", gap: 18, padding: "56px 72px 0" }}>
        <img src={MARK} width={60} height={60} />
        <div style={{ fontSize: 46, fontWeight: 800, color: "#ece9e0", letterSpacing: 6 }}>GOLEM</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", padding: "34px 72px 0", fontSize: 76, fontWeight: 800, color: "#ece9e0", letterSpacing: -3, lineHeight: 1.02 }}>
        <div>Build an agent in one sentence.</div><div style={{ color: "#ff6a24" }}>Fire it when it loses.</div>
      </div>
    </div>, size);
}
