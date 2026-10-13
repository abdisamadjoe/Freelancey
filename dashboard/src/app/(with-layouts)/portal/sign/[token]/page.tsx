"use client";

import { Loading, Notice, Page, PageBody, PageHeader, Panel } from "@/components/app/kit";
import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

const SigningViewer = dynamic(() => import("@/components/app/documents/signing-viewer").then((m) => m.SigningViewer), { ssr: false });

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

interface TokenData {
  documentId: string;
  userId: string;
  document: {
    id: string;
    title: string;
    type: string;
    status: string;
    requiresSignature: boolean;
    organizationId: string;
    signatureFields?: { id: string }[];
  };
}

export default function DirectSignPage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<TokenData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_URL}/api/documents/sign-via-token/${token}`, { credentials: "include" });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          setError(body.message || "Invalid or expired signing link");
          return;
        }
        setData(await res.json());
      } catch {
        setError("Failed to validate signing link");
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  if (loading) return <Loading label="Validating signing link..." />;

  if (error) {
    return (
      <Page>
        <PageHeader title="Signing Link Error" />
        <PageBody>
          <Notice status="error">{error}. Please contact the sender for a new signing link.</Notice>
        </PageBody>
      </Page>
    );
  }

  if (completed) {
    return (
      <Page>
        <PageHeader title="Document Signed" description="Thank you for signing. You can close this page." />
      </Page>
    );
  }

  if (data?.document.requiresSignature) {
    return <SigningViewer documentId={data.document.id} tokenMode={token} onClose={() => setCompleted(true)} onSigned={() => setCompleted(true)} />;
  }

  return (
    <Page>
      <PageHeader title={data?.document.title ?? "Document"} />
      <PageBody>
        <Panel>
          <p className="text-sm text-text-tertiary">This document has been opened via a direct link.</p>
        </Panel>
      </PageBody>
    </Page>
  );
}
