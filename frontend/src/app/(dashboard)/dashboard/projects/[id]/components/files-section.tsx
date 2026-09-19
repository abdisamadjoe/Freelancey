"use client";

import { useEffect, useState, useCallback, useRef, Fragment, type ChangeEvent, type KeyboardEvent } from "react";
import { apiFetch } from "@/lib/api";
import { formatBytes, formatRelativeTime, cn } from "@/lib/utils";
import { useConfirm } from "@/components/confirm-modal";
import { useToast } from "@/components/toast";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardTitle,
  Checkbox,
  DataToolbar,
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuSeparator,
  EmptyState,
  Field,
  Input,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  NativeSelect,
  Pagination,
  StatusBadge,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRoot,
  TableRow,
  Textarea,
} from "@/components/ui";
import {
  Upload,
  Download,
  Trash2,
  FileX,
  ChevronDown,
  ChevronRight,
  PenTool,
  Send,
  Ban,
  Award,
  History,
  X,
  File as FileIcon,
  FilePlus,
  RotateCcw,
  Link2,
  Copy,
  XCircle,
  ExternalLink,
  LinkIcon,
  Plus,
  Pencil,
  MoreHorizontal,
} from "lucide-react";
import { track } from "@/lib/track";
import { downloadFile } from "@/lib/download";
import dynamic from "next/dynamic";

const SignatureFieldPlacer = dynamic(
  () => import("@/components/signature-field-placer").then((m) => m.SignatureFieldPlacer),
  { ssr: false },
);

const SigningViewer = dynamic(
  () => import("@/components/signing-viewer").then((m) => m.SigningViewer),
  { ssr: false },
);

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
  signatureMethod?: string;
  fieldId?: string;
  user: { id: string; name: string };
}

interface DocumentFile {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
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
  signedFile?: DocumentFile;
  file: DocumentFile;
  signatureFields?: { id: string }[];
  responses: DocumentResponse[];
  versions?: DocumentVersion[];
  currentVersion?: number;
  createdAt: string;
  sentAt?: string;
  expiresAt?: string;
  voidReason?: string;
  options?: string;
}

interface AuditEvent {
  id: string;
  action: string;
  createdAt: string;
  ipAddress?: string;
  user?: { id: string; name: string; email: string } | null;
}

interface PaginatedResponse<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

const typeLabels: Record<string, string> = {
  quote: "Quote",
  contract: "Contract",
  proposal: "Proposal",
  nda: "NDA",
  other: "Other",
};

/* Table head tokens, shared with the rest of the app. */
const HEAD_ROW = "bg-background-gray-secondary_alt";
const HEAD_CELL = "text-text-secondary";
/** Lets a `DropdownMenuItem` hold a title + description stack. */
const MENU_ITEM =
  "items-start py-2.5 [&>span:last-child]:min-w-0 [&>span:last-child]:whitespace-normal [&>span:last-child]:overflow-visible [&>span:last-child]:text-left";
const FILE_ACCEPT = ".pdf,.doc,.docx,.odt,.jpg,.jpeg,.png,.webp";

export function FilesSection({
  projectId,
  isArchived,
  files,
  onFileChange,
  projectClients: projectClientsProp = [],
  currentRole = null,
}: {
  projectId: string;
  isArchived: boolean;
  files: FileRecord[];
  onFileChange: () => void;
  projectClients?: { userId: string; user: { id: string; name: string; email: string } }[];
  currentRole?: string | null;
}) {
  const confirm = useConfirm();
  const { success, error: showError } = useToast();

  // Document state
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [docsPage, setDocsPage] = useState(1);
  const [docsTotalPages, setDocsTotalPages] = useState(1);
  const [expandedDocId, setExpandedDocId] = useState<string | null>(null);
  const [showDocUpload, setShowDocUpload] = useState(false);
  const [docUploading, setDocUploading] = useState(false);
  const [voidModalDocId, setVoidModalDocId] = useState<string | null>(null);
  const [voidReason, setVoidReason] = useState("");
  const [auditTrail, setAuditTrail] = useState<AuditEvent[]>([]);
  const [showAuditDocId, setShowAuditDocId] = useState<string | null>(null);
  const [signingDocId, setSigningDocId] = useState<string | null>(null);
  const [signingLinksDocId, setSigningLinksDocId] = useState<string | null>(null);
  const [signingLinks, setSigningLinks] = useState<{
    id: string;
    userId: string;
    user: { id: string; name: string; email: string } | null;
    expiresAt: string;
    usedAt?: string;
    revokedAt?: string;
    createdAt: string;
    isActive: boolean;
  }[]>([]);
  const [projectClients, setProjectClients] = useState<{ userId: string; user: { id: string; name: string; email: string } }[]>([]);
  const [newLinkToken, setNewLinkToken] = useState<string | null>(null);
  const [placerDocId, setPlacerDocId] = useState<string | null>(null);

  // Add Link modal state
  const [showAddLink, setShowAddLink] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkTitle, setLinkTitle] = useState("");
  const [linkDescription, setLinkDescription] = useState("");
  const [linkSaving, setLinkSaving] = useState(false);

  // Edit file modal state
  const [editFile, setEditFile] = useState<FileRecord | null>(null);
  const [editFilename, setEditFilename] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editUrl, setEditUrl] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  const canManageFiles = currentRole === "owner" || currentRole === "admin";

  /** Target of the shared "upload new version" file input. */
  const versionDocRef = useRef<DocumentRecord | null>(null);
  const versionInputRef = useRef<HTMLInputElement>(null);

  // Doc upload form
  const [docTitle, setDocTitle] = useState("");
  const [docType, setDocType] = useState("contract");
  const [docFile, setDocFile] = useState<File | null>(null);
  const [requiresSignature, setRequiresSignature] = useState(false);
  const [requiresApproval, setRequiresApproval] = useState(false);
  const [docQuestion, setDocQuestion] = useState("");
  const [docChoices, setDocChoices] = useState<string[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [expiresInDays, setExpiresInDays] = useState<number | "">("");
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderIntervalDays, setReminderIntervalDays] = useState(3);

  const loadDocuments = useCallback(async () => {
    try {
      const res = await apiFetch<PaginatedResponse<DocumentRecord>>(
        `/documents/project/${projectId}?page=${docsPage}&limit=20`,
      );
      setDocuments(res.data);
      setDocsTotalPages(res.meta.totalPages);
    } catch (err) {
      console.error(err);
    }
  }, [projectId, docsPage]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const isPdf = docFile?.type === "application/pdf";

  const handleFileSelect = (file: File | null) => {
    setDocFile(file);
    if (file && !docTitle.trim()) {
      setDocTitle(file.name.replace(/\.[^/.]+$/, ""));
    }
    if (file && file.type !== "application/pdf") {
      setRequiresSignature(false);
    }
  };

  const resetDocForm = () => {
    setDocTitle("");
    setDocType("contract");
    setDocFile(null);
    setRequiresSignature(false);
    setRequiresApproval(false);
    setDocQuestion("");
    setDocChoices([]);
    setShowAdvanced(false);
    setExpiresInDays("");
    setReminderEnabled(false);
    setReminderIntervalDays(3);
  };

  const handleFileDownload = async (fileId: string, filename: string) => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || ""}/api/files/${fileId}/download`,
        { credentials: "include" },
      );
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
    }
  };

  const handleFileDelete = async (fileId: string) => {
    const ok = await confirm({
      title: "Delete File",
      message: "Delete this file? This cannot be undone.",
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await apiFetch(`/files/${fileId}`, { method: "DELETE" });
      onFileChange();
      success("File deleted");
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to delete file");
    }
  };

  const resetLinkForm = () => {
    setLinkUrl("");
    setLinkTitle("");
    setLinkDescription("");
  };

  const openEditFile = (file: FileRecord): void => {
    setEditFile(file);
    setEditFilename(file.filename);
    setEditDescription(file.description ?? "");
    setEditUrl(file.url ?? "");
  };

  const closeEditFile = (): void => {
    setEditFile(null);
    setEditFilename("");
    setEditDescription("");
    setEditUrl("");
  };

  const handleEditFileSave = async (): Promise<void> => {
    if (!editFile) return;
    const nextFilename = editFilename.trim();
    if (!nextFilename) return;
    const body: { filename?: string; description?: string; url?: string } = {};
    if (nextFilename !== editFile.filename) {
      body.filename = nextFilename;
    }
    const nextDescription = editDescription.trim();
    const originalDescription = editFile.description ?? "";
    if (nextDescription !== originalDescription) {
      body.description = nextDescription;
    }
    if (editFile.type === "LINK") {
      const nextUrl = editUrl.trim();
      const originalUrl = editFile.url ?? "";
      if (nextUrl && nextUrl !== originalUrl) {
        body.url = nextUrl;
      }
    }
    if (Object.keys(body).length === 0) {
      closeEditFile();
      return;
    }
    setEditSaving(true);
    try {
      await apiFetch(`/files/${editFile.id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      closeEditFile();
      onFileChange();
      success("File updated");
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to update file");
    } finally {
      setEditSaving(false);
    }
  };

  const handleLinkSubmit = async () => {
    const url = linkUrl.trim();
    const title = linkTitle.trim();
    if (!url || !title) return;
    setLinkSaving(true);
    try {
      await apiFetch("/files/link", {
        method: "POST",
        body: JSON.stringify({
          projectId,
          url,
          title,
          description: linkDescription.trim() || undefined,
        }),
      });
      setShowAddLink(false);
      resetLinkForm();
      onFileChange();
      success("Link added");
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to add link");
    } finally {
      setLinkSaving(false);
    }
  };

  // --- Document handlers ---
  const handleDocUpload = async (andSend: boolean) => {
    if (!docFile || !docTitle.trim()) return;
    setDocUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", docFile);
      formData.append("projectId", projectId);
      formData.append("type", docType);
      formData.append("title", docTitle);
      if (requiresSignature) formData.append("requiresSignature", "true");
      if (requiresApproval) formData.append("requiresApproval", "true");
      const validChoices = docChoices.map((c) => c.trim()).filter(Boolean);
      if (validChoices.length > 0) {
        // Store as "question|choice1,choice2,choice3"
        const optionsStr = docQuestion.trim()
          ? `${docQuestion.trim()}|${validChoices.join(",")}`
          : validChoices.join(",");
        formData.append("options", optionsStr);
      }
      if (reminderEnabled) {
        formData.append("reminderEnabled", "true");
        formData.append("reminderIntervalDays", String(reminderIntervalDays));
      }
      const doc = await apiFetch<DocumentRecord>("/documents", {
        method: "POST",
        body: formData,
      });
      track("document_uploaded", { type: docType });
      if (andSend) {
        const sendBody: Record<string, unknown> = {};
        if (expiresInDays && typeof expiresInDays === "number") sendBody.expiresInDays = expiresInDays;
        await apiFetch(`/documents/${doc.id}/send`, { method: "POST", body: JSON.stringify(sendBody) });
      }
      setShowDocUpload(false);
      resetDocForm();
      loadDocuments();
      success(andSend ? "Document uploaded and sent" : "Document saved as draft");
      if (requiresSignature && isPdf) setPlacerDocId(doc.id);
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to upload document");
    } finally {
      setDocUploading(false);
    }
  };

  const handleDocSend = async (docId: string) => {
    const ok = await confirm({ title: "Send Document", message: "Send this document to project clients? They will be notified by email.", confirmLabel: "Send" });
    if (!ok) return;
    try {
      await apiFetch(`/documents/${docId}/send`, { method: "POST", body: JSON.stringify({}) });
      loadDocuments();
      success("Document sent to clients");
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to send document");
    }
  };

  const handleVoid = async () => {
    if (!voidModalDocId) return;
    try {
      await apiFetch(`/documents/${voidModalDocId}/void`, { method: "POST", body: JSON.stringify({ reason: voidReason.trim() || undefined }) });
      setVoidModalDocId(null);
      setVoidReason("");
      loadDocuments();
      success("Document voided");
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to void document");
    }
  };

  const handleDocDownload = async (fileId: string, filename: string) => {
    try { await downloadFile(fileId, filename); } catch (err) { console.error(err); }
  };

  const handleDocDelete = async (docId: string) => {
    const ok = await confirm({ title: "Delete Document", message: "Delete this document and all responses? This cannot be undone.", confirmLabel: "Delete", variant: "danger" });
    if (!ok) return;
    try {
      await apiFetch(`/documents/${docId}`, { method: "DELETE" });
      loadDocuments();
      success("Document deleted");
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to delete document");
    }
  };

  /** Uploads a new version for the document the menu item pointed at. */
  const handleVersionUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const doc = versionDocRef.current;
    const f = e.target.files?.[0];
    if (!doc || !f) return;
    try {
      const formData = new FormData();
      formData.append("file", f);
      await apiFetch(`/documents/${doc.id}/upload-version`, {
        method: "POST",
        body: formData,
      });
      loadDocuments();
      success(`Version ${(doc.currentVersion ?? 1) + 1} uploaded`);
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to upload version");
    }
    e.target.value = "";
  };

  const handleRestoreVersion = async (docId: string, version: DocumentVersion) => {
    try {
      await apiFetch(`/documents/${docId}/restore-version/${version.id}`, { method: "POST" });
      loadDocuments();
      success(`Restored to v${version.version}`);
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to restore version");
    }
  };

  const handleDownloadCertificate = async (docId: string) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/documents/${docId}/certificate`, { credentials: "include" });
      if (!response.ok) throw new Error("Failed");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `certificate-${docId.slice(0, 8)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to download certificate");
    }
  };

  const loadAuditTrail = async (docId: string) => {
    try {
      const res = await apiFetch<PaginatedResponse<AuditEvent>>(`/documents/${docId}/audit-trail?limit=50`);
      setAuditTrail(res.data);
      setShowAuditDocId(docId);
    } catch (err) { console.error(err); }
  };

  const openSigningLinks = async (docId: string) => {
    setSigningLinksDocId(docId);
    setNewLinkToken(null);
    setProjectClients(projectClientsProp);
    try {
      const tokens = await apiFetch<typeof signingLinks>(`/documents/${docId}/access-tokens`);
      setSigningLinks(tokens);
    } catch (err) {
      console.error(err);
    }
  };

  const generateSigningLink = async (docId: string, userId: string) => {
    try {
      const res = await apiFetch<{ token: string; expiresAt: string }>(`/documents/${docId}/generate-access-token`, {
        method: "POST",
        body: JSON.stringify({ userId }),
      });
      setNewLinkToken(res.token);
      // Refresh the list
      const tokens = await apiFetch<typeof signingLinks>(`/documents/${docId}/access-tokens`);
      setSigningLinks(tokens);
      success("Signing link created");
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to create signing link");
    }
  };

  const revokeSigningLink = async (docId: string, tokenId: string) => {
    try {
      await apiFetch(`/documents/${docId}/access-tokens/${tokenId}`, { method: "DELETE" });
      const tokens = await apiFetch<typeof signingLinks>(`/documents/${docId}/access-tokens`);
      setSigningLinks(tokens);
      success("Signing link revoked");
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to revoke link");
    }
  };

  const sortedFiles = [...files].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const closeVoidModal = () => {
    setVoidModalDocId(null);
    setVoidReason("");
  };

  const handleFileRowKeyDown = (
    e: KeyboardEvent<HTMLTableRowElement>,
    activate: () => void,
  ) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      activate();
    }
  };

  return (
    <div className="space-y-5">
      {/* Header with both upload actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base leading-6 font-semibold tracking-[-0.2px] text-text-primary">
          Files
        </h2>
        {!isArchived && (
          <DropdownMenu
            align="end"
            contentClassName="w-72"
            className="shrink-0"
            trigger={
              <Button type="button" aria-haspopup="menu">
                <Plus />
                Add
                <ChevronDown className="opacity-80" />
              </Button>
            }
          >
            <DropdownMenuItem
              icon={<Upload />}
              className={MENU_ITEM}
              onSelect={() => setShowDocUpload(true)}
            >
              <span className="block text-sm font-medium text-text-primary">Upload file</span>
              <span className="block text-xs text-text-tertiary">
                Upload a document from your device
              </span>
            </DropdownMenuItem>
            <DropdownMenuItem
              icon={<LinkIcon />}
              className={MENU_ITEM}
              onSelect={() => setShowAddLink(true)}
            >
              <span className="block text-sm font-medium text-text-primary">Add link</span>
              <span className="block text-xs text-text-tertiary">
                Link to an external resource (Nextcloud, Canva, etc.)
              </span>
            </DropdownMenuItem>
          </DropdownMenu>
        )}
      </div>

      {/* Documents list */}
      {documents.length > 0 && (
        <Card className="overflow-hidden p-0">
          <DataToolbar>
            <CardTitle>Documents</CardTitle>
            <span className="text-xs text-text-tertiary">
              {documents.length} document{documents.length === 1 ? "" : "s"}
            </span>
          </DataToolbar>

          <TableRoot>
            <TableHeader>
              <TableRow className={HEAD_ROW}>
                <TableHead className={cn(HEAD_CELL, "w-full")}>Document</TableHead>
                <TableHead className={HEAD_CELL}>Type</TableHead>
                <TableHead className={HEAD_CELL}>Status</TableHead>
                <TableHead className={cn(HEAD_CELL, "text-right")}>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.map((doc) => {
                const isExpanded = expandedDocId === doc.id;
                const isDraft = doc.status === "draft";
                const isVoidable = doc.status === "draft" || doc.status === "pending";
                const needsSigning = doc.requiresSignature && doc.signatureFields && doc.signatureFields.length > 0;
                const signedFieldIds = doc.responses.filter((r) => r.action === "signed" && r.fieldId).map((r) => r.fieldId);
                const hasUnsignedFields = needsSigning && !doc.signatureFields!.every((f) => signedFieldIds.includes(f.id));
                const downloadTarget = doc.signedFileId && doc.signedFile ? doc.signedFile : doc.file;
                // Only offer the disclosure when the panel actually has content to reveal.
                const hasDetail = Boolean(
                  (doc.status === "voided" && doc.voidReason) ||
                    doc.options ||
                    doc.responses.length > 0 ||
                    (doc.versions && doc.versions.length > 0),
                );

                return (
                  <Fragment key={doc.id}>
                    <TableRow className={cn(isExpanded && "bg-card-surface-area")}>
                      <TableCell className="min-w-0">
                        <button
                          type="button"
                          onClick={() => setExpandedDocId(isExpanded ? null : doc.id)}
                          aria-expanded={hasDetail ? isExpanded : undefined}
                          disabled={!hasDetail}
                          aria-label={hasDetail ? (isExpanded ? "Hide document details" : "Show document details") : "Document"}
                          className="flex w-full items-start gap-3 rounded-md text-left outline-none focus-visible:ring-4 focus-visible:ring-button-outline-focus-ring disabled:cursor-default"
                        >
                          {isExpanded ? (
                            <ChevronDown className="mt-0.5 size-4 shrink-0 text-icon-tertiary" aria-hidden />
                          ) : hasDetail ? (
                            <ChevronRight className="mt-0.5 size-4 shrink-0 text-icon-tertiary" aria-hidden />
                          ) : (
                            <FileIcon className="mt-0.5 size-4 shrink-0 text-icon-tertiary" aria-hidden />
                          )}
                          <span className="min-w-0">
                            <span className="flex flex-wrap items-center gap-1.5">
                              <span className="truncate text-sm font-medium text-text-primary">
                                {doc.title}
                              </span>
                              {(doc.currentVersion ?? 1) > 1 && (
                                <Badge color="gray">v{doc.currentVersion}</Badge>
                              )}
                            </span>
                            <span className="mt-0.5 block truncate text-xs text-text-tertiary">
                              {doc.file.filename} &middot; {formatBytes(doc.file.sizeBytes)}
                              {doc.expiresAt && (
                                <span> &middot; Expires {new Date(doc.expiresAt).toLocaleDateString()}</span>
                              )}
                            </span>
                          </span>
                        </button>
                      </TableCell>

                      <TableCell>
                        <Badge color="gray">{typeLabels[doc.type] || doc.type}</Badge>
                      </TableCell>

                      <TableCell>
                        <StatusBadge status={doc.status} />
                      </TableCell>

                      <TableCell>
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          {/* Primary actions */}
                          {isDraft && !isArchived && (
                            <Button type="button" size="sm" onClick={() => handleDocSend(doc.id)}>
                              <Send />
                              Send to Client
                            </Button>
                          )}
                          {hasUnsignedFields && !isArchived && doc.status !== "draft" && (
                            <Button type="button" size="sm" onClick={() => setSigningDocId(doc.id)}>
                              <PenTool />
                              Sign
                            </Button>
                          )}

                          {/* Secondary actions */}
                          <DropdownMenu
                            trigger={
                              <Button
                                type="button"
                                variant="ghost"
                                appearance="ghost"
                                size="sm"
                                iconOnly
                                aria-label="Document actions"
                                title="Document actions"
                              >
                                <MoreHorizontal />
                              </Button>
                            }
                            contentClassName="w-56"
                          >
                            <DropdownMenuItem
                              icon={<Download />}
                              onSelect={() => handleDocDownload(downloadTarget.id, downloadTarget.filename)}
                            >
                              Download
                            </DropdownMenuItem>
                            {doc.status === "signed" && (
                              <DropdownMenuItem
                                icon={<Award />}
                                onSelect={() => handleDownloadCertificate(doc.id)}
                              >
                                Download certificate
                              </DropdownMenuItem>
                            )}
                            {doc.requiresSignature && !isArchived && isDraft && (
                              <DropdownMenuItem
                                icon={<PenTool />}
                                onSelect={() => setPlacerDocId(doc.id)}
                              >
                                Edit signature fields
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem icon={<History />} onSelect={() => loadAuditTrail(doc.id)}>
                              Audit trail
                            </DropdownMenuItem>
                            {doc.requiresSignature && doc.status !== "draft" && (
                              <DropdownMenuItem
                                icon={<Link2 />}
                                onSelect={() => openSigningLinks(doc.id)}
                              >
                                Signing links
                              </DropdownMenuItem>
                            )}
                            {!isArchived && doc.status !== "voided" && doc.status !== "expired" && (
                              <DropdownMenuItem
                                icon={<FilePlus />}
                                onSelect={() => {
                                  versionDocRef.current = doc;
                                  versionInputRef.current?.click();
                                }}
                              >
                                Upload new version
                              </DropdownMenuItem>
                            )}
                            {!isArchived && <DropdownMenuSeparator />}
                            {isVoidable && !isArchived && (
                              <DropdownMenuItem
                                icon={<Ban />}
                                onSelect={() => { setVoidModalDocId(doc.id); setVoidReason(""); }}
                              >
                                Void document
                              </DropdownMenuItem>
                            )}
                            {!isArchived && (
                              <DropdownMenuItem
                                icon={<Trash2 />}
                                destructive
                                onSelect={() => handleDocDelete(doc.id)}
                              >
                                Delete document
                              </DropdownMenuItem>
                            )}
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>

                    {isExpanded && hasDetail && (
                      <TableRow className="bg-card-surface-area">
                        <TableCell colSpan={4} className="py-4 font-normal">
                          <div className="space-y-4">
                            {doc.status === "voided" && doc.voidReason && (
                              <Alert status="error">Void reason: {doc.voidReason}</Alert>
                            )}

                            {(() => {
                              const options = doc.options;
                              if (!options) return null;
                              const hasQuestion = options.includes("|");
                              const question = hasQuestion ? options.split("|")[0] : null;
                              const choices = (hasQuestion ? options.split("|")[1] : options).split(",");
                              return (
                                <div className="text-xs text-text-secondary">
                                  {question && (
                                    <p className="mb-0.5 font-medium text-text-primary">{question}</p>
                                  )}
                                  <p>Choices: {choices.join(" · ")}</p>
                                </div>
                              );
                            })()}

                            {doc.responses.length > 0 && (() => {
                              const byUser = new Map<string, DocumentResponse>();
                              for (const r of doc.responses) {
                                const existing = byUser.get(r.userId);
                                if (!existing || new Date(r.signedAt || r.createdAt) > new Date(existing.signedAt || existing.createdAt)) byUser.set(r.userId, r);
                              }
                              return (
                                <div>
                                  <p className="mb-2 text-xs font-medium text-text-secondary">Responses</p>
                                  <div className="space-y-1.5">
                                    {Array.from(byUser.values()).map((r) => (
                                      <div
                                        key={r.id}
                                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-background-gray-primary px-3 py-2 text-xs"
                                      >
                                        <span className="font-medium text-text-primary">{r.user.name}</span>
                                        <div className="flex items-center gap-2">
                                          <StatusBadge status={r.action} />
                                          <span className="text-text-tertiary">
                                            {r.signedAt ? new Date(r.signedAt).toLocaleDateString() : new Date(r.createdAt).toLocaleDateString()}
                                          </span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            })()}

                            {/* Version history */}
                            {doc.versions && doc.versions.length > 0 && (
                              <div>
                                <p className="mb-2 text-xs font-medium text-text-secondary">Version History</p>
                                <div className="space-y-1.5">
                                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border-[0.5px] border-card-border bg-card-background px-3 py-2 text-xs">
                                    <div>
                                      <span className="font-medium text-text-primary">v{doc.currentVersion}</span>
                                      <span className="ml-1.5 text-text-tertiary">(current)</span>
                                    </div>
                                    <span className="text-text-tertiary">{formatBytes(doc.file.sizeBytes)}</span>
                                  </div>
                                  {doc.versions.map((v) => (
                                    <div
                                      key={v.id}
                                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-background-gray-primary px-3 py-2 text-xs"
                                    >
                                      <div>
                                        <span className="font-medium text-text-primary">v{v.version}</span>
                                        <span className="ml-1.5 text-text-tertiary">
                                          {v.uploadedBy?.name || "Unknown"} &middot; {new Date(v.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })} {new Date(v.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-text-tertiary">{formatBytes(v.file.sizeBytes)}</span>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          appearance="ghost"
                                          size="xs"
                                          iconOnly
                                          title="Download this version"
                                          aria-label="Download this version"
                                          onClick={() => handleDocDownload(v.file.id, v.file.filename)}
                                        >
                                          <Download />
                                        </Button>
                                        {doc.status !== "voided" && doc.status !== "expired" && (
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            appearance="ghost"
                                            size="xs"
                                            iconOnly
                                            title="Restore this version"
                                            aria-label="Restore this version"
                                            onClick={() => handleRestoreVersion(doc.id, v)}
                                          >
                                            <RotateCcw />
                                          </Button>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })}
            </TableBody>
          </TableRoot>

          {docsTotalPages > 1 && (
            <div className="border-t border-card-border px-5 py-3.5">
              <Pagination page={docsPage} totalPages={docsTotalPages} onPageChange={setDocsPage} />
            </div>
          )}
        </Card>
      )}

      {/* Plain files list */}
      {sortedFiles.length > 0 ? (
        <Card className="overflow-hidden p-0">
          <DataToolbar>
            <CardTitle>Files &amp; links</CardTitle>
            <span className="text-xs text-text-tertiary">
              {sortedFiles.length} item{sortedFiles.length === 1 ? "" : "s"}
            </span>
          </DataToolbar>
          <TableRoot>
            <TableHeader>
              <TableRow className={HEAD_ROW}>
                <TableHead className={cn(HEAD_CELL, "w-full")}>Name</TableHead>
                <TableHead className={cn(HEAD_CELL, "text-right")}>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedFiles.map((file) => {
                const isLink = file.type === "LINK";
                let hostname = "";
                if (isLink && file.url) {
                  try { hostname = new URL(file.url).hostname; } catch { hostname = file.url; }
                }
                const handleCardClick = () => {
                  if (isLink && file.url) {
                    window.open(file.url, "_blank", "noopener,noreferrer");
                  } else {
                    handleFileDownload(file.id, file.filename);
                  }
                };
                return (
                  <TableRow
                    key={file.id}
                    role="button"
                    tabIndex={0}
                    onClick={handleCardClick}
                    onKeyDown={(e) => handleFileRowKeyDown(e, handleCardClick)}
                    data-testid={`file-row-${file.id}`}
                    className="cursor-pointer transition-colors hover:bg-background-gray-secondary_alt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-button-primary-focus-ring"
                  >
                    <TableCell className="font-normal">
                      <div className="flex min-w-0 items-start gap-2.5">
                        {isLink ? (
                          <LinkIcon className="mt-0.5 size-4 shrink-0 text-icon-tertiary" aria-hidden />
                        ) : (
                          <FileIcon className="mt-0.5 size-4 shrink-0 text-icon-tertiary" aria-hidden />
                        )}
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-text-primary">{file.filename}</p>
                          {isLink ? (
                            <p className="truncate text-xs text-text-tertiary">
                              {hostname} &middot; {formatRelativeTime(file.createdAt)}
                            </p>
                          ) : (
                            <p className="text-xs text-text-tertiary">
                              {formatBytes(file.sizeBytes ?? 0)} &middot; {formatRelativeTime(file.createdAt)}
                            </p>
                          )}
                          {isLink && file.description && (
                            <p className="mt-1 text-xs text-text-tertiary">{file.description}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div
                        className="flex items-center justify-end gap-1.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {isLink ? (
                          <ExternalLink className="size-3.5 text-icon-tertiary" aria-hidden />
                        ) : (
                          <Download className="size-3.5 text-icon-tertiary" aria-hidden />
                        )}
                        {!isArchived && canManageFiles && (
                          <Button
                            type="button"
                            variant="ghost"
                            appearance="ghost"
                            size="sm"
                            iconOnly
                            title="Edit"
                            aria-label="Edit file"
                            data-testid={`edit-file-${file.id}`}
                            onClick={(e) => { e.stopPropagation(); openEditFile(file); }}
                          >
                            <Pencil />
                          </Button>
                        )}
                        {!isArchived && (
                          <Button
                            type="button"
                            variant="danger"
                            appearance="ghost"
                            size="sm"
                            iconOnly
                            title="Delete"
                            aria-label="Delete file"
                            onClick={(e) => { e.stopPropagation(); handleFileDelete(file.id); }}
                          >
                            <Trash2 />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </TableRoot>
        </Card>
      ) : files.length === 0 && documents.length === 0 ? (
        <EmptyState
          icon={FileX}
          title="No files or documents yet."
          description="Upload a document or add a link to share it with your client."
        />
      ) : null}

      {/* Shared input that uploads a new version for the selected document */}
      <input
        ref={versionInputRef}
        type="file"
        className="hidden"
        accept={FILE_ACCEPT}
        onChange={handleVersionUpload}
        aria-hidden
        tabIndex={-1}
      />

      {/* Document Upload Modal */}
      <Modal open={showDocUpload} onClose={() => { setShowDocUpload(false); resetDocForm(); }} size="lg">
        <ModalHeader className="pr-12" title="Upload File" />
        <ModalBody className="space-y-4">
          <Field label="Title" htmlFor="doc-upload-title">
            <Input
              id="doc-upload-title"
              type="text"
              value={docTitle}
              onChange={(e) => setDocTitle(e.target.value)}
              placeholder="e.g., Project Contract v2"
            />
          </Field>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[140px_1fr]">
            <Field label="Type" htmlFor="doc-upload-type">
              <NativeSelect
                id="doc-upload-type"
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
              >
                <option value="contract">Contract</option>
                <option value="quote">Quote</option>
                <option value="proposal">Proposal</option>
                <option value="nda">NDA</option>
                <option value="other">Other</option>
              </NativeSelect>
            </Field>
            <Field label="File" htmlFor="doc-upload-file">
              {docFile ? (
                <div className="flex items-center gap-2.5 rounded-lg border border-card-border bg-input-background px-3.5 py-2.5">
                  <FileIcon className="size-4 shrink-0 text-icon-tertiary" aria-hidden />
                  <span className="min-w-0 flex-1 truncate text-sm text-text-primary">{docFile.name}</span>
                  <span className="shrink-0 text-xs text-text-tertiary">{formatBytes(docFile.size)}</span>
                  <Button
                    type="button"
                    variant="danger"
                    appearance="ghost"
                    size="xs"
                    iconOnly
                    title="Remove file"
                    aria-label="Remove file"
                    onClick={() => setDocFile(null)}
                  >
                    <X />
                  </Button>
                </div>
              ) : (
                <label
                  htmlFor="doc-upload-file"
                  className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-card-border bg-background-gray-primary px-3.5 py-2.5 text-sm text-text-secondary transition-colors hover:border-input-primary-focus-border hover:bg-background-gray-secondary_alt hover:text-neutral-brand-color focus-within:border-input-primary-focus-border focus-within:ring-4 focus-within:ring-input-primary-focus-border/20"
                >
                  <Upload className="size-4" aria-hidden />
                  Choose file
                  <input
                    id="doc-upload-file"
                    type="file"
                    accept={FILE_ACCEPT}
                    onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                </label>
              )}
            </Field>
          </div>

          {isPdf && (
            <Checkbox
              id="doc-upload-signature"
              checked={requiresSignature}
              onChange={(e) => {
                setRequiresSignature(e.target.checked);
                if (e.target.checked) setRequiresApproval(false);
              }}
              label="Collect signature"
            />
          )}

          <Button
            type="button"
            variant="ghost"
            appearance="ghost"
            size="sm"
            className="px-0"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            {showAdvanced ? <ChevronDown /> : <ChevronRight />}
            Advanced options
          </Button>

          {showAdvanced && (
            <div className="space-y-3.5 border-l-2 border-card-border pl-5">
              <Checkbox
                id="doc-upload-approval"
                checked={requiresApproval}
                onChange={(e) => {
                  setRequiresApproval(e.target.checked);
                  if (e.target.checked) setRequiresSignature(false);
                }}
                label="Requires client approval"
              />

              <div className="flex flex-wrap items-center gap-3">
                <Checkbox
                  id="doc-upload-expires"
                  checked={expiresInDays !== ""}
                  onChange={(e) => setExpiresInDays(e.target.checked ? 30 : "")}
                  label="Expires after"
                />
                {expiresInDays !== "" && (
                  <NativeSelect
                    aria-label="Expires after (days)"
                    className="w-32"
                    value={expiresInDays}
                    onChange={(e) => setExpiresInDays(parseInt(e.target.value))}
                  >
                    <option value="7">7 days</option>
                    <option value="14">14 days</option>
                    <option value="30">30 days</option>
                    <option value="60">60 days</option>
                    <option value="90">90 days</option>
                  </NativeSelect>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Checkbox
                  id="doc-upload-reminder"
                  checked={reminderEnabled}
                  onChange={(e) => setReminderEnabled(e.target.checked)}
                  label="Send reminder"
                />
                {reminderEnabled && (
                  <NativeSelect
                    aria-label="Reminder interval"
                    className="w-36"
                    value={reminderIntervalDays}
                    onChange={(e) => setReminderIntervalDays(parseInt(e.target.value))}
                  >
                    <option value="1">every 1 day</option>
                    <option value="2">every 2 days</option>
                    <option value="3">every 3 days</option>
                    <option value="5">every 5 days</option>
                    <option value="7">every 7 days</option>
                  </NativeSelect>
                )}
              </div>

              <div className="space-y-2">
                <Field label="Ask client a question (optional)" htmlFor="doc-upload-question">
                  <Input
                    id="doc-upload-question"
                    type="text"
                    value={docQuestion}
                    onChange={(e) => setDocQuestion(e.target.value)}
                    placeholder="e.g., Which option do you prefer?"
                  />
                </Field>
                {(docQuestion.trim() || docChoices.length > 0) && (
                  <div className="space-y-2">
                    {docChoices.map((choice, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="w-4 shrink-0 text-xs text-text-tertiary">{i + 1}.</span>
                        <Input
                          type="text"
                          value={choice}
                          onChange={(e) => {
                            const next = [...docChoices];
                            next[i] = e.target.value;
                            setDocChoices(next);
                          }}
                          placeholder={`Option ${i + 1}`}
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          variant="danger"
                          appearance="ghost"
                          size="xs"
                          iconOnly
                          className="shrink-0"
                          title="Remove option"
                          aria-label={`Remove option ${i + 1}`}
                          onClick={() => setDocChoices(docChoices.filter((_, j) => j !== i))}
                        >
                          <X />
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="primary"
                      appearance="ghost"
                      size="xs"
                      className="px-0"
                      onClick={() => setDocChoices([...docChoices, ""])}
                    >
                      + Add option
                    </Button>
                  </div>
                )}
                {!docQuestion.trim() && docChoices.length === 0 && (
                  <Button
                    type="button"
                    variant="primary"
                    appearance="ghost"
                    size="xs"
                    className="px-0"
                    onClick={() => setDocChoices(["", ""])}
                  >
                    + Add question with choices
                  </Button>
                )}
              </div>
            </div>
          )}
        </ModalBody>
        <ModalFooter className="flex-wrap">
          <p className="mr-auto text-xs text-text-tertiary">
            Sending notifies the client immediately.
          </p>
          <Button
            type="button"
            appearance="outline"
            onClick={() => { setShowDocUpload(false); resetDocForm(); }}
          >
            Cancel
          </Button>
          <Button
            type="button"
            appearance="outline"
            onClick={() => handleDocUpload(false)}
            disabled={docUploading || !docTitle.trim() || !docFile}
          >
            Save Draft
          </Button>
          <Button
            type="button"
            onClick={() => handleDocUpload(true)}
            disabled={docUploading || !docTitle.trim() || !docFile}
          >
            {docUploading ? "Uploading..." : "Upload & Send"}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Add Link Modal */}
      <Modal
        open={showAddLink}
        onClose={() => { setShowAddLink(false); resetLinkForm(); }}
        size="lg"
        className="max-w-2xl"
      >
        <ModalHeader
          className="pr-12"
          title="Add Link"
          description="Link to an external resource like a Nextcloud document, Canva design, or any other URL."
        />
        <ModalBody className="space-y-4">
          <Field label="URL" htmlFor="add-link-url">
            <Input
              id="add-link-url"
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://..."
            />
          </Field>
          <Field label="Title" htmlFor="add-link-title">
            <Input
              id="add-link-title"
              type="text"
              value={linkTitle}
              onChange={(e) => setLinkTitle(e.target.value)}
              placeholder="e.g., Design mockup (Canva)"
              maxLength={255}
            />
          </Field>
          <Field label="Description (optional)" htmlFor="add-link-description">
            <Textarea
              id="add-link-description"
              value={linkDescription}
              onChange={(e) => setLinkDescription(e.target.value)}
              placeholder="What is this link for?"
              rows={2}
              className="resize-none"
            />
          </Field>
        </ModalBody>
        <ModalFooter>
          <Button
            type="button"
            appearance="outline"
            onClick={() => { setShowAddLink(false); resetLinkForm(); }}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleLinkSubmit}
            disabled={linkSaving || !linkUrl.trim() || !linkTitle.trim()}
          >
            {linkSaving ? "Adding..." : "Add link"}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Edit File Modal */}
      <Modal open={Boolean(editFile)} onClose={closeEditFile} size="lg">
        <ModalHeader
          className="pr-12"
          title={editFile?.type === "LINK" ? "Edit Link" : "Edit File"}
        />
        <ModalBody className="space-y-4">
          {editFile?.type === "LINK" && (
            <Field label="URL" htmlFor="edit-file-url-field">
              <Input
                id="edit-file-url-field"
                type="url"
                value={editUrl}
                onChange={(e) => setEditUrl(e.target.value)}
                placeholder="https://..."
                data-testid="edit-file-url"
              />
            </Field>
          )}
          <Field
            label={editFile?.type === "LINK" ? "Title" : "Filename"}
            htmlFor="edit-file-name-field"
          >
            <Input
              id="edit-file-name-field"
              type="text"
              value={editFilename}
              onChange={(e) => setEditFilename(e.target.value)}
              maxLength={255}
              data-testid="edit-file-name"
            />
          </Field>
          <Field label="Description (optional)" htmlFor="edit-file-description-field">
            <Textarea
              id="edit-file-description-field"
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              placeholder="What is this for?"
              rows={2}
              className="resize-none"
              data-testid="edit-file-description"
            />
          </Field>
        </ModalBody>
        <ModalFooter>
          <Button type="button" appearance="outline" onClick={closeEditFile}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleEditFileSave}
            disabled={
              editSaving ||
              !editFilename.trim() ||
              (editFile?.type === "LINK" && !editUrl.trim())
            }
            data-testid="edit-file-save"
          >
            {editSaving ? "Saving..." : "Save"}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Void Modal */}
      <Modal open={Boolean(voidModalDocId)} onClose={closeVoidModal} size="md">
        <ModalHeader
          className="pr-12"
          title="Void Document"
          description="This will cancel the document. Clients will no longer be able to respond."
        />
        <ModalBody>
          <Field label="Reason (optional)" htmlFor="void-reason">
            <Textarea
              id="void-reason"
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              placeholder="Why are you voiding this document?"
              rows={3}
              className="resize-none"
            />
          </Field>
        </ModalBody>
        <ModalFooter>
          <Button type="button" appearance="outline" onClick={closeVoidModal}>
            Cancel
          </Button>
          <Button type="button" variant="danger" onClick={handleVoid}>
            Void Document
          </Button>
        </ModalFooter>
      </Modal>

      {/* Audit Trail Modal */}
      <Modal
        open={Boolean(showAuditDocId)}
        onClose={() => setShowAuditDocId(null)}
        size="lg"
      >
        <ModalHeader
          className="pr-12"
          title={
            <span className="flex items-center gap-2">
              <History className="size-4 text-icon-tertiary" aria-hidden />
              Audit Trail
            </span>
          }
        />
        <ModalBody className="space-y-2">
          {auditTrail.map((event) => (
            <div
              key={event.id}
              className="flex items-start gap-3 rounded-lg border-[0.5px] border-card-border bg-card-background px-3 py-2.5 text-sm"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-text-primary">{event.user?.name || "System"}</span>
                  <StatusBadge status={event.action} />
                </div>
                <div className="mt-0.5 text-xs text-text-tertiary">
                  {new Date(event.createdAt).toLocaleString()}
                  {event.ipAddress && ` · IP: ${event.ipAddress}`}
                </div>
              </div>
            </div>
          ))}
          {auditTrail.length === 0 && (
            <p className="py-4 text-center text-sm text-text-tertiary">No events recorded.</p>
          )}
        </ModalBody>
        <ModalFooter>
          <Button type="button" appearance="outline" onClick={() => setShowAuditDocId(null)}>
            Close
          </Button>
        </ModalFooter>
      </Modal>

      {/* Signing Links Modal */}
      {signingLinksDocId && (
      <Modal
        open
        onClose={() => setSigningLinksDocId(null)}
        size="lg"
      >
        <ModalHeader
          className="pr-12"
          title={
            <span className="flex items-center gap-2">
              <Link2 className="size-4 text-icon-tertiary" aria-hidden />
              Signing Links
            </span>
          }
        />
        <ModalBody className="space-y-4">
          {/* Generate new link */}
          <div className="space-y-2">
            <p className="text-sm text-text-secondary">
              Generate a direct signing link for a client. They can sign without logging into
              the portal.
            </p>
            {projectClients.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {projectClients.map((c) => {
                  const hasActiveLink = signingLinks.some((l) => l.userId === c.userId && l.isActive);
                  return (
                    <Button
                      key={c.userId}
                      type="button"
                      appearance="outline"
                      size="xs"
                      onClick={() => generateSigningLink(signingLinksDocId, c.userId)}
                      disabled={hasActiveLink}
                      title={hasActiveLink ? "Active link already exists" : `Generate link for ${c.user.name}`}
                    >
                      <Link2 />
                      {c.user.name}
                    </Button>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-text-tertiary">No clients assigned to this project.</p>
            )}
          </div>

          {/* Newly generated link — copy box */}
          {newLinkToken && (
            <Alert status="success" title="Link created! Copy and share with the client:">
              <div className="flex items-center gap-2">
                <Input
                  type="text"
                  readOnly
                  value={`${window.location.origin}/portal/sign/${newLinkToken}`}
                  className="flex-1 font-mono text-xs"
                  onFocus={(e) => e.target.select()}
                />
                <Button
                  type="button"
                  variant="success"
                  appearance="outline"
                  size="sm"
                  iconOnly
                  title="Copy link"
                  aria-label="Copy link"
                  className="shrink-0"
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/portal/sign/${newLinkToken}`);
                    success("Link copied!");
                  }}
                >
                  <Copy />
                </Button>
              </div>
            </Alert>
          )}

          {/* Active links */}
          {signingLinks.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-text-secondary">Active &amp; Past Links</p>
              {signingLinks.map((link) => (
                <div
                  key={link.id}
                  className={cn(
                    "flex flex-wrap items-center justify-between gap-2 rounded-lg border-[0.5px] border-card-border px-3 py-2 text-xs",
                    link.isActive ? "bg-card-background" : "bg-card-surface-area opacity-60",
                  )}
                >
                  <div className="min-w-0">
                    <span className="font-medium text-text-primary">{link.user?.name || "Unknown"}</span>
                    <span className="ml-1.5 text-text-tertiary">{link.user?.email}</span>
                    <div className="mt-0.5 text-[10px] text-text-tertiary">
                      Created {new Date(link.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })} {new Date(link.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                      {link.usedAt && " · Opened"}
                      {link.revokedAt && " · Revoked"}
                      {!link.isActive && !link.revokedAt && " · Expired"}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {link.isActive && <StatusBadge status="active" />}
                    {link.isActive && (
                      <Button
                        type="button"
                        variant="danger"
                        appearance="ghost"
                        size="xs"
                        iconOnly
                        title="Revoke link"
                        aria-label="Revoke link"
                        onClick={() => revokeSigningLink(signingLinksDocId, link.id)}
                      >
                        <XCircle />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button type="button" appearance="outline" onClick={() => setSigningLinksDocId(null)}>
            Close
          </Button>
        </ModalFooter>
      </Modal>
      )}

      {placerDocId && <SignatureFieldPlacer documentId={placerDocId} onClose={() => setPlacerDocId(null)} onSaved={() => { setPlacerDocId(null); loadDocuments(); success("Signature fields saved"); }} />}
      {signingDocId && <SigningViewer documentId={signingDocId} onClose={() => setSigningDocId(null)} onSigned={() => { setSigningDocId(null); loadDocuments(); }} />}
    </div>
  );
}
