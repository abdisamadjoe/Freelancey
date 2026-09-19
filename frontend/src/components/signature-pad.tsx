"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { Button, FieldDescription, Input, Tab, TabList, Tabs } from "@/components/ui";

const SIGNATURE_FONT_FAMILY = "Dancing Script";
const SIGNATURE_FONT_URL =
  "https://fonts.gstatic.com/s/dancingscript/v25/If2RXTr6YS-zF4S-kcSWSVi_szLgiuE.woff2";

interface SignaturePadProps {
  onSignatureChange: (dataUrl: string | null, method: "draw" | "type") => void;
}

export function SignaturePad({ onSignatureChange }: SignaturePadProps) {
  const [mode, setMode] = useState<"draw" | "type">("type");
  const [typedText, setTypedText] = useState("");
  const [fontLoaded, setFontLoaded] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const hasDrawn = useRef(false);
  const prevModeRef = useRef(mode);

  // Load signature font
  useEffect(() => {
    const font = new FontFace(
      SIGNATURE_FONT_FAMILY,
      `url(${SIGNATURE_FONT_URL})`,
      { style: "normal", weight: "700" },
    );
    font
      .load()
      .then((loaded) => {
        document.fonts.add(loaded);
        setFontLoaded(true);
      })
      .catch(() => {
        // Fall back gracefully
        setFontLoaded(true);
      });
  }, []);

  const getCanvas = () => canvasRef.current;
  const getCtx = () => getCanvas()?.getContext("2d") ?? null;

  const clearCanvas = useCallback(() => {
    const canvas = getCanvas();
    const ctx = getCtx();
    if (!canvas || !ctx) return;
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  const emitSignature = useCallback(() => {
    const canvas = getCanvas();
    if (!canvas) return;
    onSignatureChange(canvas.toDataURL("image/png"), mode);
  }, [onSignatureChange, mode]);

  const handleClear = useCallback(() => {
    clearCanvas();
    hasDrawn.current = false;
    setTypedText("");
    onSignatureChange(null, mode);
  }, [clearCanvas, onSignatureChange, mode]);

  // Initialize canvas dimensions
  useEffect(() => {
    const canvas = getCanvas();
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.scale(2, 2);
    clearCanvas();
  }, [clearCanvas]);

  // Re-clear when mode switches
  useEffect(() => {
    if (prevModeRef.current !== mode) {
      prevModeRef.current = mode;
      handleClear();
    }
  }, [mode, handleClear]);

  // Render typed text onto canvas
  useEffect(() => {
    if (mode !== "type" || !fontLoaded) return;
    clearCanvas();
    const canvas = getCanvas();
    const ctx = getCtx();
    if (!canvas || !ctx) return;
    if (!typedText.trim()) {
      onSignatureChange(null, "type");
      return;
    }
    const h = canvas.height / 2;
    const w = canvas.width / 2;
    ctx.font = `700 38px "${SIGNATURE_FONT_FAMILY}", cursive`;
    ctx.fillStyle = "#111";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(typedText, w / 2, h / 2, w - 32);
    emitSignature();
  }, [typedText, mode, fontLoaded, clearCanvas, emitSignature, onSignatureChange]);

  const getPos = (e: React.PointerEvent) => {
    const canvas = getCanvas()!;
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (mode !== "draw") return;
    isDrawing.current = true;
    hasDrawn.current = true;
    const ctx = getCtx();
    if (!ctx) return;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#111";
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!isDrawing.current) return;
    const ctx = getCtx();
    if (!ctx) return;
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const onPointerUp = () => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    if (hasDrawn.current) emitSignature();
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Tabs
          value={mode}
          onValueChange={(value) => setMode(value as "draw" | "type")}
          variant="pill"
          className="w-fit"
        >
          <TabList>
            <Tab value="type">Type</Tab>
            <Tab value="draw">Draw</Tab>
          </TabList>
        </Tabs>
        <Button appearance="outline" size="sm" className="ml-auto" onClick={handleClear}>
          Clear
        </Button>
      </div>

      {mode === "type" && (
        <Input
          type="text"
          value={typedText}
          onChange={(e) => setTypedText(e.target.value)}
          placeholder="Type your signature..."
          autoFocus
          style={{ fontFamily: `"${SIGNATURE_FONT_FAMILY}", cursive`, fontWeight: 700, fontSize: "1.25rem" }}
        />
      )}

      <canvas
        ref={canvasRef}
        className="w-full touch-none rounded-lg border border-card-border bg-white-100"
        style={{ height: 160, cursor: mode === "draw" ? "crosshair" : "default" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      />

      <FieldDescription>
        {mode === "type"
          ? "Your typed name is converted into a signature image."
          : "Draw your signature above with a mouse, stylus or finger."}
      </FieldDescription>
    </div>
  );
}
