// clean inline icon tile
export function BadgeIconFeatures() {
  return (
    <div
      aria-hidden
      className="relative flex shrink-0 items-center justify-center rounded-[8px] shadow-[inset_0_1px_2px_0_rgba(255,255,255,0.1)]"
      style={{ width: "100%", height: "22.4px", backgroundColor: "rgb(24, 25, 27)" }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 6h16M4 12h10M4 18h16" /><circle cx="19" cy="12" r="1.5" />
      </svg>
    </div>
  );
}
