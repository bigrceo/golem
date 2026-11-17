/** hire mark: a heavy white "h" on an ink tile, its stem topped by an orange node (the agent). Built to read at 40 px in a
 *  token list, like the marks that migrate. */
export const MARK_PATHS = (fg = "#f5f1e8", node = "#f2621b") => (
  <>
    <path d="M22 24V52M22 39c0-7.5 4.8-11.5 10.8-11.5S43 31.5 43 39v13" fill="none" stroke={fg} strokeWidth="9.5" strokeLinecap="square" strokeLinejoin="round" />
    <circle cx="22" cy="14.5" r="6.5" fill={node} />
  </>
);
export function LogoMark({ size = 36 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden><rect width="64" height="64" rx="15" fill="#171c18" />{MARK_PATHS()}</svg>;
}
export function Logo({ size = 36 }: { size?: number }) {
  return <span className="inline-flex items-center gap-2.5 font-bold tracking-tight text-xl"><LogoMark size={size} /><span className="logo-word">hire</span></span>;
}
