"use client";

import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Alert, Button, Modal, ModalBody, ModalFooter, ModalHeader } from "@/components/ui";

interface ImportResult {
  created: number;
  skipped: { line: number; reason: string }[];
  problems: { line: number; reason: string }[];
  unknownHeaders: string[];
}

const MAX_BYTES = 90_000;

export function ImportLeadsModal({ open, onClose, onImported }: { open: boolean; onClose: () => void; onImported: () => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [csv, setCsv] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);

  function reset() {
    setFileName("");
    setCsv("");
    setError("");
    setResult(null);
    if (input.current) input.current.value = "";
  }

  function close() {
    reset();
    onClose();
  }

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setError("");
    setResult(null);
    if (!file) return;
    if (file.size > MAX_BYTES) {
      setError("That file is too large. Import up to about 200 leads at a time.");
      setCsv("");
      setFileName("");
      return;
    }
    setFileName(file.name);
    setCsv(await file.text());
  }

  async function run() {
    setBusy(true);
    setError("");
    try {
      const res = await apiFetch<ImportResult>("/client-records/import", { method: "POST", body: JSON.stringify({ csv }) });
      setResult(res);
      if (res.created > 0) onImported();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={close} size="md">
      <ModalHeader title="Import leads from CSV" description="One lead per row, with the column names in the first row." />
      <ModalBody className="space-y-4">
        <p className="text-sm text-text-secondary">
          Recognised columns: business name, contact, email, phone, WhatsApp, website, industry, location, service interested in, notes. Each lead needs
          a name and an email, phone or WhatsApp number. People already in your leads or clients (same email or website) are skipped.
        </p>
        <input ref={input} type="file" accept=".csv,text/csv" onChange={pick} aria-label="CSV file" className="block w-full text-sm text-text-secondary" />
        {error && <Alert status="error">{error}</Alert>}
        {result && (
          <div className="space-y-3">
            <Alert status={result.created > 0 ? "success" : "warning"} title={`${result.created} ${result.created === 1 ? "lead" : "leads"} imported`}>
              {result.skipped.length > 0 && `${result.skipped.length} skipped as duplicates. `}
              {result.problems.length > 0 && `${result.problems.length} could not be imported.`}
            </Alert>
            {[...result.skipped.map((s) => ({ ...s, kind: "Skipped" })), ...result.problems.map((p) => ({ ...p, kind: "Problem" }))].length > 0 && (
              <ul className="max-h-48 space-y-1 overflow-y-auto rounded-md border border-card-border p-3 text-xs text-text-secondary">
                {result.skipped.map((s) => (
                  <li key={`s${s.line}`}>
                    Line {s.line}: {s.reason}
                  </li>
                ))}
                {result.problems.map((p) => (
                  <li key={`p${p.line}`}>
                    Line {p.line}: {p.reason}
                  </li>
                ))}
              </ul>
            )}
            {result.unknownHeaders.length > 0 && (
              <p className="text-xs text-text-tertiary">Ignored columns: {result.unknownHeaders.join(", ")}</p>
            )}
          </div>
        )}
      </ModalBody>
      <ModalFooter>
        <Button type="button" appearance="outline" onClick={close}>
          {result ? "Close" : "Cancel"}
        </Button>
        {!result && (
          <Button type="button" iconOnly={false} loading={busy} disabled={!csv} onClick={run}>
            <Upload />
            <span>{fileName ? `Import ${fileName}` : "Import"}</span>
          </Button>
        )}
      </ModalFooter>
    </Modal>
  );
}
