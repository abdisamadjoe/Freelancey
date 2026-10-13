import { Body, Container, Head, Heading, Html, Link, Preview, Text } from "@react-email/components";
import * as React from "react";

interface FormRequestEmailProps {
  clientName: string;
  organizationName: string;
  heading: string;
  description: string;
  buttonLabel: string;
  formUrl: string;
}

export function FormRequestEmail({
  clientName,
  organizationName,
  heading,
  description,
  buttonLabel,
  formUrl,
}: FormRequestEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>
        {organizationName}: {heading}
      </Preview>
      <Body style={{ fontFamily: "sans-serif", padding: "40px 0" }}>
        <Container style={{ maxWidth: "480px", margin: "0 auto" }}>
          <Heading style={{ fontSize: "24px", marginBottom: "24px" }}>{heading}</Heading>
          <Text style={{ fontSize: "16px", lineHeight: "24px" }}>
            Hi {clientName}, {description}
          </Text>
          <Link
            href={formUrl}
            style={{
              display: "inline-block",
              padding: "12px 24px",
              backgroundColor: "#064e3b",
              color: "#ecfdf5",
              borderRadius: "6px",
              textDecoration: "none",
              fontSize: "16px",
              marginTop: "16px",
            }}
          >
            {buttonLabel}
          </Link>
          <Text style={{ fontSize: "14px", color: "#6b7280", marginTop: "24px" }}>
            You do not need an account. The link is private to you, so please do not forward it.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
