"use client";

import { ActionButton, Notice, Page, PageBody, PageHeader } from "@/components/app/kit";
import { Button } from "@/components/tailgrids/core/button";
import { Card } from "@/components/tailgrids/core/card";
import { apiFetch } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

interface ImportResult {
  created: number;
  skipped: { line: number; reason: string }[];
  problems: { line: number; reason: string }[];
  unknownHeaders: string[];
}

const MAX_BYTES = 90_000;

export default function ImportLeadsPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const input = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [csv, setCsv] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);

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
    if (busy || !csv) return;
    setBusy(true);
    setError("");
    try {
      const res = await apiFetch<ImportResult>("/client-records/import", { method: "POST", body: JSON.stringify({ csv }) });
      setResult(res);
      if (res.created > 0) await qc.invalidateQueries({ queryKey: ["api"] });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Page>
      <PageHeader
        title="Import leads from CSV"
        description="One lead per row, with the column names in the first row."
        actions={
          <Link href="/dashboard/leads" className="text-sm font-medium text-neutral-brand-color hover:underline">
            Back to leads
          </Link>
        }
      />
      <PageBody>
        <Card className="w-full p-6">
          <div className="space-y-4">
            <p className="text-sm text-text-secondary">
              Recognised columns: business name, contact, email, phone, WhatsApp, website, industry, location, service interested in,
              notes. Each lead needs a name and an email, phone or WhatsApp number. People already in your leads or clients (same email
              or website) are skipped.
            </p>
            <input
              ref={input}
              type="file"
              accept=".csv,text/csv"
              onChange={pick}
              aria-label="CSV file"
              className="block w-full text-sm text-text-secondary"
            />
            {error && <Notice status="error">{error}</Notice>}
            {result && (
              <div className="space-y-3">
                <Notice status={result.created > 0 ? "success" : "warning"}>
                  {result.created} {result.created === 1 ? "lead" : "leads"} imported.{" "}
                  {result.skipped.length > 0 && `${result.skipped.length} skipped as duplicates. `}
                  {result.problems.length > 0 && `${result.problems.length} could not be imported.`}
                </Notice>
                {result.skipped.length + result.problems.length > 0 && (
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
            <div className="flex flex-wrap justify-end gap-2 border-t border-card-border pt-4">
              <Button appearance="outline" variant="primary" onPress={() => router.push("/dashboard/leads")}>
                {result ? "Back to leads" : "Cancel"}
              </Button>
              {!result && (
                <ActionButton variant="primary" appearance="fill" loading={busy} isDisabled={!csv} onPress={run}>
                  {fileName ? `Import ${fileName}` : "Import"}
                </ActionButton>
              )}
            </div>
          </div>
        </Card>
      </PageBody>
    </Page>
  );
}
