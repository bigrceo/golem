import { ImageResponse } from "next/og";
export const size = { width: 64, height: 64 };
export const contentType = "image/png";
export default function Icon() {
  return new ImageResponse(
    <div style={{ width: 64, height: 64, background: "#0b0b0b", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 12 }}>
      <div style={{ width: 34, height: 34, background: "#ff5a1f", clipPath: "polygon(0 0,100% 0,100% 45%,45% 45%,45% 100%,0 100%)" }} />
    </div>, size);
}
