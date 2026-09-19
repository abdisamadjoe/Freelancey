"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Check, Download, Calendar, Type, PenLine, ListChecks } from "lucide-react";
import { PdfViewer } from "./pdf-viewer";
import { SignaturePad } from "./signature-pad";
import { apiFetch } from "@/lib/api";
import { downloadFile } from "@/lib/download";
import { usePreviewMode } from "@/lib/preview-mode";
import { cn } from "@/lib/utils";
import {
  Alert,
  Badge,
  Button,
  Field,
  Input,
  LoadingState,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
} from "@/components/ui";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

interface SignatureField {
  id: string;
  pageNumber: number;
  x: number;
  y: number;
  width: number;
  height: number;
  type: string; // "signature" | "date" | "initials" | "text"
  label?: string;
  signerOrder: number;
  assignedTo?: string;
}

interface SigningInfo {
  documentId: string;
  requiresSignature: boolean;
  signatureFields: SignatureField[];
  signedFieldIds: string[];
  signedFileId: string | null;
  signingOrderEnabled?: boolean;
  status?: string;
}

interface SigningViewerProps {
  documentId: string;
  tokenMode?: string; // access token for public signing
  onClose: () => void;
  onSigned: () => void;
}

function dataURLtoBlob(dataUrl: string): Blob {
  const arr = dataUrl.split(",");
  const mime = arr[0].match(/:(.*?);/)![1];
  const bstr = atob(arr[1]);
  const u8arr = new Uint8Array(bstr.length);
  for (let i = 0; i < bstr.length; i++) u8arr[i] = bstr.charCodeAt(i);
  return new Blob([u8arr], { type: mime });
}

const fieldTypeIcons: Record<string, typeof PenLine> = {
  signature: PenLine,
  initials: PenLine,
  date: Calendar,
  text: Type,
  select: ListChecks,
};

const fieldTypeLabels: Record<string, string> = {
  signature: "Sign Here",
  initials: "Initial Here",
  date: "Date",
  text: "Enter Text",
  select: "Select",
};

export function SigningViewer({
  documentId,
  tokenMode,
  onClose,
  onSigned,
}: SigningViewerProps) {
  // When tokenMode is set, use public token-based endpoints
  const signingInfoUrl = tokenMode
    ? `/documents/sign-via-token/${tokenMode}/signing-info`
    : `/documents/${documentId}/signing-info`;
  const signUrl = tokenMode
    ? `/documents/sign-via-token/${tokenMode}/sign`
    : `/documents/${documentId}/sign`;
  const viewUrl = tokenMode
    ? `${API_URL}/api/documents/sign-via-token/${tokenMode}/view`
    : `${API_URL}/api/documents/${documentId}/view`;
  const [signingInfo, setSigningInfo] = useState<SigningInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeFieldId, setActiveFieldId] = useState<string | null>(null);
  const [activeFieldType, setActiveFieldType] = useState<string>("signature");
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [signatureMethod, setSignatureMethod] = useState<"draw" | "type">("draw");
  const [textValue, setTextValue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pdfVersion, setPdfVersion] = useState(0);
  const { preview } = usePreviewMode();

  const closeFieldCapture = useCallback(() => {
    setActiveFieldId(null);
    setActiveFieldType("signature");
    setSignatureDataUrl(null);
    setTextValue("");
  }, []);

  const handleSignatureChange = useCallback(
    (dataUrl: string | null, method: "draw" | "type") => {
      setSignatureDataUrl(dataUrl);
      setSignatureMethod(method);
    },
    [],
  );

  const fetchSigningInfo = useCallback(async () => {
    try {
      const info = await apiFetch<SigningInfo>(
        `${signingInfoUrl}`,
      );
      setSigningInfo(info);
    } catch (err) {
      console.error("Failed to fetch signing info:", err);
    } finally {
      setLoading(false);
    }
  }, [signingInfoUrl]);

  useEffect(() => {
    fetchSigningInfo();
  }, [fetchSigningInfo]);

  // Close on Escape (only if field modal is not open)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (activeFieldId) {
          closeFieldCapture();
        } else {
          handleClose();
        }
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [activeFieldId, closeFieldCapture]);

  const allSigned =
    signingInfo &&
    signingInfo.signatureFields.length > 0 &&
    signingInfo.signedFieldIds.length === signingInfo.signatureFields.length;

  const handleClose = () => {
    if (allSigned) onSigned();
    onClose();
  };

  const isFieldLocked = (field: SignatureField): boolean => {
    if (!signingInfo?.signingOrderEnabled || field.signerOrder === 0) return false;
    // Check if all prior-order fields are signed
    const priorFields = signingInfo.signatureFields.filter(
      (f) => f.signerOrder > 0 && f.signerOrder < field.signerOrder,
    );
    return priorFields.some((f) => !signingInfo.signedFieldIds.includes(f.id));
  };

  const handleFieldClick = (field: SignatureField) => {
    if (preview) return;
    if (signingInfo?.signedFieldIds.includes(field.id)) return;
    if (isFieldLocked(field)) return;

    setActiveFieldId(field.id);
    setActiveFieldType(field.type || "signature");

    // Auto-fill date fields
    if (field.type === "date") {
      setTextValue(
        new Date().toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
      );
    }
  };

  const handleApplyField = async () => {
    if (!activeFieldId) return;

    const field = signingInfo?.signatureFields.find((f) => f.id === activeFieldId);
    if (!field) return;

    setSubmitting(true);
    setError(null);
    try {
      const fieldType = field.type || "signature";

      if (fieldType === "date" || fieldType === "text") {
        // Text-based fields — send as JSON
        await apiFetch(`${signUrl}`, {
          method: "POST",
          body: (() => {
            const formData = new FormData();
            formData.append("method", "type");
            formData.append("fieldId", activeFieldId);
            formData.append("timezone", Intl.DateTimeFormat().resolvedOptions().timeZone);
            formData.append("textValue", textValue);
            return formData;
          })(),
        });
      } else {
        // Signature/initials — send with image
        if (!signatureDataUrl) return;
        const blob = dataURLtoBlob(signatureDataUrl);
        const formData = new FormData();
        formData.append("signature", blob, "signature.png");
        formData.append("method", signatureMethod);
        formData.append("fieldId", activeFieldId);
        formData.append("timezone", Intl.DateTimeFormat().resolvedOptions().timeZone);

        await apiFetch(`${signUrl}`, {
          method: "POST",
          body: formData,
        });
      }

      closeFieldCapture();
      setPdfVersion((v) => v + 1);

      const updatedInfo = await apiFetch<SigningInfo>(
        `${signingInfoUrl}`,
      );
      setSigningInfo(updatedInfo);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadSigned = async () => {
    if (!signingInfo?.signedFileId) return;
    try {
      await downloadFile(signingInfo.signedFileId, "signed-document.pdf");
    } catch (err) {
      console.error("Download failed:", err);
    }
  };

  // Cache-bust the PDF URL so PdfViewer re-fetches after each signature
  const pdfUrl = `${viewUrl}${pdfVersion ? `?v=${pdfVersion}` : ""}`;

  const activeField = signingInfo?.signatureFields.find((f) => f.id === activeFieldId);
  const isImageField = activeFieldType === "signature" || activeFieldType === "initials";
  const isTextBasedField = activeFieldType === "date" || activeFieldType === "text" || activeFieldType === "select";
  const selectOptions = activeFieldType === "select" && activeField?.label
    ? activeField.label.split(",").map((o) => o.trim()).filter(Boolean)
    : [];

  const fieldModalTitle =
    activeFieldType === "signature"
      ? "Add Your Signature"
      : activeFieldType === "initials"
        ? "Add Your Initials"
        : activeFieldType === "date"
          ? "Confirm Date"
          : activeFieldType === "text"
            ? activeField?.label || "Enter Text"
            : activeFieldType === "select"
              ? "Select an Option"
              : "";

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background-gray-secondary_alt_2">
      {/* Header — step context, progress and document actions */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b-[0.5px] border-card-border bg-card-background px-4 py-3.5 sm:px-6">
        <div className="min-w-0">
          <h2 className="text-base leading-6 font-semibold tracking-[-0.2px] text-text-primary">
            {allSigned ? "Document Signed" : "Sign Document"}
          </h2>
          <p className="mt-0.5 text-sm leading-5 text-text-tertiary">
            {allSigned
              ? "All fields have been completed."
              : "Click on the highlighted fields to complete them."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {signingInfo && !allSigned && (
            <Badge color="primary">
              {signingInfo.signedFieldIds.length} of{" "}
              {signingInfo.signatureFields.length} signed
            </Badge>
          )}
          {allSigned && signingInfo?.signedFileId && (
            <Button appearance="outline" size="sm" onClick={handleDownloadSigned}>
              <Download />
              Download Signed
            </Button>
          )}
          {allSigned ? (
            <Button onClick={handleClose}>Done</Button>
          ) : (
            <Button
              appearance="ghost"
              size="sm"
              iconOnly
              onClick={handleClose}
              aria-label="Close"
            >
              <X />
            </Button>
          )}
        </div>
      </div>

      {/* PDF area — neutral document surface on a muted well */}
      <div className="min-h-0 flex-1 overflow-auto bg-background-gray-primary p-4 sm:p-5">
        {loading ? (
          <LoadingState label="Loading document..." />
        ) : (
          <PdfViewer
            url={pdfUrl}
            overlay={
              allSigned
                ? undefined
                : (pageNumber) => (
                    <div className="absolute inset-0">
                      {signingInfo?.signatureFields
                        .filter((f) => f.pageNumber === pageNumber - 1)
                        .map((field) => {
                          const isSigned = signingInfo.signedFieldIds.includes(field.id);
                          const locked = isFieldLocked(field);
                          const fieldType = field.type || "signature";
                          const Icon = fieldTypeIcons[fieldType] || PenLine;
                          const label = fieldTypeLabels[fieldType] || "Sign Here";

                          return (
                            <div
                              key={field.id}
                              className={cn(
                                "absolute flex items-center justify-center rounded border-2 transition-colors",
                                isSigned
                                  ? "border-badge-success-icon-color bg-badge-success-background"
                                  : locked
                                    ? "cursor-not-allowed border-card-border bg-background-gray-secondary"
                                    : "cursor-pointer border-badge-warning-icon-color bg-badge-warning-background hover:border-badge-warning-text",
                              )}
                              style={{
                                left: `${field.x * 100}%`,
                                top: `${field.y * 100}%`,
                                width: `${field.width * 100}%`,
                                height: `${field.height * 100}%`,
                              }}
                              onClick={() => handleFieldClick(field)}
                            >
                              {isSigned ? (
                                <span className="flex items-center gap-1 text-xs font-medium text-badge-success-text">
                                  <Check className="size-3.5" /> Done
                                </span>
                              ) : locked ? (
                                <span className="text-xs font-medium text-text-tertiary">
                                  Waiting...
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 text-xs font-medium text-badge-warning-text">
                                  <Icon className="size-3" />
                                  {label}
                                </span>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  )
            }
          />
        )}
      </div>

      {/* Field capture modal */}
      <Modal
        open={!!activeFieldId}
        onClose={closeFieldCapture}
        size="sm"
        className="max-w-md"
      >
        <ModalHeader className="pr-14" title={fieldModalTitle} />
        <ModalBody className="space-y-4">
          {/* Signature/initials: show signature pad */}
          {isImageField && (
            <SignaturePad
              onSignatureChange={handleSignatureChange}
            />
          )}

          {/* Date field: show pre-filled date */}
          {activeFieldType === "date" && (
            <Field label="Date">
              <Input
                type="text"
                value={textValue}
                onChange={(e) => setTextValue(e.target.value)}
              />
            </Field>
          )}

          {/* Text field: show input */}
          {activeFieldType === "text" && (
            <Field label={activeField?.label || "Text"}>
              <Input
                type="text"
                value={textValue}
                onChange={(e) => setTextValue(e.target.value)}
                placeholder="Type here..."
                autoFocus
              />
            </Field>
          )}

          {/* Select field: show options */}
          {activeFieldType === "select" && selectOptions.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium text-input-label-text-color">
                Choose an option
              </span>
              <div className="flex flex-col gap-1.5">
                {selectOptions.map((option) => (
                  <label
                    key={option}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors",
                      textValue === option
                        ? "border-input-primary-focus-border bg-background-gray-primary"
                        : "border-card-border hover:bg-background-gray-primary",
                    )}
                  >
                    <input
                      type="radio"
                      name="select-option"
                      value={option}
                      checked={textValue === option}
                      onChange={() => setTextValue(option)}
                      className="accent-primary-500"
                    />
                    <span className="text-sm text-text-primary">{option}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
          {activeFieldType === "select" && selectOptions.length === 0 && (
            <p className="text-sm text-text-tertiary">
              No options configured for this field.
            </p>
          )}

          {error && <Alert status="error">{error}</Alert>}
        </ModalBody>
        <ModalFooter>
          <Button appearance="outline" onClick={closeFieldCapture}>
            Cancel
          </Button>
          <Button
            onClick={handleApplyField}
            disabled={
              !!preview ||
              submitting ||
              (isImageField && !signatureDataUrl) ||
              (isTextBasedField && !textValue.trim())
            }
            title={preview ? "Disabled in preview mode" : undefined}
          >
            {submitting ? "Applying..." : "Apply"}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
