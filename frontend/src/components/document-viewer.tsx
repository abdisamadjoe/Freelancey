"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Download, FileText } from "lucide-react";
import {
  Alert,
  Badge,
  Button,
  EmptyState,
  Modal,
  ModalBody,
  ModalHeader,
  Spinner,
  Textarea,
} from "@/components/ui";
import { downloadFile } from "@/lib/download";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

const PDF_TYPES = new Set(["application/pdf"]);
const IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

interface DocumentViewerProps {
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
}

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
}: DocumentViewerProps) {
  const [responding, setResponding] = useState(false);
  const [currentResponse, setCurrentResponse] = useState(lastResponseAction);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showDeclineForm, setShowDeclineForm] = useState(false);
  const [declineReason, setDeclineReason] = useState("");

  const isPdf = PDF_TYPES.has(mimeType);
  const isImage = IMAGE_TYPES.has(mimeType);
  const canPreview = isPdf || isImage;

  const viewUrl = `${API_URL}/api/documents/${documentId}/view`;

  useEffect(() => {
    if (!canPreview) {
      setLoading(false);
      return;
    }

    let revoked = false;
    const controller = new AbortController();

    (async () => {
      try {
        setLoading(true);
        setLoadError(null);
        const res = await fetch(viewUrl, {
          credentials: "include",
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`Failed to load document (${res.status})`);
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        if (!revoked) setBlobUrl(url);
      } catch (err: unknown) {
        if (!revoked && (err as Error).name !== "AbortError") {
          setLoadError((err as Error).message);
        }
      } finally {
        if (!revoked) setLoading(false);
      }
    })();

    return () => {
      revoked = true;
      controller.abort();
      // Revoke previous blob URL to prevent memory leak on re-fetch
      setBlobUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    };
  }, [viewUrl, canPreview]);

  useEffect(() => {
    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [blobUrl]);

  const handleRespond = useCallback(
    async (action: string, reason?: string) => {
      setResponding(true);
      try {
        await onRespond(action, reason);
        setCurrentResponse(action);
        setShowDeclineForm(false);
        setDeclineReason("");
      } finally {
        setResponding(false);
      }
    },
    [onRespond],
  );

  const handleDownload = useCallback(async () => {
    try {
      await downloadFile(fileId, filename);
    } catch (err) {
      console.error(err);
    }
  }, [fileId, filename]);

  const alreadyResponded = hasResponded || !!currentResponse;
  const isNegativeResponse =
    currentResponse === "declined" || currentResponse === "rejected";

  return (
    <Modal
      open
      onClose={onClose}
      size="xl"
      scrollable={false}
      hideCloseButton
      className="flex max-h-[90vh] w-full flex-col overflow-hidden"
    >
      {/* Header — title, response state and document actions */}
      <ModalHeader
        className="shrink-0 items-center py-4"
        title={<span className="block truncate">{title}</span>}
        description={typeLabel}
      >
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {alreadyResponded && currentResponse ? (
            <Badge color={isNegativeResponse ? "error" : "success"}>
              {currentResponse.charAt(0).toUpperCase() + currentResponse.slice(1)}
            </Badge>
          ) : (
            <>
              {actions.length > 0 && (
                <>
                  <Button
                    variant="success"
                    size="sm"
                    onClick={() => handleRespond("accepted")}
                    disabled={responding}
                  >
                    {responding ? "..." : "Accept"}
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => setShowDeclineForm(true)}
                    disabled={responding}
                  >
                    Decline
                  </Button>
                </>
              )}
            </>
          )}

          <Button
            appearance="outline"
            size="sm"
            onClick={handleDownload}
            title="Download file"
          >
            <Download />
            <span className="hidden sm:inline">Download</span>
          </Button>

          <Button
            appearance="ghost"
            size="sm"
            iconOnly
            onClick={onClose}
            aria-label="Close"
          >
            <X />
          </Button>
        </div>
      </ModalHeader>

      {/* Decline reason form */}
      {showDeclineForm && (
        <ModalBody className="shrink-0 space-y-3 border-b border-card-border bg-alert-danger-background py-4">
          <p className="text-sm font-medium text-alert-danger-title">
            Decline this {typeLabel.toLowerCase()}?
          </p>
          <Textarea
            value={declineReason}
            onChange={(e) => setDeclineReason(e.target.value)}
            placeholder="Add a reason or message (optional)"
            className="resize-none bg-card-background"
            rows={2}
            autoFocus
          />
          <div className="flex flex-wrap gap-2">
            <Button
              variant="danger"
              size="sm"
              onClick={() => handleRespond("declined", declineReason || undefined)}
              disabled={responding}
            >
              {responding ? "Submitting..." : "Confirm Decline"}
            </Button>
            <Button
              appearance="outline"
              size="sm"
              onClick={() => {
                setShowDeclineForm(false);
                setDeclineReason("");
              }}
              disabled={responding}
            >
              Cancel
            </Button>
          </div>
        </ModalBody>
      )}

      {/* Content area — the document surface stays neutral */}
      <div className="min-h-0 flex-1 overflow-auto bg-background-gray-primary">
        {loading && canPreview && (
          <div className="flex h-96 items-center justify-center">
            <Spinner size={28} />
          </div>
        )}

        {loadError && (
          <div className="flex h-96 flex-col items-center justify-center gap-4 p-8 text-center">
            <Alert status="error" className="max-w-md text-left">
              {loadError}
            </Alert>
            <Button onClick={handleDownload}>
              <Download />
              Download instead
            </Button>
          </div>
        )}

        {!loading && !loadError && isPdf && blobUrl && (
          <iframe
            src={blobUrl}
            className="w-full border-0"
            style={{ height: "75vh" }}
            title={`Document: ${title}`}
          />
        )}

        {!loading && !loadError && isImage && blobUrl && (
          <div className="flex items-center justify-center p-6">
            <img
              src={blobUrl}
              alt={title}
              className="max-h-[70vh] max-w-full rounded-lg border-[0.5px] border-card-border bg-card-background object-contain"
            />
          </div>
        )}

        {!canPreview && (
          <div className="p-6">
            <EmptyState
              variant="plain"
              icon={FileText}
              title="Preview not available"
              description={
                <>
                  This file format (
                  {filename.split(".").pop()?.toUpperCase() || "unknown"}) cannot be
                  previewed in the browser. Please download the file to view it.
                </>
              }
              action={
                <Button onClick={handleDownload}>
                  <Download />
                  Download {filename}
                </Button>
              }
            />
          </div>
        )}
      </div>
    </Modal>
  );
}
