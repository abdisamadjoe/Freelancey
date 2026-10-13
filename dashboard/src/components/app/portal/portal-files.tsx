"use client";

import { DocumentViewer } from "@/components/app/documents/document-viewer";
import { SigningViewer } from "@/components/app/documents/signing-viewer";
import { Empty, fmtDate, Notice, PagerRow, Panel, StatusBadge, StatusPill } from "@/components/app/kit";
import { Button } from "@/components/tailgrids/core/button";
import { apiFetch, apiFetchBlob } from "@/lib/api";
import { downloadFile } from "@/lib/download";
import { usePreviewMode } from "@/lib/preview-mode";
import { formatBytes } from "@/lib/utils";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

interface FileRecord {
  id: string;
  filename: string;
  type?: "UPLOAD" | "LINK";
  mimeType?: string | null;
  sizeBytes?: number | null;
  url?: string | null;
  description?: string | null;
  createdAt: string;
}

interface DocumentRecord {
  id: string;
  type: string;
  title: string;
  status: string;
  requiresSignature: boolean;
  requiresApproval: boolean;
  signedFile?: { id: string; filename: string; sizeBytes: number };
  signatureFields?: { id: string }[];
  file: { id: string; filename: string; mimeType: string; sizeBytes: number };
  responses: { id: string; action: string; createdAt: string; fieldId?: string; reason?: string }[];
  createdAt: string;
  expiresAt?: string;
  voidReason?: string;
  options?: string;
}

const TYPE_LABEL: Record<string, string> = { quote: "Quote", contract: "Contract", proposal: "Proposal", nda: "NDA", other: "Other" };

export function PortalFilesSection({
  projectId,
  files,
  isArchived,
  onFilesChange,
}: {
  projectId: string;
  files: FileRecord[];
  isArchived?: boolean;
  onFilesChange: () => void;
}) {
  const { preview } = usePreviewMode();
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [uploading, setUploading] = useState(false);
  const [signingId, setSigningId] = useState<string | null>(null);
  const [viewing, setViewing] = useState<DocumentRecord | null>(null);
  const [choice, setChoice] = useState<Record<string, string>>({});

  const load = useCallback(() => {
    apiFetch<{ data: DocumentRecord[]; meta: { totalPages: number } }>(`/documents/mine/${projectId}?page=${page}&limit=20`)
      .then((res) => {
        setDocuments(res.data);
        setTotalPages(res.meta.totalPages);
        // Track a view for the first pending document only (avoids N requests)
        const first = res.data.find((d) => d.status === "pending");
        if (first) apiFetch(`/documents/${first.id}/track-view`, { method: "POST" }).catch(() => {});
      })
      .catch(() => {});
  }, [projectId, page]);

  useEffect(() => {
    load();
  }, [load]);

  async function respond(docId: string, action: string, reason?: string) {
    await apiFetch(`/documents/${docId}/respond`, { method: "POST", body: JSON.stringify({ action, ...(reason ? { reason } : {}) }) });
    toast.success(action === "accepted" ? "Document accepted" : action === "declined" ? "Document declined" : "Response recorded");
    load();
  }

  async function certificate(doc: DocumentRecord) {
    try {
      const { blob } = await apiFetchBlob(`/documents/${doc.id}/certificate`);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `certificate-${doc.id.slice(0, 8)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Failed to download certificate");
    }
  }

  return (
    <>
      <Panel
        flush
        title="Files"
        action={
          !isArchived &&
          !preview && (
            <label className="cursor-pointer">
              <input
                type="file"
                className="sr-only"
                disabled={uploading}
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (!f) return;
                  setUploading(true);
                  try {
                    const fd = new FormData();
                    fd.append("file", f);
                    await apiFetch(`/files/upload/mine?projectId=${projectId}`, { method: "POST", body: fd });
                    toast.success("File uploaded");
                    onFilesChange();
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : "Upload failed");
                  } finally {
                    setUploading(false);
                  }
                }}
              />
              <span className="inline-flex h-9 items-center rounded-lg bg-button-primary-background px-3 text-sm font-medium text-white-100">
                {uploading ? "Uploading..." : "Upload file"}
              </span>
            </label>
          )
        }
      >
        <div className="border-t border-card-border">
          {files.length === 0 ? (
            <Empty>No files yet.</Empty>
          ) : (
            <ul className="divide-y divide-card-border">
              {files.map((f) => (
                <li key={f.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-text-primary">
                      {f.type === "LINK" ? (
                        <a href={f.url ?? "#"} target="_blank" rel="noopener noreferrer" className="text-neutral-brand-color hover:underline">
                          {f.filename}
                        </a>
                      ) : (
                        f.filename
                      )}
                    </p>
                    <p className="text-xs text-text-tertiary">
                      {f.type === "LINK" ? "Link" : f.sizeBytes != null ? formatBytes(f.sizeBytes) : ""} · {fmtDate(f.createdAt)}
                    </p>
                  </div>
                  {f.type !== "LINK" && (
                    <Button size="xs" appearance="outline" variant="primary" onPress={() => downloadFile(f.id, f.filename).catch((e) => toast.error(e.message))}>
                      Download
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </Panel>

      {documents.length > 0 && (
        <Panel flush title="Documents" description="Review, accept or sign documents shared with you.">
          <ul className="divide-y divide-card-border border-t border-card-border">
            {documents.map((doc) => {
              const voided = doc.status === "voided" || doc.status === "void";
              const expired = doc.status === "expired";
              const readOnly = voided || expired;
              const approvals = doc.responses.filter((r) => r.action !== "signed");
              const hasResponded = approvals.length > 0;
              const last = hasResponded ? approvals[0] : null;
              const needsSigning = doc.requiresSignature && (doc.signatureFields?.length ?? 0) > 0;
              const signedIds = doc.responses.filter((r) => r.action === "signed" && r.fieldId).map((r) => r.fieldId);
              const allSigned = needsSigning && doc.signatureFields!.every((f) => signedIds.includes(f.id));
              const hasUnsigned = needsSigning && !allSigned && !readOnly;

              // Options format: "question|choice1,choice2" or "choice1,choice2"
              const sep = doc.options?.includes("|");
              const question = sep ? doc.options!.split("|")[0] : null;
              const raw = sep ? doc.options!.split("|")[1] : doc.options;
              const choices = raw ? raw.split(",").map((o) => o.trim()).filter(Boolean) : [];
              const selected = choice[doc.id] || last?.reason || "";

              return (
                <li key={doc.id} className={`space-y-3 px-5 py-4 ${readOnly ? "opacity-60" : ""}`}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <button type="button" className="min-w-0 text-left" onClick={() => setViewing(doc)}>
                      <span className="flex flex-wrap items-center gap-2 text-sm font-medium text-text-primary">
                        {doc.title}
                        <StatusBadge color="gray">{TYPE_LABEL[doc.type] ?? doc.type}</StatusBadge>
                        {voided && <StatusBadge color="error">Voided</StatusBadge>}
                        {expired && <StatusBadge color="gray">Expired</StatusBadge>}
                      </span>
                      <span className="block text-xs text-text-tertiary">
                        {formatBytes(doc.file.sizeBytes)}
                        {doc.expiresAt && !expired ? ` · Expires ${fmtDate(doc.expiresAt)}` : ""}
                      </span>
                    </button>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button size="xs" appearance="outline" variant="primary" onPress={() => downloadFile(doc.file.id, doc.file.filename).catch((e) => toast.error(e.message))}>
                        Download
                      </Button>
                      {doc.status === "signed" && (
                        <Button size="xs" variant="ghost" onPress={() => certificate(doc)}>
                          Certificate
                        </Button>
                      )}
                      {!readOnly && choices.length === 0 && (
                        <>
                          {doc.requiresApproval && hasResponded && last ? (
                            <StatusPill status={last.action} />
                          ) : (
                            doc.requiresApproval && (
                              <>
                                <Button size="xs" variant="success" isDisabled={!!preview} onPress={() => respond(doc.id, "accepted")}>
                                  Accept
                                </Button>
                                <Button size="xs" variant="danger" isDisabled={!!preview} onPress={() => setViewing(doc)}>
                                  Decline
                                </Button>
                              </>
                            )
                          )}
                          {hasUnsigned && (
                            <Button size="xs" variant="primary" isDisabled={!!preview} onPress={() => setSigningId(doc.id)}>
                              Sign
                            </Button>
                          )}
                          {allSigned && <StatusBadge color="success">Signed</StatusBadge>}
                        </>
                      )}
                    </div>
                  </div>

                  {!readOnly && choices.length > 0 && (
                    <div className="space-y-2 rounded-lg border border-card-border p-3">
                      {question && <p className="text-sm font-medium text-text-primary">{question}</p>}
                      <div className="space-y-1.5">
                        {choices.map((c) => (
                          <label key={c} className="flex cursor-pointer items-center gap-2 text-sm text-text-primary">
                            <input
                              type="radio"
                              name={`opt-${doc.id}`}
                              checked={selected === c}
                              disabled={hasResponded || !!preview}
                              onChange={() => setChoice((p) => ({ ...p, [doc.id]: c }))}
                            />
                            {c}
                          </label>
                        ))}
                      </div>
                      {!hasResponded && (
                        <Button
                          size="xs"
                          variant="primary"
                          isDisabled={!choice[doc.id] || !!preview}
                          onPress={async () => {
                            try {
                              await apiFetch(`/documents/${doc.id}/respond`, {
                                method: "POST",
                                body: JSON.stringify({ action: "accepted", reason: choice[doc.id] }),
                              });
                              toast.success(`Selection "${choice[doc.id]}" submitted.`);
                              load();
                            } catch (err) {
                              toast.error(err instanceof Error ? err.message : "Failed to submit");
                            }
                          }}
                        >
                          Submit selection
                        </Button>
                      )}
                    </div>
                  )}
                  {voided && doc.voidReason && <Notice status="warning">{doc.voidReason}</Notice>}
                </li>
              );
            })}
          </ul>
          <div className="px-5 pb-5">
            <PagerRow page={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        </Panel>
      )}

      {signingId && <SigningViewer documentId={signingId} onClose={() => setSigningId(null)} onSigned={load} />}

      {viewing && (
        <DocumentViewer
          documentId={viewing.id}
          title={viewing.title}
          typeLabel={TYPE_LABEL[viewing.type] ?? viewing.type}
          mimeType={viewing.file.mimeType}
          fileId={viewing.file.id}
          filename={viewing.file.filename}
          hasResponded={viewing.requiresApproval && viewing.responses.filter((r) => r.action !== "signed").length > 0}
          lastResponseAction={viewing.responses.filter((r) => r.action !== "signed")[0]?.action}
          actions={viewing.requiresApproval && !preview ? ["accepted", "declined"] : []}
          onRespond={(action, reason) => respond(viewing.id, action, reason)}
          onClose={() => setViewing(null)}
        />
      )}
    </>
  );
}
