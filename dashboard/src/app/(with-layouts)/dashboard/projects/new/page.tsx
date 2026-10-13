"use client";

import {
  ActionButton,
  FormGrid,
  Notice,
  Page,
  PageBody,
  PageHeader,
  type Paginated,
  SelectInput,
  TextAreaInput,
  TextInput,
} from "@/components/app/kit";
import { Button } from "@/components/tailgrids/core/button";
import { Card } from "@/components/tailgrids/core/card";
import { apiFetch } from "@/lib/api";
import { useAppConfig } from "@/lib/app-config";
import { track } from "@/lib/track";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface ClientChoice {
  id: string;
  name: string;
  company: string | null;
}

export default function NewProjectPage() {
  const router = useRouter();
  const config = useAppConfig();

  const [name, setName] = useState("");
  const [clientId, setClientId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [description, setDescription] = useState("");
  const [clientChoices, setClientChoices] = useState<ClientChoice[]>([]);
  const [planLimits, setPlanLimits] = useState<{ maxProjects: number; projectsUsed: number } | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch<Paginated<ClientChoice>>("/client-records?stage=active&limit=100")
      .then((res) => setClientChoices(res.data))
      .catch(() => setClientChoices([]));
  }, []);

  useEffect(() => {
    if (!config?.billingEnabled) return;
    Promise.all([
      apiFetch<{ subscription: { plan: { maxProjects: number } } | null }>("/billing/subscription").catch(() => null),
      apiFetch<{ projects: number }>("/billing/usage").catch(() => null),
    ]).then(([sub, usage]) => {
      if (sub?.subscription?.plan && usage != null) {
        setPlanLimits({ maxProjects: sub.subscription.plan.maxProjects, projectsUsed: usage.projects });
      }
    });
  }, [config?.billingEnabled]);

  const atProjectLimit =
    planLimits !== null && planLimits.maxProjects !== -1 && planLimits.projectsUsed >= planLimits.maxProjects;
  const oneProjectLeft =
    planLimits !== null && planLimits.maxProjects !== -1 && !atProjectLimit && planLimits.maxProjects - planLimits.projectsUsed === 1;

  async function handleCreate(e?: React.FormEvent) {
    e?.preventDefault();
    if (creating || atProjectLimit || !name.trim()) return;
    setCreating(true);
    setError("");
    try {
      const created = await apiFetch<{ id: string }>("/projects", {
        method: "POST",
        body: JSON.stringify({
          name,
          description,
          clientId: clientId || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        }),
      });
      track("project_created");
      router.push(`/dashboard/projects/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create project");
      setCreating(false);
    }
  }

  return (
    <Page>
      <PageHeader
        title="New Project"
        description="Create a project workspace to start tracking tasks and contracts."
        actions={
          <Link
            href="/dashboard/projects"
            className="text-sm font-medium text-neutral-brand-color hover:underline"
          >
            Back to projects
          </Link>
        }
      />

      <PageBody>
        <Card className="w-full p-6">
          <form onSubmit={handleCreate} className="space-y-4">
            {error && <Notice status="error">{error}</Notice>}
            {atProjectLimit && (
              <Notice status="warning">
                You&apos;ve reached your limit of {planLimits?.maxProjects} free projects. Upgrade to Pro for unlimited project
                creation and advanced client portal tools.{" "}
                <Link href="/dashboard/settings/billing" className="font-medium underline">
                  Upgrade
                </Link>
              </Notice>
            )}
            {oneProjectLeft && (
              <Notice status="warning">
                Last free project workspace. Upgrade to Pro for unlimited.{" "}
                <Link href="/dashboard/settings/billing" className="font-medium underline">
                  Upgrade
                </Link>
              </Notice>
            )}

            <TextInput
              label="Project title"
              required
              value={name}
              onChange={setName}
              placeholder="Project title (e.g., Website Redesign & Brand Assets)"
            />
            <SelectInput
              label="Client"
              value={clientId}
              onChange={setClientId}
              options={[
                { value: "", label: "No client yet" },
                ...clientChoices.map((c) => ({ value: c.id, label: c.company ? `${c.name} (${c.company})` : c.name })),
              ]}
            />
            <FormGrid>
              <TextInput label="Start date" type="date" value={startDate} onChange={setStartDate} />
              <TextInput label="Deadline" type="date" value={endDate} onChange={setEndDate} />
            </FormGrid>
            <TextAreaInput
              label="Description"
              rows={5}
              value={description}
              onChange={setDescription}
              placeholder="Project scope and description (optional)"
            />

            <div className="flex flex-wrap justify-end gap-2 pt-2">
              <Button appearance="outline" variant="primary" onPress={() => router.push("/dashboard/projects")}>
                Cancel
              </Button>
              <ActionButton
                type="submit"
                variant="primary"
                loading={creating}
                isDisabled={!name.trim() || atProjectLimit}
              >
                {creating ? "Creating..." : "Create Workspace"}
              </ActionButton>
            </div>
          </form>
        </Card>
      </PageBody>
    </Page>
  );
}
