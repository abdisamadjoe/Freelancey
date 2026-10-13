"use client";

import { ActionButton, AppTabs, CheckInput, FormGrid, Modal, Notice, TextAreaInput, TextInput } from "@/components/app/kit";
import { Button } from "@/components/tailgrids/core/button";
import { apiFetch } from "@/lib/api";
import {
  CONTRACT_CLAUSES,
  CONTRACT_TEMPLATES,
  type ContractContent,
  type ContractTemplateId,
  contractClauseTitle,
  orderedContractClauses,
} from "@/shared";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface ContractRecord {
  id: string;
  projectId?: string | null;
  title: string;
  template: string;
  status: string;
  content: ContractContent;
  version: number;
}

type Terms = Record<string, unknown>;

export function ContractBuilderModal({
  projectId,
  initialContract,
  isOpen,
  onClose,
  onSuccess,
}: {
  /** Not needed when editing an existing contract (for example one written from a proposal). */
  projectId?: string;
  initialContract?: ContractRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [step, setStep] = useState<1 | 2>(initialContract ? 2 : 1);
  const [saving, setSaving] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ContractTemplateId>((initialContract?.template as ContractTemplateId) || "website-design");
  const [title, setTitle] = useState(initialContract?.title || "");
  const [content, setContent] = useState<ContractContent | null>(initialContract?.content || null);
  // The server drafts the contract (parties, dates and fee filled in) the first time a template is chosen.
  const [draftId, setDraftId] = useState<string | null>(initialContract?.id ?? null);

  useEffect(() => {
    if (isOpen && step === 2 && !content && !initialContract) {
      apiFetch<ContractRecord>(`/projects/${projectId}/contracts`, {
        method: "POST",
        body: JSON.stringify({
          title: CONTRACT_TEMPLATES.find((t) => t.id === selectedTemplate)?.name || "Contract Agreement",
          template: selectedTemplate,
        }),
      })
        .then((created) => {
          setDraftId(created.id);
          setTitle(created.title);
          setContent(created.content);
        })
        .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load contract template"));
    }
  }, [isOpen, step, selectedTemplate, projectId, initialContract, content]);

  if (!isOpen) return null;

  const update = (path: string, value: unknown) => {
    if (!content) return;
    const parts = path.split(".");
    const next = JSON.parse(JSON.stringify(content));
    let curr = next;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!curr[parts[i]]) curr[parts[i]] = {};
      curr = curr[parts[i]];
    }
    curr[parts[parts.length - 1]] = value;
    setContent(next);
  };

  // Keeps the payment schedule proportional when the total changes, so the
  // percentages printed in the PDF stay right. The last item absorbs rounding.
  const updateTotalFee = (newTotal: number) => {
    if (!content) return;
    const oldTotal = content.payment?.totalAmountCents || 0;
    const schedule = content.payment?.schedule ?? [];
    const next = JSON.parse(JSON.stringify(content)) as ContractContent;
    next.payment.totalAmountCents = newTotal;
    if (oldTotal > 0 && schedule.length > 0) {
      let allocated = 0;
      next.payment.schedule = schedule.map((item, i) => {
        const amount = i === schedule.length - 1 ? newTotal - allocated : Math.round((item.amountCents / oldTotal) * newTotal);
        allocated += amount;
        return { ...item, amountCents: amount };
      });
    }
    setContent(next);
  };

  const save = async () => {
    if (!content || !draftId) return;
    setSaving(true);
    try {
      await apiFetch(`/contracts/${draftId}`, { method: "PATCH", body: JSON.stringify({ title, template: selectedTemplate, content }) });
      toast.success(initialContract ? "Contract draft updated" : "Contract draft saved");
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save contract");
    } finally {
      setSaving(false);
    }
  };

  const terms = (content?.terms ?? {}) as unknown as Terms;
  const clauseKeys = content ? orderedContractClauses(content) : CONTRACT_CLAUSES.map((c) => c.key);

  return (
    <Modal
      open
      wide
      onClose={onClose}
      title={initialContract ? "Edit Contract Agreement" : "Create Project Contract"}
      description={`Step ${step} of 2`}
      footer={
        step === 1 ? (
          <Button appearance="outline" variant="primary" onPress={onClose}>
            Cancel
          </Button>
        ) : (
          <>
            {!initialContract && (
              <Button appearance="outline" variant="primary" onPress={() => { setStep(1); setContent(null); setDraftId(null); }}>
                Back
              </Button>
            )}
            <Button appearance="outline" variant="primary" onPress={onClose}>
              Cancel
            </Button>
            <ActionButton variant="primary" loading={saving} isDisabled={!content} onPress={save}>
              Save draft
            </ActionButton>
          </>
        )
      }
    >
      {step === 1 ? (
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            Each template is a complete document with its own clauses. Your project, client, dates, and deliverables are filled in
            automatically, and everything stays editable.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {CONTRACT_TEMPLATES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setSelectedTemplate(t.id);
                  setTitle(t.name);
                  setContent(null);
                  setStep(2);
                }}
                className="rounded-xl border border-card-border p-4 text-left transition-colors hover:border-input-primary-focus-border"
              >
                <p className="text-sm font-semibold text-text-primary">{t.name}</p>
                <p className="mt-1 text-xs text-text-tertiary">{t.description}</p>
              </button>
            ))}
          </div>
        </div>
      ) : !content ? (
        <p className="py-10 text-center text-sm text-text-tertiary">Preparing the contract...</p>
      ) : (
        <AppTabs
          tabs={[
            {
              value: "parties",
              label: "Parties",
              content: (
                <div className="space-y-4">
                  <p className="text-xs font-medium tracking-wide text-text-tertiary uppercase">Service provider</p>
                  <FormGrid>
                    <TextInput label="Provider Name / Representative" value={content.parties?.provider?.name || ""} onChange={(v) => update("parties.provider.name", v)} />
                    <TextInput label="Company / Organization" value={content.parties?.provider?.company || ""} onChange={(v) => update("parties.provider.company", v)} />
                    <TextInput label="Email Address" type="email" value={content.parties?.provider?.email || ""} onChange={(v) => update("parties.provider.email", v)} />
                    <TextInput label="Business Address" value={content.parties?.provider?.address || ""} onChange={(v) => update("parties.provider.address", v)} />
                  </FormGrid>
                  <p className="text-xs font-medium tracking-wide text-text-tertiary uppercase">Client</p>
                  <FormGrid>
                    <TextInput label="Client Contact Name" value={content.parties?.client?.name || ""} onChange={(v) => update("parties.client.name", v)} />
                    <TextInput label="Client Company" value={content.parties?.client?.company || ""} onChange={(v) => update("parties.client.company", v)} />
                    <TextInput label="Client Email Address" type="email" value={content.parties?.client?.email || ""} onChange={(v) => update("parties.client.email", v)} />
                    <TextInput label="Client Website" value={content.parties?.client?.website || ""} onChange={(v) => update("parties.client.website", v)} />
                    <TextInput label="Client Address" value={content.parties?.client?.address || ""} onChange={(v) => update("parties.client.address", v)} />
                  </FormGrid>
                </div>
              ),
            },
            {
              value: "agreement",
              label: "Agreement",
              content: (
                <div className="space-y-4">
                  <TextInput
                    label="Contract Title"
                    value={title}
                    onChange={(v) => {
                      setTitle(v);
                      update("agreement.title", v);
                    }}
                  />
                  <FormGrid cols={3}>
                    <TextInput label="Effective Date" type="date" value={content.agreement?.effectiveDate || ""} onChange={(v) => update("agreement.effectiveDate", v)} />
                    <TextInput label="Project Start Date" type="date" value={content.agreement?.startDate || ""} onChange={(v) => update("agreement.startDate", v)} />
                    <TextInput label="Project End / Completion Date" type="date" value={content.agreement?.endDate || ""} onChange={(v) => update("agreement.endDate", v)} />
                  </FormGrid>
                  <TextAreaInput label="Timeline Note" rows={2} value={content.agreement?.timelineNote || ""} onChange={(v) => update("agreement.timelineNote", v)} />
                </div>
              ),
            },
            {
              value: "scope",
              label: "Scope",
              content: (
                <div className="space-y-4">
                  <TextAreaInput label="Project Summary / Description" rows={3} value={content.scope?.projectDescription || ""} onChange={(v) => update("scope.projectDescription", v)} />
                  <TextAreaInput label="Included Services" rows={3} value={content.scope?.servicesIncluded || ""} onChange={(v) => update("scope.servicesIncluded", v)} />
                  <TextInput label="Tech Stack (optional)" value={content.scope?.techStack || ""} onChange={(v) => update("scope.techStack", v)} />
                  <TextAreaInput
                    label="Key Deliverables (one per line)"
                    rows={4}
                    value={(content.scope?.deliverables || []).join("\n")}
                    onChange={(v) => update("scope.deliverables", v.split("\n").filter((l) => l.trim()))}
                  />
                  <TextAreaInput label="Out of Scope Work" rows={3} value={content.scope?.outOfScope || ""} onChange={(v) => update("scope.outOfScope", v)} />
                </div>
              ),
            },
            {
              value: "payment",
              label: "Payment",
              content: (
                <div className="space-y-4">
                  <FormGrid>
                    <TextInput
                      label="Total Fee ($ USD)"
                      type="number"
                      min={0}
                      step="0.01"
                      value={(content.payment?.totalAmountCents || 0) / 100}
                      onChange={(v) => updateTotalFee(Math.round(parseFloat(v || "0") * 100))}
                    />
                    <TextInput
                      label="Initial Deposit ($ USD)"
                      type="number"
                      min={0}
                      step="0.01"
                      value={(content.payment?.depositCents || 0) / 100}
                      onChange={(v) => update("payment.depositCents", Math.round(parseFloat(v || "0") * 100))}
                    />
                  </FormGrid>
                  <TextInput label="Accepted Payment Methods" value={content.payment?.paymentMethod || ""} onChange={(v) => update("payment.paymentMethod", v)} />
                  <TextAreaInput label="Late Payment Terms" rows={3} value={content.payment?.latePaymentTerms || ""} onChange={(v) => update("payment.latePaymentTerms", v)} />
                </div>
              ),
            },
            {
              value: "terms",
              label: "Terms",
              content: (
                <div className="space-y-4">
                  <Notice status="info">Toggle clauses to enable or disable them in the contract document. Start a line with &ldquo;-&rdquo; to make it a bullet.</Notice>
                  {clauseKeys.map((key) => {
                    const enabled = Boolean(terms[`${key}Enabled`]);
                    return (
                      <div key={key} className="space-y-2 rounded-lg border border-card-border p-4">
                        <CheckInput checked={enabled} onChange={(v) => update(`terms.${key}Enabled`, v)} label={contractClauseTitle(content, key)} />
                        {enabled && (
                          <TextAreaInput rows={4} value={(terms[`${key}Text`] as string) || ""} onChange={(v) => update(`terms.${key}Text`, v)} />
                        )}
                      </div>
                    );
                  })}
                </div>
              ),
            },
          ]}
        />
      )}
    </Modal>
  );
}
