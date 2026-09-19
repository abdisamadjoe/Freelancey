"use client";

import { ContractContent, contractClauseTitle, orderedContractClauses, resolveContractLayout } from "@/shared";
import { StatusBadge } from "@/components/ui";
import { User, ShieldCheck, DollarSign, Scale, CalendarDays } from "lucide-react";

interface ContractPreviewProps {
  content: ContractContent;
  status?: string;
  version?: number;
  brandingColor?: string;
  orgName?: string;
}

export function ContractPreview({
  content,
  status = "DRAFT",
  version = 1,
  brandingColor = "#2563eb",
  orgName = "Organization",
}: ContractPreviewProps) {
  const formatCents = (cents: number, currency = "USD") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
    }).format((cents || 0) / 100);
  };

  const layout = resolveContractLayout(content);
  const terms = (content.terms ?? {}) as unknown as Record<string, unknown>;
  const clauses = orderedContractClauses(content)
    .filter((key) => terms[`${key}Enabled`] && terms[`${key}Text`])
    .map((key) => ({
      title: contractClauseTitle(content, key),
      text: terms[`${key}Text`] as string,
    }));

  // Sections are numbered in the order they appear, so hidden ones leave no gaps.
  const hasTimeline = layout.showTimeline && !!(content.agreement?.startDate || content.agreement?.endDate);
  let sectionNo = 0;
  const scopeNo = ++sectionNo;
  const paymentNo = layout.showPayment ? ++sectionNo : 0;
  const timelineNo = hasTimeline ? ++sectionNo : 0;
  const clauseNos = clauses.map(() => ++sectionNo);
  const signatureNo = ++sectionNo;

  return (
    <div className="w-full space-y-8 rounded-xl border-[0.5px] border-card-border bg-card-background p-6 font-sans text-sm leading-relaxed text-text-primary select-text sm:p-10">
      {/* Document Header */}
      <div className="flex flex-col justify-between gap-4 border-b border-card-border pb-6 sm:flex-row sm:items-start">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <span
              className="inline-block size-3 rounded-full"
              style={{ backgroundColor: brandingColor }}
            />
            <span className="text-xs font-semibold tracking-wider text-text-tertiary uppercase">
              {orgName}
            </span>
          </div>
          <p className="mb-1 text-[11px] font-semibold tracking-wider text-text-tertiary uppercase">
            {layout.documentLabel}
          </p>
          <h1 className="text-2xl leading-8 font-semibold tracking-[-0.4px] text-text-primary">
            {content.agreement?.title || "Project Contract"}
          </h1>
        </div>
        <div className="shrink-0 sm:text-right">
          <StatusBadge status={status} label={status.toUpperCase()} className="mb-1" />
          <p className="text-xs text-text-tertiary">Version {version}</p>
        </div>
      </div>

      {/* Meta info box */}
      <div className="grid grid-cols-2 gap-4 rounded-lg border-[0.5px] border-card-border bg-background-gray-secondary p-4 text-xs sm:grid-cols-3">
        <div>
          <span className="mb-0.5 block font-medium text-text-tertiary">Effective Date</span>
          <span className="font-semibold">{content.agreement?.effectiveDate || "Upon Signing"}</span>
        </div>
        <div>
          <span className="mb-0.5 block font-medium text-text-tertiary">Project Start</span>
          <span className="font-semibold">{content.agreement?.startDate || "TBD"}</span>
        </div>
        <div>
          <span className="mb-0.5 block font-medium text-text-tertiary">Project Completion</span>
          <span className="font-semibold">{content.agreement?.endDate || "TBD"}</span>
        </div>
      </div>

      {/* Parties */}
      <div className="space-y-3">
        <h2 className="flex items-center gap-1.5 text-xs font-semibold tracking-wider text-text-tertiary uppercase">
          <User className="size-3.5" aria-hidden />
          Parties to Agreement
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-1 rounded-lg border-[0.5px] border-card-border p-4">
            <span className="text-[10px] font-semibold tracking-wider text-neutral-brand-color uppercase">Service Provider</span>
            <p className="font-semibold text-text-primary">{content.parties?.provider?.name || orgName}</p>
            {content.parties?.provider?.company && <p className="text-xs text-text-tertiary">{content.parties.provider.company}</p>}
            {content.parties?.provider?.email && <p className="text-xs text-text-tertiary">{content.parties.provider.email}</p>}
            {content.parties?.provider?.address && <p className="text-xs text-text-tertiary">{content.parties.provider.address}</p>}
          </div>
          <div className="space-y-1 rounded-lg border-[0.5px] border-card-border p-4">
            <span className="text-[10px] font-semibold tracking-wider text-text-secondary uppercase">Client</span>
            <p className="font-semibold text-text-primary">{content.parties?.client?.name || "Client"}</p>
            {content.parties?.client?.company && <p className="text-xs text-text-tertiary">{content.parties.client.company}</p>}
            {content.parties?.client?.email && <p className="text-xs text-text-tertiary">{content.parties.client.email}</p>}
            {content.parties?.client?.address && <p className="text-xs text-text-tertiary">{content.parties.client.address}</p>}
          </div>
        </div>
      </div>

      {/* Scope of Services */}
      <div className="space-y-3 pt-2">
        <h2 className="flex items-center gap-1.5 text-xs font-semibold tracking-wider text-text-tertiary uppercase">
          <ShieldCheck className="size-3.5" aria-hidden />
          {scopeNo}. {layout.scopeHeading}
        </h2>
        {content.scope?.projectDescription && (
          <p className="leading-relaxed text-text-secondary">{content.scope.projectDescription}</p>
        )}

        {content.scope?.servicesIncluded && (
          <div className="space-y-1 pt-1">
            <span className="text-xs font-medium text-text-primary">Services Included:</span>
            <p className="text-xs text-text-secondary">{content.scope.servicesIncluded}</p>
          </div>
        )}

        {layout.showDeliverables && content.scope?.deliverables && content.scope.deliverables.length > 0 && (
          <div className="space-y-1.5 pt-1">
            <span className="text-xs font-medium text-text-primary">Key Deliverables:</span>
            <ul className="list-inside list-disc space-y-1 pl-1 text-xs text-text-secondary">
              {content.scope.deliverables.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>
        )}

        {content.scope?.techStack && (
          <p className="pt-1 text-xs text-text-secondary">
            <span className="font-semibold text-neutral-brand-color">Tech Stack:</span> {content.scope.techStack}
          </p>
        )}

        {content.scope?.outOfScope && (
          <div className="space-y-1 pt-1">
            <span className="text-xs font-medium text-text-primary">Out of Scope:</span>
            <p className="text-xs text-text-tertiary italic">{content.scope.outOfScope}</p>
          </div>
        )}
      </div>

      {/* Compensation & Payment */}
      {layout.showPayment && (
        <div className="space-y-3 pt-2">
          <h2 className="flex items-center gap-1.5 text-xs font-semibold tracking-wider text-text-tertiary uppercase">
            <DollarSign className="size-3.5" aria-hidden />
            {paymentNo}. {layout.paymentHeading}
          </h2>
          <div className="flex items-center justify-between rounded-lg border-[0.5px] border-card-border bg-background-gray-secondary p-3">
            <span className="text-xs font-semibold">Total</span>
            <span className="text-base font-semibold text-success-500">
              {formatCents(content.payment?.totalAmountCents || 0, content.payment?.currency)}
            </span>
          </div>

          {content.payment?.schedule && content.payment.schedule.length > 0 && (
            <div className="overflow-hidden rounded-lg border-[0.5px] border-card-border text-xs">
              <div className="grid grid-cols-2 border-b border-card-border bg-background-gray-secondary_alt p-2.5 font-semibold">
                <span>Milestone Description</span>
                <span className="text-right">Amount</span>
              </div>
              <div className="divide-y divide-border-primary">
                {content.payment.schedule.map((item) => (
                  <div key={item.id} className="grid grid-cols-2 p-2.5">
                    <span>{item.milestoneName}</span>
                    <span className="text-right font-medium">{formatCents(item.amountCents, content.payment?.currency)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {content.payment?.latePaymentTerms && (
            <p className="text-xs text-text-tertiary">
              <span className="font-medium">Late Payment Terms:</span> {content.payment.latePaymentTerms}
            </p>
          )}
        </div>
      )}

      {/* Project timeline */}
      {hasTimeline && (
        <div className="space-y-3 pt-2">
          <h2 className="flex items-center gap-1.5 text-xs font-semibold tracking-wider text-text-tertiary uppercase">
            <CalendarDays className="size-3.5" aria-hidden />
            {timelineNo}. Project Timeline
          </h2>
          <div className="space-y-1 text-xs text-text-secondary">
            {content.agreement?.startDate && <p>Project start: {content.agreement.startDate}</p>}
            {content.agreement?.endDate && <p>Expected delivery: {content.agreement.endDate}</p>}
          </div>
          {content.agreement?.timelineNote && (
            <p className="text-xs text-text-secondary">{content.agreement.timelineNote}</p>
          )}
        </div>
      )}

      {/* Clauses, each its own numbered section */}
      {clauses.map((clause, index) => (
        <div key={clause.title} className="space-y-3 pt-2">
          <h2 className="flex items-center gap-1.5 text-xs font-semibold tracking-wider text-text-tertiary uppercase">
            <Scale className="size-3.5" aria-hidden />
            {clauseNos[index]}. {clause.title}
          </h2>
          <ClauseBody text={clause.text} />
        </div>
      ))}

      {/* Signature Section */}
      <div className="space-y-4 border-t border-card-border pt-6">
        <h2 className="text-xs font-semibold tracking-wider text-text-tertiary uppercase">
          {signatureNo}. Signatures
        </h2>
        <div className="grid grid-cols-1 gap-8 pt-4 md:grid-cols-2">
          <div className="space-y-6">
            <div className="flex h-12 items-end border-b border-border-color-base-300 pb-1">
              <span className="text-xs text-text-tertiary italic">Signature Placeholder</span>
            </div>
            <div>
              <p className="text-xs font-semibold">{content.parties?.provider?.name || orgName}</p>
              <p className="text-[11px] text-text-tertiary">Service Provider Representative</p>
            </div>
          </div>
          <div className="space-y-6">
            <div className="flex h-12 items-end border-b border-border-color-base-300 pb-1">
              <span className="text-xs text-text-tertiary italic">Signature Placeholder</span>
            </div>
            <div>
              <p className="text-xs font-semibold">{content.parties?.client?.name || "Client Representative"}</p>
              <p className="text-[11px] text-text-tertiary">Authorized Client Representative</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Clause text where "- item" lines render as bullets and other lines as paragraphs. */
function ClauseBody({ text }: { text: string }) {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  return (
    <div className="space-y-1.5 text-xs leading-relaxed text-text-secondary">
      {lines.map((line, i) =>
        /^[-•]\s+/.test(line) ? (
          <p key={i} className="flex gap-2 pl-1">
            <span aria-hidden>•</span>
            <span>{line.replace(/^[-•]\s+/, "")}</span>
          </p>
        ) : (
          <p key={i}>{line}</p>
        ),
      )}
    </div>
  );
}
