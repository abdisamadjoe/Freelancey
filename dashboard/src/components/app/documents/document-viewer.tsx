"use client";

import { ActionButton, Loading, Modal, Notice, StatusBadge, TextAreaInput } from "@/components/app/kit";
import { Button } from "@/components/tailgrids/core/button";
import { apiFetchBlob } from "@/lib/api";
import { downloadFile } from "@/lib/download";
import { useCallback, useEffect, useState } from "react";

const PREVIEWABLE = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp", "image/gif"]);

/** View a document and respond to it (accept / decline / acknowledge). */
export function DocumentViewer({
  documentId,
  title,
  typeLabel,
  mimeType,
  fileId,
  filename,
  hasResponded,
  lastResponseAction,
  actions,
  onRespond,
  onClose,
}: {
  documentId: string;
  title: string;
  typeLabel: string;
  mimeType: string;
  fileId: string;
  filename: string;
  hasResponded: boolean;
  lastResponseAction?: string;
  actions: string[];
  onRespond: (action: string, reason?: string) => Promise<void>;
  onClose: () => void;
}) {
  const [responding, setResponding] = useState(false);
  const [current, setCurrent] = useState(lastResponseAction);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showDecline, setShowDecline] = useState(false);
  const [reason, setReason] = useState("");

  const canPreview = PREVIEWABLE.has(mimeType);
  const isImage = mimeType.startsWith("image/");

  useEffect(() => {
    if (!canPreview) {
      setLoading(false);
      return;
    }
    let created: string | null = null;
    let cancelled = false;
    (async () => {
      try {
        const { blob } = await apiFetchBlob(`/documents/${documentId}/view`);
        created = URL.createObjectURL(blob);
        if (!cancelled) setBlobUrl(created);
      } catch (err) {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : "Failed to load document");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      if (created) URL.revokeObjectURL(created);
    };
  }, [documentId, canPreview]);

  const respond = useCallback(
    async (action: string, why?: string) => {
      setResponding(true);
      try {
        await onRespond(action, why);
        setCurrent(action);
        setShowDecline(false);
        setReason("");
      } finally {
        setResponding(false);
      }
    },
    [onRespond],
  );

  const responded = hasResponded || !!current;
  const negative = current === "declined" || current === "rejected";

  return (
    <Modal
      open
      wide
      onClose={onClose}
      title={title}
      description={typeLabel}
      footer={
        <>
          {responded && current ? (
            <StatusBadge color={negative ? "error" : "success"}>{current.charAt(0).toUpperCase() + current.slice(1)}</StatusBadge>
          ) : (
            actions.length > 0 && (
              <>
                <ActionButton variant="success" loading={responding} onPress={() => respond(actions.includes("acknowledged") ? "acknowledged" : "accepted")}>
                  {actions.includes("acknowledged") ? "Acknowledge" : "Accept"}
                </ActionButton>
                {!actions.includes("acknowledged") && (
                  <Button variant="danger" isDisabled={responding} onPress={() => setShowDecline(true)}>
                    Decline
                  </Button>
                )}
              </>
            )
          )}
          <Button appearance="outline" variant="primary" onPress={() => downloadFile(fileId, filename).catch(() => {})}>
            Download
          </Button>
          <Button appearance="outline" variant="primary" onPress={onClose}>
            Close
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        {showDecline && (
          <div className="space-y-2 rounded-lg border border-card-border p-3">
            <p className="text-sm font-medium text-text-primary">Decline this {typeLabel.toLowerCase()}?</p>
            <TextAreaInput rows={2} value={reason} onChange={setReason} placeholder="Add a reason or message (optional)" />
            <div className="flex gap-2">
              <ActionButton size="sm" variant="danger" loading={responding} onPress={() => respond("declined", reason || undefined)}>
                Confirm Decline
              </ActionButton>
              <Button size="sm" appearance="outline" variant="primary" onPress={() => setShowDecline(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
        {loading ? (
          <Loading />
        ) : loadError ? (
          <Notice status="error">{loadError}</Notice>
        ) : blobUrl && isImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={blobUrl} alt={title} className="mx-auto max-h-[65vh] rounded-lg" />
        ) : blobUrl ? (
          <iframe src={blobUrl} title={title} className="h-[65vh] w-full rounded-lg border border-card-border" />
        ) : (
          <Notice status="info">This file type can&apos;t be previewed. Use Download to open it.</Notice>
        )}
      </div>
    </Modal>
  );
}
