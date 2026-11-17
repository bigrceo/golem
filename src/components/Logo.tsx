/** golem mark: two stacked stones, head and body, with an orange eye and a glowing core. Ink on an orange tile. */
export const MARK_SVG = () => `<rect x="22" y="10.5" width="20" height="15.5" rx="5.5" fill="#0b0c0b"/><rect x="14.5" y="29" width="35" height="24.5" rx="7.5" fill="#0b0c0b"/><circle cx="32" cy="18.2" r="3.4" fill="#ff6a24"/><rect x="24.5" y="38.5" width="15" height="3.4" rx="1.7" fill="#ff6a24" opacity=".9"/>`;
export function LogoMark({ size = 36 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden dangerouslySetInnerHTML={{ __html: `<rect width="64" height="64" rx="16" fill="#ff6a24"/>${MARK_SVG()}` }} />;
}
export function Logo({ size = 34 }: { size?: number }) {
  return <span className="inline-flex items-center"><LogoMark size={size} /></span>;
}
