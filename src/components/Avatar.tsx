/** Branded agent avatar: black tile, white initial, the hire corner mark in orange. */
export default function Avatar({ id, name, size = 40 }: { id: string; name: string; size?: number }) {
  const corners = ["tl", "tr", "br", "bl"] as const;
  const c = corners[[...id].reduce((a, ch) => a + ch.charCodeAt(0), 0) % 4];
  const m = Math.round(size * 0.3);
  const pos = { tl: { top: 0, left: 0 }, tr: { top: 0, right: 0 }, br: { bottom: 0, right: 0 }, bl: { bottom: 0, left: 0 } }[c];
  const clip = { tl: "polygon(0 0,100% 0,100% 45%,45% 45%,45% 100%,0 100%)", tr: "polygon(0 0,100% 0,100% 100%,55% 100%,55% 45%,0 45%)", br: "polygon(100% 0,100% 100%,0 100%,0 55%,55% 55%,55% 0)", bl: "polygon(0 0,45% 0,45% 55%,100% 55%,100% 100%,0 100%)" }[c];
  return (
    <span className="relative inline-flex items-center justify-center shrink-0 bg-[#171c18] text-white font-bold rounded-[4px]" style={{ width: size, height: size, fontSize: size * 0.42 }} aria-hidden>
      {name[0]}
      <span className="absolute bg-[var(--brand)]" style={{ width: m, height: m, clipPath: clip, ...pos }} />
    </span>
  );
}
