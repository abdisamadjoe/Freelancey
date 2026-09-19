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

interface WelcomeEmailProps {
  name: string;
  organizationName: string;
  portalUrl: string;
}

export function WelcomeEmail({
  name,
  organizationName,
  portalUrl,
}: WelcomeEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Welcome to {organizationName}</Preview>
      <Body style={{ fontFamily: "sans-serif", padding: "40px 0" }}>
        <Container style={{ maxWidth: "480px", margin: "0 auto" }}>
          <Heading style={{ fontSize: "24px", marginBottom: "24px" }}>
            Welcome, {name}!
          </Heading>
          <Text style={{ fontSize: "16px", lineHeight: "24px" }}>
            You&apos;ve been invited to {organizationName}&apos;s client portal.
            Here you can track project progress and access shared files.
          </Text>
          <Link
            href={portalUrl}
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
            Go to Portal
          </Link>
        </Container>
      </Body>
    </Html>
  );
}
