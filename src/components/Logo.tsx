/** hire mark: the robot from the engravings, seen in profile, with its orange ear disc, on an ink tile. */
export function LogoMark({ size = 36, tile = true }: { size?: number; tile?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      {tile && <rect width="64" height="64" rx="15" fill="#171c18" />}
      <g transform="translate(-6.5 -5.5) scale(1.2)"><path d="M20 47c-1.6-4-2.5-8.2-2.5-12.6C17.5 23.5 25.4 15 35.6 15c8.9 0 15.9 6.6 15.9 15.4 0 3.2-.8 5.6-2.3 7.6l1.6 4.6-4.2 1v4.2c0 1.7-1.4 3.2-3.2 3.2h-6.1l-.6 3H22.5Z" fill={tile ? "#f5f1e8" : "#171c18"} /><path d="M24.5 22.5c3.2 2.6 5.6 6 6.5 10.5" fill="none" stroke="#171c18" strokeWidth="1.3" opacity=".35"/>
      <circle cx="31" cy="33" r="7.2" fill="#f2621b" />
      <circle cx="31" cy="33" r="3.4" fill={tile ? "#171c18" : "#f5f1e8"} />
      <circle cx="43.5" cy="28.5" r="1.9" fill={tile ? "#171c18" : "#f5f1e8"} /></g>
    </svg>
  );
}
export function Logo({ size = 36 }: { size?: number }) {
  return <span className="inline-flex items-center gap-2.5 font-bold tracking-tight text-xl"><LogoMark size={size} /><span className="logo-word">hire</span></span>;
}
