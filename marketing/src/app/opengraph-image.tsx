import { ImageResponse } from "next/og";

export const alt = "Gigly: open-source client and project management for freelancers";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 80,
          background: "linear-gradient(135deg,#064E3B 0%,#0B6B52 100%)",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 40, opacity: 0.85, display: "flex" }}>Gigly</div>
        <div style={{ fontSize: 84, fontWeight: 700, lineHeight: 1.05, marginTop: 24, display: "flex" }}>
          Win clients and deliver projects faster
        </div>
        <div style={{ fontSize: 32, opacity: 0.85, marginTop: 32, display: "flex" }}>
          Open-source client and project management for freelancers
        </div>
      </div>
    ),
    size,
  );
}
