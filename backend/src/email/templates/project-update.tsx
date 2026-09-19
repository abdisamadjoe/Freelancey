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

interface ProjectUpdateEmailProps {
  clientName: string;
  projectName: string;
  updateContent: string;
  portalUrl: string;
}

export function ProjectUpdateEmail({
  clientName,
  projectName,
  updateContent,
  portalUrl,
}: ProjectUpdateEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>New update on {projectName}</Preview>
      <Body style={{ fontFamily: "sans-serif", padding: "40px 0" }}>
        <Container style={{ maxWidth: "480px", margin: "0 auto" }}>
          <Heading style={{ fontSize: "24px", marginBottom: "24px" }}>
            New Project Update
          </Heading>
          <Text style={{ fontSize: "16px", lineHeight: "24px" }}>
            {clientName}, a new update has been posted to {projectName}.
          </Text>
          <Text
            style={{
              fontSize: "14px",
              lineHeight: "22px",
              color: "#374151",
              backgroundColor: "#f9fafb",
              padding: "12px 16px",
              borderRadius: "6px",
              borderLeft: "3px solid #006b68",
            }}
          >
            {updateContent}
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
            View Update
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
