import { Body, Container, Head, Heading, Html, Link, Preview, Text } from "@react-email/components";
import * as React from "react";

interface ProposalSentEmailProps {
  clientName: string;
  organizationName: string;
  proposalTitle: string;
  total: string;
  validUntil?: string;
  proposalUrl: string;
}

export function ProposalSentEmail({
  clientName,
  organizationName,
  proposalTitle,
  total,
  validUntil,
  proposalUrl,
}: ProposalSentEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>
        {organizationName} sent you a proposal: {proposalTitle}
      </Preview>
      <Body style={{ fontFamily: "sans-serif", padding: "40px 0" }}>
        <Container style={{ maxWidth: "480px", margin: "0 auto" }}>
          <Heading style={{ fontSize: "24px", marginBottom: "24px" }}>Your proposal is ready</Heading>
          <Text style={{ fontSize: "16px", lineHeight: "24px" }}>
            Hi {clientName}, {organizationName} sent you a proposal for <strong>{proposalTitle}</strong>.
          </Text>
          <Text style={{ fontSize: "16px", lineHeight: "24px" }}>
            Total: <strong>{total}</strong>
          </Text>
          {validUntil && (
            <Text style={{ fontSize: "14px", color: "#374151" }}>This proposal is valid until {validUntil}.</Text>
          )}
          <Link
            href={proposalUrl}
            style={{
              display: "inline-block",
              padding: "12px 24px",
              backgroundColor: "#006b68",
              color: "#ffffff",
              borderRadius: "6px",
              textDecoration: "none",
              fontSize: "16px",
              marginTop: "16px",
            }}
          >
            Review proposal
          </Link>
          <Text style={{ fontSize: "14px", color: "#6b7280", marginTop: "24px" }}>
            You can accept or decline from that page. You do not need an account.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
