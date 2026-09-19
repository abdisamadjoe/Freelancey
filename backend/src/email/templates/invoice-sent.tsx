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

interface InvoiceSentEmailProps {
  clientName: string;
  invoiceNumber: string;
  amount: string;
  dueDate: string;
  portalUrl: string;
}

export function InvoiceSentEmail({
  clientName,
  invoiceNumber,
  amount,
  dueDate,
  portalUrl,
}: InvoiceSentEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Invoice {invoiceNumber} for {amount}</Preview>
      <Body style={{ fontFamily: "sans-serif", padding: "40px 0" }}>
        <Container style={{ maxWidth: "480px", margin: "0 auto" }}>
          <Heading style={{ fontSize: "24px", marginBottom: "24px" }}>
            Invoice {invoiceNumber}
          </Heading>
          <Text style={{ fontSize: "16px", lineHeight: "24px" }}>
            {clientName}, invoice {invoiceNumber} for {amount} is due {dueDate}.
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
            View Invoice
          </Link>
          <Text
            style={{ fontSize: "14px", color: "#6b7280", marginTop: "24px" }}
          >
            You are receiving this email because you are a client on this
            project.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
