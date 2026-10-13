"use client";

import { ActionButton, CheckInput, ErrorNote, Loading, Page, PageBody, PageHeader, TextInput } from "@/components/app/kit";
import { Button } from "@/components/tailgrids/core/button";
import { Card } from "@/components/tailgrids/core/card";
import { apiFetch } from "@/lib/api";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function DuplicateProjectPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const back = `/dashboard/projects/${id}`;

  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [name, setName] = useState("");
  const [includeTasks, setIncludeTasks] = useState(true);
  const [includeClients, setIncludeClients] = useState(false);
  const [duplicating, setDuplicating] = useState(false);

  useEffect(() => {
    apiFetch<{ name: string }>(`/projects/${id}`)
      .then((p) => {
        setName(`${p.name} (copy)`);
        setLoaded(true);
      })
      .catch(setLoadError);
  }, [id]);

  async function duplicate(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || duplicating) return;
    setDuplicating(true);
    try {
      const created = await apiFetch<{ id: string }>(`/projects/${id}/duplicate`, {
        method: "POST",
        body: JSON.stringify({ name: trimmed, includeTasks, includeClients }),
      });
      toast.success("Project duplicated");
      router.push(`/dashboard/projects/${created.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to duplicate project");
      setDuplicating(false);
    }
  }

  return (
    <Page>
      <PageHeader
        title="Duplicate project"
        description="Files, updates, invoices, and notes are not copied."
        actions={
          <Link href={back} className="text-sm font-medium text-neutral-brand-color hover:underline">
            Back to project
          </Link>
        }
      />
      <PageBody>
        {loadError != null && <ErrorNote error={loadError} />}
        {!loaded && loadError == null && <Loading />}
        {loaded && (
          <Card className="w-full p-6">
            <form onSubmit={duplicate} className="space-y-4">
              <TextInput label="Name" required value={name} onChange={setName} />
              <CheckInput checked={includeTasks} onChange={setIncludeTasks} label="Include tasks" />
              <CheckInput checked={includeClients} onChange={setIncludeClients} label="Include client assignments" />
              <div className="flex flex-wrap justify-end gap-2 border-t border-card-border pt-4">
                <Button appearance="outline" variant="primary" isDisabled={duplicating} onPress={() => router.push(back)}>
                  Cancel
                </Button>
                <ActionButton type="submit" variant="primary" loading={duplicating} isDisabled={!name.trim()}>
                  {duplicating ? "Duplicating…" : "Duplicate"}
                </ActionButton>
              </div>
            </form>
          </Card>
        )}
      </PageBody>
    </Page>
  );
}
