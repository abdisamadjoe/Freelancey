"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import { CheckCircle2, XCircle } from "lucide-react";
import { Alert, Card, LoadingState } from "@/components/ui";

const SigningViewer = dynamic(
  () => import("@/components/signing-viewer").then((m) => m.SigningViewer),
  { ssr: false },
);

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
  const [tokenData, setTokenData] = useState<TokenData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_URL}/api/documents/sign-via-token/${token}`, {
          credentials: "include",
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          setError(body.message || "Invalid or expired signing link");
          return;
        }
        const data = await res.json();
        setTokenData(data);
      } catch {
        setError("Failed to validate signing link");
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Card className="w-full max-w-md">
          <LoadingState label="Validating signing link..." />
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-10">
        <Card className="w-full max-w-md space-y-4">
          <div className="flex flex-col items-center gap-3 text-center">
            <span className="flex size-11 items-center justify-center rounded-xl bg-badge-error-background text-badge-error-text">
              <XCircle className="size-5" aria-hidden />
            </span>
            <h1 className="text-2xl leading-8 font-medium tracking-[-0.3px] text-text-primary">
              Signing Link Error
            </h1>
          </div>
          <Alert status="error" title={error} icon={null}>
            Please contact the sender for a new signing link.
          </Alert>
        </Card>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="flex items-center justify-center py-10">
        <Card className="w-full max-w-md space-y-3 text-center">
          <span className="mx-auto flex size-11 items-center justify-center rounded-xl bg-badge-success-background text-badge-success-text">
            <CheckCircle2 className="size-5" aria-hidden />
          </span>
          <h1 className="text-2xl leading-8 font-medium tracking-[-0.3px] text-text-primary">
            Document Signed
          </h1>
          <p className="text-sm leading-5 text-text-tertiary">
            Thank you for signing. You can close this page.
          </p>
        </Card>
      </div>
    );
  }

  if (tokenData?.document.requiresSignature) {
    return (
      <SigningViewer
        documentId={tokenData.document.id}
        tokenMode={token}
        onClose={() => setCompleted(true)}
        onSigned={() => setCompleted(true)}
      />
    );
  }

  // Non-signature document — just show confirmation
  return (
    <div className="flex items-center justify-center py-10">
      <Card className="w-full max-w-md space-y-3 text-center">
        <h1 className="text-2xl leading-8 font-medium tracking-[-0.3px] text-text-primary">
          {tokenData?.document.title}
        </h1>
        <p className="text-sm leading-5 text-text-tertiary">
          This document has been opened via a direct link.
        </p>
      </Card>
    </div>
  );
}
