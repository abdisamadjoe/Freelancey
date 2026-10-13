"use client";

import { ActionButton, Page, PageBody, PageHeader, TextInput } from "@/components/app/kit";
import { Button } from "@/components/tailgrids/core/button";
import { Card } from "@/components/tailgrids/core/card";
import { apiFetch } from "@/lib/api";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export default function NewLinkPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const router = useRouter();
  const back = `/dashboard/projects/${projectId}?tab=files`;

  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (saving || !url.trim() || !title.trim()) return;
    setSaving(true);
    try {
      await apiFetch("/files/link", {
        method: "POST",
        body: JSON.stringify({ projectId, url: url.trim(), title: title.trim(), description: description.trim() || undefined }),
      });
      toast.success("Link added");
      router.push(back);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add link");
      setSaving(false);
    }
  }

  return (
    <Page>
      <PageHeader
        title="Add link"
        description="Share a link to something that lives elsewhere."
        actions={
          <Link href={back} className="text-sm font-medium text-neutral-brand-color hover:underline">
            Back to project
          </Link>
        }
      />
      <PageBody>
        <Card className="w-full p-6">
          <form onSubmit={add} className="space-y-4">
            <TextInput label="Title" required value={title} onChange={setTitle} />
            <TextInput label="URL" type="url" required value={url} onChange={setUrl} placeholder="https://" />
            <TextInput label="Description" value={description} onChange={setDescription} />
            <div className="flex flex-wrap justify-end gap-2 border-t border-card-border pt-4">
              <Button appearance="outline" variant="primary" onPress={() => router.push(back)}>
                Cancel
              </Button>
              <ActionButton type="submit" variant="primary" loading={saving} isDisabled={!url.trim() || !title.trim()}>
                Add link
              </ActionButton>
            </div>
          </form>
        </Card>
      </PageBody>
    </Page>
  );
}
