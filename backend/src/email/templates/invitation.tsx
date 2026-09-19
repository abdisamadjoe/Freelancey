import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
} from "@react-email/components";
import * as React from "react";

interface InvitationEmailProps {
  inviteUrl: string;
  organizationName: string;
  inviterName?: string;
}

export function InvitationEmail({
  inviteUrl,
  organizationName,
  inviterName,
}: InvitationEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>You&apos;ve been invited to {organizationName}</Preview>
      <Body style={{ fontFamily: "sans-serif", padding: "40px 0" }}>
        <Container style={{ maxWidth: "480px", margin: "0 auto" }}>
          <Heading style={{ fontSize: "24px", marginBottom: "24px" }}>
            You&apos;re invited to {organizationName}
          </Heading>
          <Text style={{ fontSize: "16px", lineHeight: "24px" }}>
            {inviterName
              ? `${inviterName} has invited you to join`
              : "You have been invited to join"}{" "}
            {organizationName}&apos;s client portal. Click below to accept the
            invitation and access your projects.
          </Text>
          <Link
            href={inviteUrl}
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
            Accept Invitation
          </Link>
          <Text
            style={{ fontSize: "14px", color: "#6b7280", marginTop: "24px" }}
          >
            If you didn&apos;t expect this invitation, you can safely ignore
            this email.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
