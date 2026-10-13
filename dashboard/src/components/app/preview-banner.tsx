"use client";

import { Button } from "@/components/tailgrids/core/button";
import { Notice } from "@/components/app/kit";
import { usePreviewMode } from "@/lib/preview-mode";

export function PreviewBanner() {
  const { preview, exitPreview } = usePreviewMode();
  if (!preview) return null;

  return (
    <div className="mt-6 flex flex-wrap items-center gap-3 px-2 lg:px-5">
      <div className="min-w-0 flex-1">
        <Notice status="warning">
          Previewing as {preview.clientName} (read-only)
        </Notice>
      </div>
      <Button appearance="outline" variant="primary" size="sm" onPress={exitPreview}>
        Exit preview
      </Button>
    </div>
  );
}
