import { Body, Container, Head, Heading, Html, Link, Preview, Text } from "@react-email/components";
import * as React from "react";

interface ContractSentEmailProps {
  clientName: string;
  organizationName: string;
  contractTitle: string;
  contractUrl: string;
}

export function ContractSentEmail({ clientName, organizationName, contractTitle, contractUrl }: ContractSentEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>
        {organizationName} sent you a contract to sign: {contractTitle}
      </Preview>
      <Body style={{ fontFamily: "sans-serif", padding: "40px 0" }}>
        <Container style={{ maxWidth: "480px", margin: "0 auto" }}>
          <Heading style={{ fontSize: "24px", marginBottom: "24px" }}>Your contract is ready to sign</Heading>
          <Text style={{ fontSize: "16px", lineHeight: "24px" }}>
            Hi {clientName}, {organizationName} sent you <strong>{contractTitle}</strong> to review and sign.
          </Text>
          <Link
            href={contractUrl}
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
            Review and sign
          </Link>
          <Text style={{ fontSize: "14px", color: "#6b7280", marginTop: "24px" }}>
            You do not need an account. The link is private to you, so please do not forward it.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
