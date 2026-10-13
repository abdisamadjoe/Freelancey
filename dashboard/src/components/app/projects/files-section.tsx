"use client";

import { SignatureFieldPlacer } from "@/components/app/documents/signature-field-placer";
import { SigningViewer } from "@/components/app/documents/signing-viewer";
import {
  ActionButton,
  Empty,
  fmtDate,
  fmtDateTime,
  Modal,
  PagerRow,
  Panel,
  SelectInput,
  StatusPill,
  TextInput,
  useConfirm,
} from "@/components/app/kit";
import { Button, buttonStyles } from "@/components/tailgrids/core/button";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { apiFetch, apiFetchBlob } from "@/lib/api";
import { downloadFile } from "@/lib/download";
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

interface DocumentResponse {
  id: string;
  userId: string;
  action: string;
  createdAt: string;
  signedAt?: string;
  user: { id: string; name: string };
}

interface DocumentVersion {
  id: string;
  version: number;
  file: { id: string; filename: string; sizeBytes: number };
  uploadedBy?: { id: string; name: string };
  createdAt: string;
}

interface DocumentRecord {
  id: string;
  type: string;
  title: string;
  status: string;
  requiresSignature: boolean;
  signedFileId?: string;
  signedFile?: { id: string; filename: string; mimeType: string; sizeBytes: number };
  file: { id: string; filename: string; mimeType: string; sizeBytes: number };
  signatureFields?: { id: string }[];
  responses: DocumentResponse[];
  versions?: DocumentVersion[];
  currentVersion?: number;
  createdAt: string;
  sentAt?: string;
  expiresAt?: string;
  voidReason?: string;
}

interface AuditEvent {
  id: string;
  action: string;
  createdAt: string;
  ipAddress?: string;
  user?: { id: string; name: string; email: string } | null;
}

interface ClientMember {
  id: string;
  userId: string;
  user: { id: string; name: string; email: string };
}

interface SigningLink {
  id: string;
  token: string;
  userId?: string;
  expiresAt: string;
  usedAt?: string | null;
  user?: { name: string; email: string };
}

export const DOC_TYPES = [
  { value: "contract", label: "Contract" },
  { value: "quote", label: "Quote" },
  { value: "proposal", label: "Proposal" },
  { value: "nda", label: "NDA" },
  { value: "other", label: "Other" },
];

export function FilesSection({
  projectId,
  isArchived,
  files,
  onFileChange,
  projectClients,
}: {
  projectId: string;
  isArchived: boolean;
  files: FileRecord[];
  onFileChange: () => void;
  projectClients: ClientMember[];
}) {
  const { confirm, dialog } = useConfirm();
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [docsPage, setDocsPage] = useState(1);
  const [docsTotalPages, setDocsTotalPages] = useState(1);

  // file upload + link
  const [uploading, setUploading] = useState(false);
  const [editFile, setEditFile] = useState<FileRecord | null>(null);
  const [editFilename, setEditFilename] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editUrl, setEditUrl] = useState("");

  // document upload

  // document dialogs
  // `?place=<documentId>` arrives from the New document page when a signature still has to be placed.
  const [placerFor, setPlacerFor] = useState<string | null>(useSearchParams().get("place"));
  const [signFor, setSignFor] = useState<DocumentRecord | null>(null);
  const [voidFor, setVoidFor] = useState<string | null>(null);
  const [voidReason, setVoidReason] = useState("");
  const [versionsFor, setVersionsFor] = useState<DocumentRecord | null>(null);
  const [auditFor, setAuditFor] = useState<DocumentRecord | null>(null);
  const [audit, setAudit] = useState<AuditEvent[]>([]);
  const [linksFor, setLinksFor] = useState<DocumentRecord | null>(null);
  const [links, setLinks] = useState<SigningLink[]>([]);
  const [linkUserId, setLinkUserId] = useState("");

  const loadDocuments = useCallback(async () => {
    try {
      const res = await apiFetch<{ data: DocumentRecord[]; meta: { totalPages: number } }>(
        `/documents/project/${projectId}?page=${docsPage}&limit=20`,
      );
      setDocuments(res.data);
      setDocsTotalPages(res.meta.totalPages);
    } catch {
      /* the list stays empty */
    }
  }, [projectId, docsPage]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  async function uploadFile(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      await apiFetch(`/files/upload?projectId=${projectId}`, { method: "POST", body: fd });
      toast.success("File uploaded");
      onFileChange();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function deleteFile(f: FileRecord) {
    const ok = await confirm({ title: "Delete file", message: `Delete "${f.filename}"?`, confirmLabel: "Delete", danger: true });
    if (!ok) return;
    try {
      await apiFetch(`/files/${f.id}`, { method: "DELETE" });
      onFileChange();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete file");
    }
  }

  async function saveEditFile() {
    if (!editFile || !editFilename.trim()) return;
    const body: { filename?: string; description?: string; url?: string } = {};
    if (editFilename.trim() !== editFile.filename) body.filename = editFilename.trim();
    if (editDescription.trim() !== (editFile.description ?? "")) body.description = editDescription.trim();
    if (editFile.type === "LINK" && editUrl.trim() && editUrl.trim() !== (editFile.url ?? "")) body.url = editUrl.trim();
    if (Object.keys(body).length === 0) {
      setEditFile(null);
      return;
    }
    try {
      await apiFetch(`/files/${editFile.id}`, { method: "PATCH", body: JSON.stringify(body) });
      setEditFile(null);
      onFileChange();
      toast.success("File updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update file");
    }
  }

  async function docAction(label: string, run: () => Promise<unknown>, ok: string) {
    try {
      await run();
      toast.success(ok);
      loadDocuments();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Failed to ${label}`);
    }
  }

  async function openAudit(doc: DocumentRecord) {
    setAuditFor(doc);
    try {
      const res = await apiFetch<{ data: AuditEvent[] }>(`/documents/${doc.id}/audit-trail?limit=50`);
      setAudit(res.data);
    } catch {
      setAudit([]);
    }
  }

  async function downloadCertificate(doc: DocumentRecord) {
    try {
      const { blob } = await apiFetchBlob(`/documents/${doc.id}/certificate`);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${doc.title}-certificate.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to download certificate");
    }
  }

  async function refreshLinks(docId: string) {
    try {
      setLinks(await apiFetch<SigningLink[]>(`/documents/${docId}/access-tokens`));
    } catch {
      setLinks([]);
    }
  }


  return (
    <>
      <Panel
        flush
        title="Files"
        description="Shared with everyone on the project."
        action={
          !isArchived && (
            <>
              <label className="cursor-pointer">
                <input
                  type="file"
                  className="sr-only"
                  disabled={uploading}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    e.target.value = "";
                    if (f) uploadFile(f);
                  }}
                />
                <span className="inline-flex h-9 items-center rounded-lg bg-button-primary-background px-3 text-sm font-medium text-white-100">
                  {uploading ? "Uploading..." : "Upload file"}
                </span>
              </label>
              <Link
                href={`/dashboard/projects/${projectId}/files/new-link`}
                className={buttonStyles({ size: "sm", appearance: "outline", variant: "primary" })}
              >
                Add link
              </Link>
            </>
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
                      {f.description ? ` · ${f.description}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {f.type !== "LINK" && (
                      <Button size="xs" appearance="outline" variant="primary" onPress={() => downloadFile(f.id, f.filename).catch((e) => toast.error(e.message))}>
                        Download
                      </Button>
                    )}
                    {!isArchived && (
                      <>
                        <Button
                          size="xs"
                          variant="ghost"
                          onPress={() => {
                            setEditFile(f);
                            setEditFilename(f.filename);
                            setEditDescription(f.description ?? "");
                            setEditUrl(f.url ?? "");
                          }}
                        >
                          Edit
                        </Button>
                        <Button size="xs" variant="danger" appearance="ghost" onPress={() => deleteFile(f)}>
                          Delete
                        </Button>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Panel>

      <Panel
        flush
        title="Documents"
        description="Contracts, quotes and agreements the client can accept, decline or sign."
        action={
          !isArchived && (
            <Link href={`/dashboard/projects/${projectId}/files/new-document`} className={buttonStyles({ size: "sm" })}>
              New document
            </Link>
          )
        }
      >
        <div className="border-t border-card-border">
          {documents.length === 0 ? (
            <Empty>No documents yet.</Empty>
          ) : (
            <ul className="divide-y divide-card-border">
              {documents.map((d) => (
                <li key={d.id} className="space-y-2 px-5 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-text-primary">
                        {d.title} {(d.currentVersion ?? 1) > 1 && <span className="text-xs text-text-tertiary">v{d.currentVersion}</span>}
                      </p>
                      <p className="text-xs text-text-tertiary">
                        {DOC_TYPES.find((t) => t.value === d.type)?.label ?? d.type}
                        {d.requiresSignature ? " · signature required" : ""} · {fmtDate(d.createdAt)}
                        {d.expiresAt ? ` · expires ${fmtDate(d.expiresAt)}` : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-1">
                      <StatusPill status={d.status} />
                      <Button size="xs" appearance="outline" variant="primary" onPress={() => downloadFile((d.signedFile ?? d.file).id, (d.signedFile ?? d.file).filename).catch((e) => toast.error(e.message))}>
                        {d.signedFile ? "Signed copy" : "Download"}
                      </Button>
                      {d.requiresSignature && !isArchived && d.status === "draft" && (
                        <Button size="xs" appearance="outline" variant="primary" onPress={() => setPlacerFor(d.id)}>
                          Place fields
                        </Button>
                      )}
                      {!isArchived && d.status === "draft" && (
                        <Button
                          size="xs"
                          variant="primary"
                          onPress={() => {
                            if (d.requiresSignature && !(d.signatureFields?.length)) {
                              setPlacerFor(d.id);
                              return;
                            }
                            docAction("send document", () => apiFetch(`/documents/${d.id}/send`, { method: "POST", body: JSON.stringify({}) }), "Document sent");
                          }}
                        >
                          Send
                        </Button>
                      )}
                      {d.requiresSignature && d.status !== "draft" && d.status !== "void" && (
                        <Button
                          size="xs"
                          appearance="outline"
                          variant="primary"
                          onPress={() => {
                            setLinksFor(d);
                            refreshLinks(d.id);
                          }}
                        >
                          Signing links
                        </Button>
                      )}
                      {(d.versions?.length ?? 0) > 0 && (
                        <Button size="xs" variant="ghost" onPress={() => setVersionsFor(d)}>
                          Versions
                        </Button>
                      )}
                      <Button size="xs" variant="ghost" onPress={() => openAudit(d)}>
                        Audit trail
                      </Button>
                      {d.status === "signed" && (
                        <Button size="xs" variant="ghost" onPress={() => downloadCertificate(d)}>
                          Certificate
                        </Button>
                      )}
                      {!isArchived && d.status !== "draft" && d.status !== "void" && (
                        <Button size="xs" variant="danger" appearance="ghost" onPress={() => setVoidFor(d.id)}>
                          Void
                        </Button>
                      )}
                      {!isArchived && (
                        <Button
                          size="xs"
                          variant="danger"
                          appearance="ghost"
                          onPress={async () => {
                            const ok = await confirm({ title: "Delete document", message: `Delete "${d.title}"?`, confirmLabel: "Delete", danger: true });
                            if (ok) docAction("delete document", () => apiFetch(`/documents/${d.id}`, { method: "DELETE" }), "Document deleted");
                          }}
                        >
                          Delete
                        </Button>
                      )}
                    </div>
                  </div>
                  {d.status === "void" && d.voidReason && <p className="text-xs text-text-tertiary">Voided: {d.voidReason}</p>}
                  {d.responses.length > 0 && (
                    <ul className="space-y-0.5 text-xs text-text-secondary">
                      {d.responses.map((r) => (
                        <li key={r.id}>
                          {r.user.name} {r.action} · {fmtDateTime(r.signedAt ?? r.createdAt)}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="px-5 pb-5">
          <PagerRow page={docsPage} totalPages={docsTotalPages} onPageChange={setDocsPage} />
        </div>
      </Panel>

      {/* Edit file */}
      <Modal
        open={!!editFile}
        onClose={() => setEditFile(null)}
        title="Edit file"
        footer={
          <>
            <Button appearance="outline" variant="primary" onPress={() => setEditFile(null)}>
              Cancel
            </Button>
            <ActionButton variant="primary" isDisabled={!editFilename.trim()} onPress={saveEditFile}>
              Save
            </ActionButton>
          </>
        }
      >
        <div className="space-y-4">
          <TextInput label="Name" value={editFilename} onChange={setEditFilename} />
          <TextInput label="Description" value={editDescription} onChange={setEditDescription} />
          {editFile?.type === "LINK" && <TextInput label="URL" type="url" value={editUrl} onChange={setEditUrl} />}
        </div>
      </Modal>

      {/* Void */}
      <Modal
        open={!!voidFor}
        onClose={() => setVoidFor(null)}
        title="Void document"
        description="The client will no longer be able to respond or sign."
        footer={
          <>
            <Button appearance="outline" variant="primary" onPress={() => setVoidFor(null)}>
              Cancel
            </Button>
            <ActionButton
              variant="danger"
              onPress={() => {
                const id = voidFor!;
                setVoidFor(null);
                docAction("void document", () => apiFetch(`/documents/${id}/void`, { method: "POST", body: JSON.stringify({ reason: voidReason.trim() || undefined }) }), "Document voided");
                setVoidReason("");
              }}
            >
              Void document
            </ActionButton>
          </>
        }
      >
        <TextInput label="Reason (optional)" value={voidReason} onChange={setVoidReason} />
      </Modal>

      {/* Versions */}
      {versionsFor && (
        <Modal
          open
          onClose={() => setVersionsFor(null)}
          title="Versions"
          description={versionsFor.title}
          footer={
            !isArchived && (
              <label className="cursor-pointer">
                <input
                  type="file"
                  className="sr-only"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    e.target.value = "";
                    if (!f) return;
                    const fd = new FormData();
                    fd.append("file", f);
                    docAction("upload version", () => apiFetch(`/documents/${versionsFor.id}/upload-version`, { method: "POST", body: fd }), "New version uploaded");
                    setVersionsFor(null);
                  }}
                />
                <span className="inline-flex h-9 items-center rounded-lg bg-button-primary-background px-3 text-sm font-medium text-white-100">Upload new version</span>
              </label>
            )
          }
        >
          <ul className="divide-y divide-card-border">
            {(versionsFor.versions ?? []).map((v) => (
              <li key={v.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span className="text-sm text-text-primary">
                  v{v.version} · {v.file.filename} <span className="text-text-tertiary">({formatBytes(v.file.sizeBytes)}) · {fmtDate(v.createdAt)}</span>
                </span>
                <span className="flex gap-1">
                  <Button size="xs" appearance="outline" variant="primary" onPress={() => downloadFile(v.file.id, v.file.filename).catch((e) => toast.error(e.message))}>
                    Download
                  </Button>
                  {!isArchived && v.version !== versionsFor.currentVersion && (
                    <Button
                      size="xs"
                      variant="ghost"
                      onPress={() => {
                        docAction("restore version", () => apiFetch(`/documents/${versionsFor.id}/restore-version/${v.id}`, { method: "POST" }), "Version restored");
                        setVersionsFor(null);
                      }}
                    >
                      Restore
                    </Button>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </Modal>
      )}

      {/* Audit trail */}
      {auditFor && (
        <Modal open onClose={() => setAuditFor(null)} title="Audit trail" description={auditFor.title}>
          {audit.length === 0 ? (
            <Empty>No events yet.</Empty>
          ) : (
            <ul className="divide-y divide-card-border">
              {audit.map((a) => (
                <li key={a.id} className="py-2 text-sm">
                  <span className="font-medium text-text-primary">{a.action.replace(/_/g, " ")}</span>
                  <span className="text-text-tertiary">
                    {" "}
                    · {fmtDateTime(a.createdAt)}
                    {a.user ? ` · ${a.user.name}` : ""}
                    {a.ipAddress ? ` · ${a.ipAddress}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Modal>
      )}

      {/* Signing links */}
      {linksFor && (
        <Modal open onClose={() => setLinksFor(null)} title="Signing links" description="Share a private link so someone can sign without an account.">
          <div className="space-y-4">
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <SelectInput
                  label="Client"
                  value={linkUserId}
                  onChange={setLinkUserId}
                  options={[{ value: "", label: "Anyone with the link" }, ...projectClients.map((c) => ({ value: c.userId, label: c.user.name }))]}
                />
              </div>
              <ActionButton
                variant="primary"
                onPress={async () => {
                  try {
                    await apiFetch(`/documents/${linksFor.id}/generate-access-token`, {
                      method: "POST",
                      body: JSON.stringify(linkUserId ? { userId: linkUserId } : {}),
                    });
                    await refreshLinks(linksFor.id);
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : "Failed to create link");
                  }
                }}
              >
                Create link
              </ActionButton>
            </div>
            {links.length === 0 ? (
              <Empty>No links yet.</Empty>
            ) : (
              <ul className="divide-y divide-card-border">
                {links.map((l) => {
                  const url = `${window.location.origin}/portal/sign/${l.token}`;
                  return (
                    <li key={l.id} className="space-y-1 py-2">
                      <p className="text-xs text-text-tertiary">
                        {l.user?.name ?? "Anyone"} · expires {fmtDate(l.expiresAt)}
                        {l.usedAt ? " · used" : ""}
                      </p>
                      <code className="block text-xs break-all text-text-primary">{url}</code>
                      <div className="flex gap-1">
                        <Button size="xs" appearance="outline" variant="primary" onPress={() => navigator.clipboard.writeText(url).then(() => toast.success("Link copied"))}>
                          Copy
                        </Button>
                        <Button
                          size="xs"
                          variant="danger"
                          appearance="ghost"
                          onPress={async () => {
                            await apiFetch(`/documents/${linksFor.id}/access-tokens/${l.id}`, { method: "DELETE" }).catch(() => {});
                            refreshLinks(linksFor.id);
                          }}
                        >
                          Revoke
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </Modal>
      )}

      {placerFor && (
        <SignatureFieldPlacer
          documentId={placerFor}
          onClose={() => setPlacerFor(null)}
          onSaved={() => {
            setPlacerFor(null);
            toast.success("Signature fields saved");
            loadDocuments();
          }}
        />
      )}
      {signFor && <SigningViewer documentId={signFor.id} onClose={() => setSignFor(null)} onSigned={loadDocuments} />}
      {dialog}
    </>
  );
}
