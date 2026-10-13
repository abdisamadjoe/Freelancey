"use client";

import { Panel, SelectInput, TextAreaInput, TextInput } from "@/components/app/kit";
import type { IntakeField } from "@/lib/onboarding";
import { useMemo } from "react";

/** Questionnaire fields grouped by section. Used by the portal intake and the public form links. */
export function IntakeFields({
  fields,
  answers,
  onChange,
  disabled,
}: {
  fields: IntakeField[];
  answers: Record<string, string>;
  onChange: (key: string, value: string) => void;
  disabled?: boolean;
}) {
  const sections = useMemo(() => {
    const map = new Map<string, IntakeField[]>();
    for (const f of fields) map.set(f.section, [...(map.get(f.section) ?? []), f]);
    return [...map.entries()];
  }, [fields]);

  return (
    <>
      {sections.map(([section, list]) => (
        <Panel key={section} title={section}>
          <div className="space-y-4">
            {list.map((f) =>
              f.type === "textarea" ? (
                <TextAreaInput key={f.key} label={f.label} required={f.required} rows={3} disabled={disabled} value={answers[f.key] ?? ""} onChange={(v) => onChange(f.key, v)} />
              ) : f.type === "select" ? (
                <SelectInput
                  key={f.key}
                  label={f.label}
                  required={f.required}
                  disabled={disabled}
                  value={answers[f.key] ?? ""}
                  onChange={(v) => onChange(f.key, v)}
                  options={[{ value: "", label: "Choose..." }, ...(f.options ?? []).map((o) => ({ value: o, label: o }))]}
                />
              ) : (
                <TextInput
                  key={f.key}
                  label={f.label}
                  required={f.required}
                  disabled={disabled}
                  type={f.type === "url" ? "url" : "text"}
                  value={answers[f.key] ?? ""}
                  onChange={(v) => onChange(f.key, v)}
                />
              ),
            )}
          </div>
        </Panel>
      ))}
    </>
  );
}
