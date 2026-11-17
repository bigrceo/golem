/** GOLEM mark: a stone head brought to life by one word, the orange line on its brow, with glowing eyes.
 *  One glyph, high contrast, reads at 40 px in a token list. */
export const MARK = { bg: "#0b0c0b", stone: "#ece6d6", fire: "#ff6a24", ink: "#0b0c0b" };
export const MARK_SVG = (s = MARK) => `<g transform="translate(-5.4 -5) scale(1.17)"><path d="M16 21c0-5.5 3.8-9 9.3-9h13.4c5.5 0 9.3 3.5 9.3 9v19.5c0 7.5-5 12.5-12 12.5h-8c-7 0-12-5-12-12.5Z" fill="${s.stone}"/><rect x="27" y="17.2" width="10" height="2.6" rx="1.3" fill="${s.fire}"/><rect x="21.5" y="27" width="8" height="5.4" rx="1.2" fill="${s.fire}"/><rect x="34.5" y="27" width="8" height="5.4" rx="1.2" fill="${s.fire}"/><rect x="26.5" y="42" width="11" height="2.8" rx="1.4" fill="${s.ink}"/><path d="M44.5 35.5l-3.2 3 1.4 2.4" fill="none" stroke="${s.ink}" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" opacity=".55"/></g>`;
export function LogoMark({ size = 36 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden dangerouslySetInnerHTML={{ __html: `<rect width="64" height="64" rx="15" fill="${MARK.bg}" stroke="rgba(236,233,224,.14)"/>${MARK_SVG()}` }} />;
}
export function Logo({ size = 36 }: { size?: number }) {
  return <span className="inline-flex items-center gap-2.5 font-extrabold tracking-[.08em] text-lg"><LogoMark size={size} /><span className="logo-word">GOLEM</span></span>;
}
