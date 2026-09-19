"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/components/toast";
import {
  CONTRACT_TEMPLATES,
  ContractContent,
  ContractTemplateId,
  contractClauseTitle,
  orderedContractClauses,
  resolveContractLayout,
} from "@/shared";
import {
  Button,
  Card,
  Checkbox,
  Field,
  Input,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Textarea,
} from "@/components/ui";
import {
  FileText,
  ChevronRight,
  ChevronLeft,
  Check,
  Building,
  Calendar,
  ShieldCheck,
  DollarSign,
  Scale,
  Sparkles,
} from "lucide-react";

interface ContractRecord {
  id: string;
  projectId: string;
  title: string;
  template: string;
  status: string;
  content: ContractContent;
  version: number;
}

interface ContractBuilderModalProps {
  projectId: string;
  initialContract?: ContractRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const STEP_LABELS: Record<1 | 2, string> = {
  1: "Select Template",
  2: "Edit Details",
};

export function ContractBuilderModal({
  projectId,
  initialContract,
  isOpen,
  onClose,
  onSuccess,
}: ContractBuilderModalProps) {
  const toast = useToast();
  const [step, setStep] = useState<1 | 2>(initialContract ? 2 : 1);
  const [saving, setSaving] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ContractTemplateId>(
    (initialContract?.template as ContractTemplateId) || "website-design",
  );
  const [title, setTitle] = useState(initialContract?.title || "");
  const [content, setContent] = useState<ContractContent | null>(initialContract?.content || null);
  const layout = resolveContractLayout(content ?? {});
  const [activeTabSection, setActiveTabSection] = useState<"parties" | "agreement" | "scope" | "payment" | "terms">("parties");

  useEffect(() => {
    if (isOpen && !content && !initialContract) {
      apiFetch<ContractRecord>(`/projects/${projectId}/contracts`, {
        method: "POST",
        body: JSON.stringify({
          title: CONTRACT_TEMPLATES.find((t) => t.id === selectedTemplate)?.name || "Contract Agreement",
          template: selectedTemplate,
        }),
      })
        .then((created) => {
          setTitle(created.title);
          setContent(created.content);
        })
        .catch((err) => {
          toast.error(err instanceof Error ? err.message : "Failed to load contract template");
        });
    }
  }, [isOpen, selectedTemplate, projectId, initialContract, content, toast]);

  if (!isOpen) return null;

  const handleSelectTemplate = (templateId: ContractTemplateId) => {
    setSelectedTemplate(templateId);
    const tmplName = CONTRACT_TEMPLATES.find((t) => t.id === templateId)?.name || "Contract Agreement";
    setTitle(tmplName);
    setContent(null);
    setStep(2);
  };

  const updateContentField = (path: string, value: any) => {
    if (!content) return;
    const parts = path.split(".");
    const newContent = JSON.parse(JSON.stringify(content));
    let curr = newContent;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!curr[parts[i]]) curr[parts[i]] = {};
      curr = curr[parts[i]];
    }
    curr[parts[parts.length - 1]] = value;
    setContent(newContent);
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
        const amount =
          i === schedule.length - 1
            ? newTotal - allocated
            : Math.round((item.amountCents / oldTotal) * newTotal);
        allocated += amount;
        return { ...item, amountCents: amount };
      });
    }
    setContent(next);
  };

  const handleSaveDraft = async () => {
    if (!content) return;
    setSaving(true);
    try {
      if (initialContract) {
        await apiFetch(`/contracts/${initialContract.id}`, {
          method: "PATCH",
          body: JSON.stringify({ title, template: selectedTemplate, content }),
        });
        toast.success("Contract draft updated");
      } else {
        toast.success("Contract draft saved");
      }
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save contract");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      size="2xl"
      scrollable={false}
      className="flex max-h-[calc(100vh-3rem)] flex-col"
    >
      {/* Modal Header */}
      <ModalHeader
        className="pr-14"
        title={
          <span className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-background-gray-secondary text-icon-tertiary">
              <FileText className="size-4" aria-hidden />
            </span>
            {initialContract ? "Edit Contract Agreement" : "Create Project Contract"}
          </span>
        }
        description={`Step ${step} of 2`}
      />

      {/* Step Indicator Bar */}
      <div className="grid grid-cols-3 border-b border-card-border bg-background-gray-primary text-xs">
        {([1, 2] as const).map((stepNumber) => {
          const isActive = step === stepNumber;
          return (
            <button
              key={stepNumber}
              type="button"
              onClick={() => setStep(stepNumber)}
              disabled={stepNumber === 1 ? !!initialContract : !content}
              className={cn(
                "flex items-center justify-center gap-2 px-4 py-3 font-semibold transition-colors",
                "disabled:cursor-not-allowed disabled:opacity-60",
                isActive
                  ? "border-b-2 border-brand-500 bg-card-background text-neutral-brand-color"
                  : "text-text-tertiary hover:text-text-primary",
              )}
            >
              <span
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold",
                  isActive
                    ? "bg-brand-500 text-white-100"
                    : "bg-background-gray-secondary text-text-secondary",
                )}
              >
                {stepNumber}
              </span>
              {stepNumber}. {STEP_LABELS[stepNumber]}
            </button>
          );
        })}
      </div>

      {/* Body Content */}
      <ModalBody className="flex-1 overflow-y-auto">
        {/* STEP 1: TEMPLATE SELECTION */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="mx-auto mb-6 max-w-md text-center">
              <div className="mx-auto mb-2 flex size-10 items-center justify-center rounded-xl bg-background-gray-secondary text-icon-tertiary">
                <Sparkles className="size-5" aria-hidden />
              </div>
              <h3 className="text-base leading-6 font-semibold tracking-[-0.2px] text-text-primary">
                Choose a Template
              </h3>
              <p className="mt-1 text-sm leading-5 text-text-tertiary">
                Each template is a complete document with its own clauses. Your project, client, dates, and deliverables are filled in automatically, and everything stays editable.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {CONTRACT_TEMPLATES.map((tmpl) => {
                const isSelected = selectedTemplate === tmpl.id;
                return (
                  <button
                    key={tmpl.id}
                    type="button"
                    onClick={() => handleSelectTemplate(tmpl.id)}
                    className={cn(
                      "flex flex-col justify-between gap-4 rounded-xl border-[0.5px] bg-card-background p-5 text-left transition",
                      isSelected
                        ? "border-brand-500 ring-2 ring-brand-300"
                        : "border-card-border hover:border-brand-300",
                    )}
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="flex size-8 items-center justify-center rounded-lg bg-background-gray-secondary text-icon-tertiary">
                          <FileText className="size-4" aria-hidden />
                        </span>
                        {isSelected && (
                          <span className="flex size-5 items-center justify-center rounded-full bg-brand-500 text-white-100">
                            <Check className="size-3" aria-hidden />
                          </span>
                        )}
                      </div>
                      <h4 className="text-sm font-semibold text-text-primary">{tmpl.name}</h4>
                      <p className="text-xs leading-5 text-text-tertiary">{tmpl.description}</p>
                    </div>
                    <div className="flex items-center text-xs font-medium text-neutral-brand-color">
                      <span>Use template</span>
                      <ChevronRight className="ml-1 size-3.5" aria-hidden />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 2: EDIT DETAILS */}
        {step === 2 && content && (
          <div className="space-y-6">
            {/* Form Section Navigation */}
            <div className="flex items-center gap-1.5 overflow-x-auto border-b border-card-border pb-3">
              {[
                { id: "parties", label: "Parties", icon: Building },
                { id: "agreement", label: "Agreement", icon: Calendar },
                { id: "scope", label: layout.scopeHeading, icon: ShieldCheck },
                ...(layout.showPayment
                  ? [{ id: "payment", label: layout.paymentHeading, icon: DollarSign }]
                  : []),
                { id: "terms", label: "Terms & Clauses", icon: Scale },
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveTabSection(id as any)}
                  className={cn(
                    "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors",
                    activeTabSection === id
                      ? "bg-background-gray-secondary text-text-primary"
                      : "text-text-tertiary hover:text-text-primary",
                  )}
                >
                  <Icon className="size-4" aria-hidden /> {label}
                </button>
              ))}
            </div>

            {/* PARTIES */}
            {activeTabSection === "parties" && (
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <Card className="space-y-4 bg-card-surface-area">
                  <h4 className="flex items-center gap-2 text-sm font-semibold text-text-primary">
                    <Building className="size-4 text-icon-tertiary" aria-hidden /> Service Provider
                  </h4>
                  <Field label="Provider Name / Representative" htmlFor="provider-name">
                    <Input
                      id="provider-name"
                      type="text"
                      value={content.parties?.provider?.name || ""}
                      onChange={(e) => updateContentField("parties.provider.name", e.target.value)}
                    />
                  </Field>
                  <Field label="Company / Organization" htmlFor="provider-company">
                    <Input
                      id="provider-company"
                      type="text"
                      value={content.parties?.provider?.company || ""}
                      onChange={(e) => updateContentField("parties.provider.company", e.target.value)}
                    />
                  </Field>
                  <Field label="Email Address" htmlFor="provider-email">
                    <Input
                      id="provider-email"
                      type="email"
                      value={content.parties?.provider?.email || ""}
                      onChange={(e) => updateContentField("parties.provider.email", e.target.value)}
                    />
                  </Field>
                  <Field label="Business Address" htmlFor="provider-address">
                    <Input
                      id="provider-address"
                      type="text"
                      value={content.parties?.provider?.address || ""}
                      onChange={(e) => updateContentField("parties.provider.address", e.target.value)}
                    />
                  </Field>
                </Card>

                <Card className="space-y-4 bg-card-surface-area">
                  <h4 className="flex items-center gap-2 text-sm font-semibold text-text-primary">
                    <Building className="size-4 text-icon-tertiary" aria-hidden /> Client Information
                  </h4>
                  <Field label="Client Contact Name" htmlFor="client-name">
                    <Input
                      id="client-name"
                      type="text"
                      value={content.parties?.client?.name || ""}
                      onChange={(e) => updateContentField("parties.client.name", e.target.value)}
                    />
                  </Field>
                  <Field label="Client Company" htmlFor="client-company">
                    <Input
                      id="client-company"
                      type="text"
                      value={content.parties?.client?.company || ""}
                      onChange={(e) => updateContentField("parties.client.company", e.target.value)}
                    />
                  </Field>
                  <Field label="Client Email Address" htmlFor="client-email">
                    <Input
                      id="client-email"
                      type="email"
                      value={content.parties?.client?.email || ""}
                      onChange={(e) => updateContentField("parties.client.email", e.target.value)}
                    />
                  </Field>
                  <Field label="Client Website" htmlFor="client-website">
                    <Input
                      id="client-website"
                      type="text"
                      placeholder="https://"
                      value={content.parties?.client?.website || ""}
                      onChange={(e) => updateContentField("parties.client.website", e.target.value)}
                    />
                  </Field>
                  <Field label="Client Address" htmlFor="client-address">
                    <Input
                      id="client-address"
                      type="text"
                      value={content.parties?.client?.address || ""}
                      onChange={(e) => updateContentField("parties.client.address", e.target.value)}
                    />
                  </Field>
                </Card>
              </div>
            )}

            {/* AGREEMENT DATES */}
            {activeTabSection === "agreement" && (
              <div className="space-y-4">
                <Field label="Contract Title" htmlFor="contract-title">
                  <Input
                    id="contract-title"
                    type="text"
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value);
                      updateContentField("agreement.title", e.target.value);
                    }}
                  />
                </Field>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <Field label="Effective Date" htmlFor="effective-date">
                    <Input
                      id="effective-date"
                      type="date"
                      value={content.agreement?.effectiveDate || ""}
                      onChange={(e) => updateContentField("agreement.effectiveDate", e.target.value)}
                    />
                  </Field>
                  <Field label="Project Start Date" htmlFor="start-date">
                    <Input
                      id="start-date"
                      type="date"
                      value={content.agreement?.startDate || ""}
                      onChange={(e) => updateContentField("agreement.startDate", e.target.value)}
                    />
                  </Field>
                  <Field label="Project End / Completion Date" htmlFor="end-date">
                    <Input
                      id="end-date"
                      type="date"
                      value={content.agreement?.endDate || ""}
                      onChange={(e) => updateContentField("agreement.endDate", e.target.value)}
                    />
                  </Field>
                </div>

                {layout.showTimeline && (
                  <Field label="Timeline Note" htmlFor="timeline-note">
                    <Textarea
                      id="timeline-note"
                      rows={2}
                      value={content.agreement?.timelineNote || ""}
                      onChange={(e) => updateContentField("agreement.timelineNote", e.target.value)}
                    />
                  </Field>
                )}
              </div>
            )}

            {/* SCOPE OF WORK */}
            {activeTabSection === "scope" && (
              <div className="space-y-4">
                <Field label="Project Summary / Description" htmlFor="project-description">
                  <Textarea
                    id="project-description"
                    rows={3}
                    value={content.scope?.projectDescription || ""}
                    onChange={(e) => updateContentField("scope.projectDescription", e.target.value)}
                  />
                </Field>

                <Field label="Included Services" htmlFor="services-included">
                  <Textarea
                    id="services-included"
                    rows={2}
                    value={content.scope?.servicesIncluded || ""}
                    onChange={(e) => updateContentField("scope.servicesIncluded", e.target.value)}
                  />
                </Field>

                <Field label="Tech Stack (optional)" htmlFor="tech-stack">
                  <Input
                    id="tech-stack"
                    type="text"
                    value={content.scope?.techStack || ""}
                    onChange={(e) => updateContentField("scope.techStack", e.target.value)}
                  />
                </Field>

                {layout.showDeliverables && (
                <Field label="Key Deliverables (one per line)" htmlFor="deliverables">
                  <Textarea
                    id="deliverables"
                    rows={4}
                    className="font-mono"
                    value={(content.scope?.deliverables || []).join("\n")}
                    onChange={(e) =>
                      updateContentField(
                        "scope.deliverables",
                        e.target.value.split("\n").filter((l) => l.trim() !== ""),
                      )
                    }
                  />
                </Field>
                )}

                <Field label="Out of Scope Work" htmlFor="out-of-scope">
                  <Textarea
                    id="out-of-scope"
                    rows={2}
                    value={content.scope?.outOfScope || ""}
                    onChange={(e) => updateContentField("scope.outOfScope", e.target.value)}
                  />
                </Field>
              </div>
            )}

            {/* PAYMENT & SCHEDULE */}
            {activeTabSection === "payment" && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Field label="Total Fee ($ USD)" htmlFor="total-fee">
                    <Input
                      id="total-fee"
                      type="number"
                      min={0}
                      step={1}
                      value={(content.payment?.totalAmountCents || 0) / 100}
                      onChange={(e) =>
                        updateTotalFee(Math.round(parseFloat(e.target.value || "0") * 100))
                      }
                    />
                  </Field>
                  <Field label="Initial Deposit ($ USD)" htmlFor="initial-deposit">
                    <Input
                      id="initial-deposit"
                      type="number"
                      min={0}
                      step={1}
                      value={(content.payment?.depositCents || 0) / 100}
                      onChange={(e) =>
                        updateContentField(
                          "payment.depositCents",
                          Math.round(parseFloat(e.target.value || "0") * 100),
                        )
                      }
                    />
                  </Field>
                </div>

                <Field label="Accepted Payment Methods" htmlFor="payment-method">
                  <Input
                    id="payment-method"
                    type="text"
                    value={content.payment?.paymentMethod || ""}
                    onChange={(e) => updateContentField("payment.paymentMethod", e.target.value)}
                  />
                </Field>

                <Field label="Late Payment Terms" htmlFor="late-payment-terms">
                  <Input
                    id="late-payment-terms"
                    type="text"
                    value={content.payment?.latePaymentTerms || ""}
                    onChange={(e) => updateContentField("payment.latePaymentTerms", e.target.value)}
                  />
                </Field>
              </div>
            )}

            {/* TERMS & CLAUSES */}
            {activeTabSection === "terms" && (
              <div className="space-y-3.5">
                <p className="text-sm font-medium text-text-tertiary">
                  Toggle clauses to enable or disable them in the contract document. Start a line with &ldquo;-&rdquo; to make it a bullet.
                </p>

                {orderedContractClauses(content).map((key) => {
                  const title = contractClauseTitle(content, key);
                  const enabledKey = `terms.${key}Enabled`;
                  const textKey = `terms.${key}Text`;
                  const isEnabled = (content.terms as any)?.[`${key}Enabled`];
                  const textValue = (content.terms as any)?.[`${key}Text`] || "";

                  return (
                    <Card key={key} className="space-y-3 bg-card-surface-area p-4">
                      <Checkbox
                        id={`clause-${key}`}
                        checked={!!isEnabled}
                        onChange={(e) => updateContentField(enabledKey, e.target.checked)}
                        label={title}
                      />
                      {isEnabled && (
                        <Textarea
                          rows={4}
                          value={textValue}
                          onChange={(e) => updateContentField(textKey, e.target.value)}
                          className="leading-relaxed"
                        />
                      )}
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </ModalBody>

      {/* Modal Footer */}
      <ModalFooter className="justify-between">
        <div>
          {step > 1 && (
            <Button
              type="button"
              appearance="outline"
              onClick={() => setStep((step - 1) as 1 | 2)}
            >
              <ChevronLeft /> Back
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button type="button" appearance="outline" onClick={onClose}>
            Cancel
          </Button>

          {step < 2 ? (
            <Button
              type="button"
              disabled={!content}
              onClick={() => setStep((step + 1) as 1 | 2)}
            >
              Next <ChevronRight />
            </Button>
          ) : (
            <Button type="button" loading={saving} onClick={handleSaveDraft}>
              {saving ? "Saving..." : "Save Contract Draft"}
            </Button>
          )}
        </div>
      </ModalFooter>
    </Modal>
  );
}
