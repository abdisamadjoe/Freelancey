// clean inline icon tile
export function BadgeIconProcess() {
  return (
    <div
      aria-hidden
      className="relative flex shrink-0 items-center justify-center rounded-[8px] shadow-[inset_0_1px_2px_0_rgba(255,255,255,0.1)]"
      style={{ width: "100%", height: "28px", backgroundColor: "#D3ECE3" }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#064E3B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="6" cy="6" r="2.5" /><circle cx="18" cy="18" r="2.5" /><path d="M8.5 6H14a4 4 0 0 1 0 8h-4a4 4 0 0 0 0 4h5.5" />
      </svg>
    </div>
  );
}
