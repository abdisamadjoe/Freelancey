"use client";

import { Button } from "@/components/tailgrids/core/button";
import { cn } from "@/utils/cn";
import { useCallback, useEffect, useRef, useState } from "react";

const SIGNATURE_FONT_FAMILY = "Dancing Script";
const SIGNATURE_FONT_URL = "https://fonts.gstatic.com/s/dancingscript/v25/If2RXTr6YS-zF4S-kcSWSVi_szLgiuE.woff2";

/** Draw or type a signature; emits a PNG data URL (or null while empty). */
export function SignaturePad({ onSignatureChange }: { onSignatureChange: (dataUrl: string | null, method: "draw" | "type") => void }) {
  const [mode, setMode] = useState<"draw" | "type">("type");
  const [typedText, setTypedText] = useState("");
  const [fontLoaded, setFontLoaded] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const prevMode = useRef(mode);

  useEffect(() => {
    const font = new FontFace(SIGNATURE_FONT_FAMILY, `url(${SIGNATURE_FONT_URL})`, { style: "normal", weight: "700" });
    font
      .load()
      .then((loaded) => {
        document.fonts.add(loaded);
        setFontLoaded(true);
      })
      .catch(() => setFontLoaded(true));
  }, []);

  const ctx = () => canvasRef.current?.getContext("2d") ?? null;

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const c = canvas?.getContext("2d");
    if (!canvas || !c) return;
    c.fillStyle = "white";
    c.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  const emit = useCallback(() => {
    const canvas = canvasRef.current;
    if (canvas) onSignatureChange(canvas.toDataURL("image/png"), mode);
  }, [onSignatureChange, mode]);

  const handleClear = useCallback(() => {
    clearCanvas();
    setTypedText("");
    onSignatureChange(null, mode);
  }, [clearCanvas, onSignatureChange, mode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    canvas.getContext("2d")?.scale(2, 2);
    clearCanvas();
  }, [clearCanvas]);

  useEffect(() => {
    if (prevMode.current !== mode) {
      prevMode.current = mode;
      handleClear();
    }
  }, [mode, handleClear]);

  useEffect(() => {
    if (mode !== "type" || !fontLoaded) return;
    clearCanvas();
    const canvas = canvasRef.current;
    const c = ctx();
    if (!canvas || !c) return;
    if (!typedText.trim()) {
      onSignatureChange(null, "type");
      return;
    }
    const h = canvas.height / 2;
    const w = canvas.width / 2;
    c.font = `700 38px "${SIGNATURE_FONT_FAMILY}", cursive`;
    c.fillStyle = "#111";
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText(typedText, w / 2, h / 2, w - 32);
    emit();
  }, [typedText, mode, fontLoaded, clearCanvas, emit, onSignatureChange]);

  const pos = (e: React.PointerEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const down = (e: React.PointerEvent) => {
    if (mode !== "draw") return;
    isDrawing.current = true;
    const c = ctx();
    if (!c) return;
    const p = pos(e);
    c.beginPath();
    c.moveTo(p.x, p.y);
    c.lineWidth = 2;
    c.lineCap = "round";
    c.strokeStyle = "#111";
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const move = (e: React.PointerEvent) => {
    if (!isDrawing.current || mode !== "draw") return;
    const c = ctx();
    if (!c) return;
    const p = pos(e);
    c.lineTo(p.x, p.y);
    c.stroke();
  };
  const up = () => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    emit();
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {(["type", "draw"] as const).map((m) => (
          <Button key={m} size="sm" appearance={mode === m ? "fill" : "outline"} variant="primary" onPress={() => setMode(m)}>
            {m === "type" ? "Type" : "Draw"}
          </Button>
        ))}
        <Button size="sm" variant="ghost" onPress={handleClear}>
          Clear
        </Button>
      </div>
      {mode === "type" && (
        <input
          type="text"
          value={typedText}
          onChange={(e) => setTypedText(e.target.value)}
          placeholder="Type your name"
          maxLength={80}
          className="h-10 w-full rounded-lg border border-card-border bg-input-background px-3 text-sm text-title-50 outline-none focus:border-input-primary-focus-border"
        />
      )}
      <canvas
        ref={canvasRef}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerLeave={up}
        className={cn("h-32 w-full rounded-lg border border-card-border bg-white", mode === "draw" ? "cursor-crosshair touch-none" : "")}
      />
    </div>
  );
}
