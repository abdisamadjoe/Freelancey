"use client";

import { useUIState2 } from "./UIState2Provider";

function toEmbedUrl(url: string) {
  const m = url.match(/[?&]v=([^&]+)/);
  const id = m ? m[1] : "";
  return `https://www.youtube.com/embed/${id}?autoplay=1`;
}

/**
 * Reimplementation of the original Venobox lightbox (`.video-popup.vbox-item`
 * link to a YouTube URL). Venobox itself wasn't captured (no JS in the
 * source), so this is a plain modal with an embedded YouTube iframe.
 */
export function VideoLightbox() {
  const { videoUrl, closeVideo } = useUIState2();
  if (!videoUrl) return null;

  return (
    <div
      onClick={closeVideo}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        background: "rgba(0,0,0,0.85)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: "min(900px, 100%)", aspectRatio: "16 / 9", position: "relative" }}
      >
        <button
          type="button"
          aria-label="Close video"
          onClick={closeVideo}
          style={{
            position: "absolute",
            top: -40,
            right: 0,
            background: "none",
            border: "none",
            color: "#fff",
            fontSize: 28,
            cursor: "pointer",
            lineHeight: 1,
          }}
        >
          ×
        </button>
        <iframe
          src={toEmbedUrl(videoUrl)}
          title="Video"
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
          style={{ width: "100%", height: "100%", border: "none" }}
        />
      </div>
    </div>
  );
}
