"use client";

import { useId, useState, type FormEvent } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/components/toast";
import {
  Alert,
  Button,
  buttonStyles,
  Checkbox,
  Field,
  FieldError,
  Input,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
} from "@/components/ui";

interface GenerateFromTimeModalProps {
  projectId: string;
  onClose: () => void;
  onCreated?: (invoiceId: string) => void;
}

interface GenerateInvoiceResponse {
  invoiceId: string;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function startOfMonthISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`;
}

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function GenerateFromTimeModal({
  projectId,
  onClose,
  onCreated,
}: GenerateFromTimeModalProps): React.ReactElement {
  const { success, error: showError } = useToast();
  const [from, setFrom] = useState<string>(() => startOfMonthISO());
  const [to, setTo] = useState<string>(() => todayISO());
  const [includeNonBillable, setIncludeNonBillable] = useState<boolean>(false);
  const [mergeEntries, setMergeEntries] = useState<boolean>(true);
  const [busy, setBusy] = useState<boolean>(false);
  const [noRateError, setNoRateError] = useState<boolean>(false);
  const fieldId = useId();

  async function submit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    if (from && to && to < from) {
      showError("End date must be on or after start date");
      return;
    }
    setBusy(true);
    setNoRateError(false);
    try {
      const body: {
        projectId: string;
        from?: string;
        to?: string;
        includeNonBillable: boolean;
        mergeEntries: boolean;
      } = {
        projectId,
        from: from || undefined,
        to: to || undefined,
        includeNonBillable,
        mergeEntries,
      };
      const res = await apiFetch<GenerateInvoiceResponse>(
        "/time-entries/generate-invoice",
        {
          method: "POST",
          body: JSON.stringify(body),
        },
      );
      success("Draft invoice created");
      onCreated?.(res.invoiceId);
      onClose();
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : "Failed to generate invoice";
      if (message.toLowerCase().includes("hourly rate")) {
        setNoRateError(true);
      } else {
        showError(message);
      }
    } finally {
      setBusy(false);
    }
  }

  const invalidRange = Boolean(from && to && to < from);

  return (
    <Modal open onClose={onClose} size="md">
      <form onSubmit={submit} className="flex flex-col">
        <ModalHeader
          className="pr-12"
          title="Generate invoice from time"
          description="Creates a draft invoice from this project's un-invoiced time entries. Defaults to month-to-date — clear both dates to include all un-invoiced entries."
        />

        <ModalBody className="space-y-4">
          {noRateError && (
            <Alert status="warning" title="No hourly rate is set anywhere yet.">
              <p>
                Add one in either place and then retry — entries created earlier will pick
                it up automatically.
              </p>
              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="primary"
                  appearance="outline"
                  size="sm"
                  onClick={() => {
                    onClose();
                    // Defer scroll until after the modal unmounts so the target
                    // is actually visible.
                    setTimeout(() => {
                      document
                        .getElementById("default-rate")
                        ?.scrollIntoView({ behavior: "smooth", block: "center" });
                    }, 50);
                  }}
                >
                  Set project rate
                </Button>
                <Link
                  href="/dashboard/clients"
                  onClick={onClose}
                  className={buttonStyles({
                    variant: "primary",
                    appearance: "ghost",
                    size: "sm",
                  })}
                >
                  Set member rate
                </Link>
              </div>
            </Alert>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="From" htmlFor={`${fieldId}-from`}>
              <Input
                id={`${fieldId}-from`}
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </Field>
            <Field label="To" htmlFor={`${fieldId}-to`}>
              <Input
                id={`${fieldId}-to`}
                type="date"
                value={to}
                min={from || undefined}
                invalid={invalidRange}
                onChange={(e) => setTo(e.target.value)}
              />
            </Field>
          </div>
          {invalidRange && <FieldError>End date must be on or after start date.</FieldError>}

          <div className="space-y-3 rounded-lg border-[0.5px] border-card-border bg-background-gray-primary p-4">
            <Checkbox
              id={`${fieldId}-non-billable`}
              checked={includeNonBillable}
              onChange={(e) => setIncludeNonBillable(e.target.checked)}
              label="Include non-billable entries"
            />
            <Checkbox
              id={`${fieldId}-merge`}
              checked={mergeEntries}
              onChange={(e) => setMergeEntries(e.target.checked)}
              label="Merge into a single line item"
              description="Combines all entries into one line per hourly rate."
            />
          </div>
        </ModalBody>

        <ModalFooter>
          <Button type="button" appearance="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy} loading={busy}>
            {busy ? "Generating…" : "Generate draft"}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
