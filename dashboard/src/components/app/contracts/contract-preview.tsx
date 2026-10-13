"use client";

import { StatusPill } from "@/components/app/kit";
import { type ContractContent, contractClauseTitle, orderedContractClauses, resolveContractLayout } from "@/shared";

function formatCents(cents: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currency || "USD" }).format((cents || 0) / 100);
}

/** Clause text where "- item" lines render as bullets and other lines as paragraphs. */
function ClauseBody({ text }: { text: string }) {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  return (
    <div className="space-y-1.5 text-text-secondary">
      {lines.map((line, i) =>
        /^[-•]\s+/.test(line) ? (
          <p key={i} className="flex gap-2">
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

function Section({ no, title, children }: { no?: number; title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="border-b border-card-border pb-2 text-base font-semibold text-text-primary">
        {no ? `${no}. ` : ""}
        {title}
      </h2>
      {children}
    </section>
  );
}

/** The contract as a document on screen. */
export function ContractPreview({
  content,
  status = "DRAFT",
  version = 1,
  orgName = "Organization",
}: {
  content: ContractContent;
  status?: string;
  version?: number;
  orgName?: string;
}) {
  const layout = resolveContractLayout(content);
  const terms = (content.terms ?? {}) as unknown as Record<string, unknown>;
  const clauses = orderedContractClauses(content)
    .filter((key) => terms[`${key}Enabled`] && terms[`${key}Text`])
    .map((key) => ({ title: contractClauseTitle(content, key), text: terms[`${key}Text`] as string }));

  // Sections are numbered in the order they appear, so hidden ones leave no gaps.
  const hasTimeline = layout.showTimeline && !!(content.agreement?.startDate || content.agreement?.endDate);
  let n = 0;
  const scopeNo = ++n;
  const paymentNo = layout.showPayment ? ++n : 0;
  const timelineNo = hasTimeline ? ++n : 0;
  const clauseNos = clauses.map(() => ++n);
  const signatureNo = ++n;

  const provider = content.parties?.provider;
  const client = content.parties?.client;

  return (
    <div className="w-full space-y-8 rounded-xl border-[0.5px] border-card-border bg-card-background p-6 text-sm leading-relaxed text-text-primary">
      <div className="flex flex-col justify-between gap-4 border-b border-card-border pb-6 sm:flex-row sm:items-start">
        <div>
          <p className="text-xs font-semibold tracking-wider text-text-tertiary uppercase">{orgName}</p>
          <p className="mt-1 text-xs tracking-wide text-text-tertiary uppercase">{layout.documentLabel}</p>
          <h1 className="mt-1 text-2xl font-semibold text-text-primary">{content.agreement?.title || "Project Contract"}</h1>
        </div>
        <div className="flex flex-col items-start gap-1 sm:items-end">
          <StatusPill status={status.toLowerCase()} label={status.toUpperCase()} />
          <p className="text-xs text-text-tertiary">Version {version}</p>
        </div>
      </div>

      <dl className="grid gap-4 rounded-lg bg-background-gray-secondary_alt p-4 sm:grid-cols-3">
        <div>
          <dt className="text-xs text-text-tertiary">Effective Date</dt>
          <dd>{content.agreement?.effectiveDate || "Upon Signing"}</dd>
        </div>
        <div>
          <dt className="text-xs text-text-tertiary">Project Start</dt>
          <dd>{content.agreement?.startDate || "TBD"}</dd>
        </div>
        <div>
          <dt className="text-xs text-text-tertiary">Project Completion</dt>
          <dd>{content.agreement?.endDate || "TBD"}</dd>
        </div>
      </dl>

      <Section title="Parties to Agreement">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-0.5">
            <span className="text-xs text-text-tertiary">Service Provider</span>
            <p className="font-medium">{provider?.name || orgName}</p>
            {provider?.company && <p>{provider.company}</p>}
            {provider?.email && <p>{provider.email}</p>}
            {provider?.address && <p>{provider.address}</p>}
          </div>
          <div className="space-y-0.5">
            <span className="text-xs text-text-tertiary">Client</span>
            <p className="font-medium">{client?.name || "Client"}</p>
            {client?.company && <p>{client.company}</p>}
            {client?.email && <p>{client.email}</p>}
            {client?.address && <p>{client.address}</p>}
          </div>
        </div>
      </Section>

      <Section no={scopeNo} title={layout.scopeHeading}>
        {content.scope?.projectDescription && <p className="text-text-secondary">{content.scope.projectDescription}</p>}
        {content.scope?.servicesIncluded && (
          <div>
            <span className="font-medium">Services Included:</span>
            <p className="text-text-secondary">{content.scope.servicesIncluded}</p>
          </div>
        )}
        {layout.showDeliverables && content.scope?.deliverables && content.scope.deliverables.length > 0 && (
          <div>
            <span className="font-medium">Key Deliverables:</span>
            <ul className="list-disc space-y-1 pl-5 text-text-secondary">
              {content.scope.deliverables.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>
        )}
        {content.scope?.techStack && (
          <p className="text-text-secondary">
            <span className="font-medium text-text-primary">Tech Stack:</span> {content.scope.techStack}
          </p>
        )}
        {content.scope?.outOfScope && (
          <div>
            <span className="font-medium">Out of Scope:</span>
            <p className="text-text-secondary">{content.scope.outOfScope}</p>
          </div>
        )}
      </Section>

      {layout.showPayment && (
        <Section no={paymentNo} title={layout.paymentHeading}>
          <p className="flex items-center justify-between">
            <span className="font-medium">Total</span>
            <span className="font-numeric text-lg font-semibold tabular-nums">
              {formatCents(content.payment?.totalAmountCents || 0, content.payment?.currency)}
            </span>
          </p>
          {content.payment?.schedule && content.payment.schedule.length > 0 && (
            <ul className="divide-y divide-card-border rounded-lg border border-card-border">
              {content.payment.schedule.map((item) => (
                <li key={item.id} className="flex justify-between gap-3 px-3 py-2">
                  <span>{item.milestoneName}</span>
                  <span className="font-numeric tabular-nums">{formatCents(item.amountCents, content.payment?.currency)}</span>
                </li>
              ))}
            </ul>
          )}
          {content.payment?.latePaymentTerms && (
            <p className="text-text-secondary">
              <span className="font-medium text-text-primary">Late Payment Terms:</span> {content.payment.latePaymentTerms}
            </p>
          )}
        </Section>
      )}

      {hasTimeline && (
        <Section no={timelineNo} title="Project Timeline">
          <div className="text-text-secondary">
            {content.agreement?.startDate && <p>Project start: {content.agreement.startDate}</p>}
            {content.agreement?.endDate && <p>Expected delivery: {content.agreement.endDate}</p>}
          </div>
          {content.agreement?.timelineNote && <p className="text-text-secondary">{content.agreement.timelineNote}</p>}
        </Section>
      )}

      {clauses.map((clause, index) => (
        <Section key={clause.title} no={clauseNos[index]} title={clause.title}>
          <ClauseBody text={clause.text} />
        </Section>
      ))}

      <Section no={signatureNo} title="Signatures">
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="border-t border-card-border pt-2">
            <p className="font-medium">{provider?.name || orgName}</p>
            <p className="text-xs text-text-tertiary">Service Provider Representative</p>
          </div>
          <div className="border-t border-card-border pt-2">
            <p className="font-medium">{client?.name || "Client Representative"}</p>
            <p className="text-xs text-text-tertiary">Authorized Client Representative</p>
          </div>
        </div>
      </Section>
    </div>
  );
}
