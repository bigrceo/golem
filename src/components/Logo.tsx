/** golem mark: a geometric G whose bar ends in a node (the agent), ink on an orange tile. Reads at 16 px. */
export const MARK_SVG = (ink = "#0b0c0b") => `<path d="M43.6 20.4A16.2 16.2 0 1 0 48.2 32H34" fill="none" stroke="${ink}" stroke-width="8.4" stroke-linecap="round" stroke-linejoin="round"/><circle cx="33.6" cy="32" r="5.6" fill="${ink}"/>`;
export function LogoMark({ size = 36 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden dangerouslySetInnerHTML={{ __html: `<rect width="64" height="64" rx="16" fill="#ff6a24"/>${MARK_SVG()}` }} />;
}
export function Logo({ size = 34 }: { size?: number }) {
  return <span className="inline-flex items-center gap-2.5 font-bold tracking-[-0.04em] text-[22px]"><LogoMark size={size} /><span className="logo-word">golem</span></span>;
}
