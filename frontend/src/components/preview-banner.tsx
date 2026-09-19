"use client";

import { Eye, X } from "lucide-react";
import { buttonStyles } from "@/components/ui";
import { usePreviewMode } from "@/lib/preview-mode";

export function PreviewBanner() {
  const { preview, exitPreview } = usePreviewMode();
  if (!preview) return null;

  return (
    <div
      className="sticky top-0 z-40 w-full border-b-[0.5px] border-alert-warning-border bg-alert-warning-background text-alert-warning-title"
      role="status"
      aria-label="Preview mode banner"
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2 text-sm sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-2">
          <Eye className="size-4 shrink-0 text-alert-warning-description" aria-hidden />
          <span className="truncate">
            Previewing as <span className="font-medium">{preview.clientName}</span> — read-only
          </span>
        </div>
        <button
          type="button"
          onClick={exitPreview}
          className={buttonStyles({ variant: "primary", appearance: "outline", size: "sm" })}
        >
          <X aria-hidden />
          Exit preview
        </button>
      </div>
    </div>
  );
}
