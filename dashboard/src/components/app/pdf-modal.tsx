"use client";

import { Modal } from "@/components/app/kit";
import { Button } from "@/components/tailgrids/core/button";
import type { ReactNode } from "react";

/** Native PDF preview in a dialog; the caller owns the object URL. */
export function PdfModal({ url, title, onClose, actions }: { url: string; title: string; onClose: () => void; actions?: ReactNode }) {
  return (
    <Modal open onClose={onClose} wide title={<span className="block truncate">{title}</span>}>
      <div className="space-y-3">
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        <iframe src={url} title={title} className="h-[70vh] w-full rounded-lg border border-card-border bg-background-gray-primary" />
        <div className="flex justify-end">
          <Button appearance="outline" variant="primary" size="sm" onPress={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}
