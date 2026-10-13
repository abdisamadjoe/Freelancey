"use client";

import { useState } from "react";
import { Copy, LifeBuoy } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/components/toast";
import { Button, Card, CardHeader, CardTitle } from "@/components/ui";

/** Gives the client a private link where they can ask for help. A new link replaces the old one. */
export function SupportLinkCard({ clientId }: { clientId: string }) {
  const { success, error: showError } = useToast();
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState(false);

  async function create() {
    if (link && !window.confirm("This replaces the current support link. The old link will stop working.")) return;
    setBusy(true);
    try {
      const res = await apiFetch<{ link: string }>(`/client-records/${clientId}/support-link`, { method: "POST" });
      setLink(res.link);
    } catch (err) {
      showError(err instanceof Error ? err.message : "Could not create the link");
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      success("Link copied");
    } catch {
      showError("Copy failed. Select the link and copy it by hand.");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Support</CardTitle>
      </CardHeader>
      <div className="space-y-3 p-5 pt-0">
        <p className="text-sm text-text-secondary">
          Share a private link so this client can report problems after launch. Requests land in your Support inbox.
        </p>
        <Button size="sm" appearance="outline" iconOnly={false} loading={busy} onClick={create}>
          <LifeBuoy />
          <span>{link ? "Create a new link" : "Create support link"}</span>
        </Button>
        {link && (
          <div className="flex flex-wrap items-center gap-2 rounded-md border border-card-border p-3">
            <code className="min-w-0 flex-1 break-all text-xs text-text-primary">{link}</code>
            <Button type="button" size="sm" appearance="outline" iconOnly={false} onClick={copy}>
              <Copy />
              <span>Copy link</span>
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
