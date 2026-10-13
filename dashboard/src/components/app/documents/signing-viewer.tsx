"use client";

import { PdfViewer } from "@/components/app/documents/pdf-viewer";
import { SignaturePad } from "@/components/app/documents/signature-pad";
import { ActionButton, Loading, Modal, Notice, SelectInput, TextInput } from "@/components/app/kit";
import { Button } from "@/components/tailgrids/core/button";
import { apiFetch } from "@/lib/api";
import { downloadFile } from "@/lib/download";
import { usePreviewMode } from "@/lib/preview-mode";
import { cn } from "@/utils/cn";
import { useCallback, useEffect, useState } from "react";

interface SignatureField {
  id: string;
  pageNumber: number;
  x: number;
  y: number;
  width: number;
  height: number;
  type: string;
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

function dataURLtoBlob(dataUrl: string): Blob {
  const arr = dataUrl.split(",");
  const mime = arr[0].match(/:(.*?);/)![1];
  const bstr = atob(arr[1]);
  const u8 = new Uint8Array(bstr.length);
  for (let i = 0; i < bstr.length; i++) u8[i] = bstr.charCodeAt(i);
  return new Blob([u8], { type: mime });
}

const TYPE_LABEL: Record<string, string> = {
  signature: "Sign Here",
  initials: "Initial Here",
  date: "Date",
  text: "Enter Text",
  select: "Select",
};

/** Fill in signature fields on a PDF. With `tokenMode` it uses the public signing endpoints. */
export function SigningViewer({
  documentId,
  tokenMode,
  onClose,
  onSigned,
}: {
  documentId: string;
  tokenMode?: string;
  onClose: () => void;
  onSigned: () => void;
}) {
  const infoPath = tokenMode ? `/documents/sign-via-token/${tokenMode}/signing-info` : `/documents/${documentId}/signing-info`;
  const signPath = tokenMode ? `/documents/sign-via-token/${tokenMode}/sign` : `/documents/${documentId}/sign`;
  const viewPath = tokenMode ? `/documents/sign-via-token/${tokenMode}/view` : `/documents/${documentId}/view`;

  const [info, setInfo] = useState<SigningInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [signatureMethod, setSignatureMethod] = useState<"draw" | "type">("draw");
  const [textValue, setTextValue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pdfVersion, setPdfVersion] = useState(0);
  const { preview } = usePreviewMode();

  const closeCapture = useCallback(() => {
    setActiveId(null);
    setSignatureDataUrl(null);
    setTextValue("");
  }, []);

  const fetchInfo = useCallback(async () => {
    try {
      setInfo(await apiFetch<SigningInfo>(infoPath));
    } catch {
      /* the empty state below explains it */
    } finally {
      setLoading(false);
    }
  }, [infoPath]);

  useEffect(() => {
    fetchInfo();
  }, [fetchInfo]);

  const allSigned = info && info.signatureFields.length > 0 && info.signedFieldIds.length === info.signatureFields.length;

  const locked = (field: SignatureField): boolean => {
    if (!info?.signingOrderEnabled || field.signerOrder === 0) return false;
    return info.signatureFields.some((f) => f.signerOrder > 0 && f.signerOrder < field.signerOrder && !info.signedFieldIds.includes(f.id));
  };

  const clickField = (field: SignatureField) => {
    if (preview || info?.signedFieldIds.includes(field.id) || locked(field)) return;
    setActiveId(field.id);
    if (field.type === "date") {
      setTextValue(new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }));
    }
  };

  const activeField = info?.signatureFields.find((f) => f.id === activeId);
  const activeType = activeField?.type || "signature";
  const isImageField = activeType === "signature" || activeType === "initials";
  const selectOptions = activeType === "select" && activeField?.label ? activeField.label.split(",").map((o) => o.trim()).filter(Boolean) : [];

  const apply = async () => {
    if (!activeId || !activeField) return;
    setSubmitting(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("fieldId", activeId);
      fd.append("timezone", Intl.DateTimeFormat().resolvedOptions().timeZone);
      if (!isImageField) {
        fd.append("method", "type");
        fd.append("textValue", textValue);
      } else {
        if (!signatureDataUrl) return;
        fd.append("signature", dataURLtoBlob(signatureDataUrl), "signature.png");
        fd.append("method", signatureMethod);
      }
      await apiFetch(signPath, { method: "POST", body: fd });
      closeCapture();
      setPdfVersion((v) => v + 1);
      setInfo(await apiFetch<SigningInfo>(infoPath));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  const close = () => {
    if (allSigned) onSigned();
    onClose();
  };

  return (
    <Modal
      open
      wide
      onClose={close}
      title="Sign document"
      description={
        info ? `${info.signedFieldIds.length} of ${info.signatureFields.length} fields completed` : undefined
      }
      footer={
        <>
          {allSigned && info?.signedFileId && (
            <Button appearance="outline" variant="primary" onPress={() => downloadFile(info.signedFileId!, "signed-document.pdf").catch(() => {})}>
              Download signed copy
            </Button>
          )}
          <Button variant="primary" onPress={close}>
            {allSigned ? "Done" : "Close"}
          </Button>
        </>
      }
    >
      {loading ? (
        <Loading />
      ) : !info || info.signatureFields.length === 0 ? (
        <Notice status="warning">This document has no fields to sign.</Notice>
      ) : (
        <div className="space-y-3">
          {preview && <Notice status="info">Preview mode: signing is disabled.</Notice>}
          {allSigned && <Notice status="success">All fields are complete. Thank you.</Notice>}
          <div className="max-h-[60vh] overflow-y-auto rounded-lg bg-background-gray-secondary_alt p-3">
            <PdfViewer
              key={pdfVersion}
              path={`${viewPath}${pdfVersion ? `?v=${pdfVersion}` : ""}`}
              isPublic={Boolean(tokenMode)}
              overlay={(pageNumber, dims) => (
                <div className="relative" style={{ width: dims.width, height: dims.height }}>
                  {info.signatureFields
                    .filter((f) => f.pageNumber === pageNumber - 1)
                    .map((f) => {
                      const done = info.signedFieldIds.includes(f.id);
                      const isLocked = locked(f);
                      return (
                        <button
                          key={f.id}
                          type="button"
                          disabled={done || isLocked || !!preview}
                          onClick={() => clickField(f)}
                          className={cn(
                            "absolute flex items-center justify-center rounded border text-[10px] font-medium",
                            done
                              ? "border-badge-success-icon-color bg-badge-success-background text-badge-success-text"
                              : isLocked
                                ? "border-card-border bg-badge-neutral-background text-badge-neutral-text opacity-60"
                                : "border-badge-warning-icon-color bg-badge-warning-background text-badge-warning-text hover:opacity-80",
                          )}
                          style={{ left: f.x * dims.width, top: f.y * dims.height, width: f.width * dims.width, height: f.height * dims.height }}
                        >
                          {done ? "Signed" : isLocked ? "Waiting" : TYPE_LABEL[f.type] || "Sign Here"}
                        </button>
                      );
                    })}
                </div>
              )}
            />
          </div>
        </div>
      )}

      <Modal
        open={!!activeId}
        onClose={closeCapture}
        title={TYPE_LABEL[activeType] ?? "Sign"}
        footer={
          <>
            <Button appearance="outline" variant="primary" onPress={closeCapture}>
              Cancel
            </Button>
            <ActionButton
              variant="primary"
              loading={submitting}
              isDisabled={isImageField ? !signatureDataUrl : !textValue.trim()}
              onPress={apply}
            >
              Apply
            </ActionButton>
          </>
        }
      >
        <div className="space-y-4">
          {error && <Notice status="error">{error}</Notice>}
          {isImageField ? (
            <SignaturePad
              onSignatureChange={(url, method) => {
                setSignatureDataUrl(url);
                setSignatureMethod(method);
              }}
            />
          ) : activeType === "select" ? (
            <SelectInput label="Choose one" value={textValue} onChange={setTextValue} options={selectOptions.map((o) => ({ value: o, label: o }))} />
          ) : (
            <TextInput label={activeField?.label || (activeType === "date" ? "Date" : "Your answer")} value={textValue} onChange={setTextValue} />
          )}
        </div>
      </Modal>
    </Modal>
  );
}

