"use client";

import { Page, PageBody, PageHeader } from "@/components/app/kit";
import { TimeEntryForm } from "@/components/app/projects/time-entry-form";
import { Card } from "@/components/tailgrids/core/card";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

export default function NewTimeEntryPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const router = useRouter();
  const back = `/dashboard/projects/${projectId}?tab=time`;

  return (
    <Page>
      <PageHeader
        title="Add time entry"
        description="Log time you worked on this project."
        actions={
          <Link href={back} className="text-sm font-medium text-neutral-brand-color hover:underline">
            Back to project
          </Link>
        }
      />
      <PageBody>
        <Card className="w-full p-6">
          <TimeEntryForm projectId={projectId} onCancel={() => router.push(back)} onSaved={() => router.push(back)} />
        </Card>
      </PageBody>
    </Page>
  );
}
