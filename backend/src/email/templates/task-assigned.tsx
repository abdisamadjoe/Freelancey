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

interface TaskAssignedEmailProps {
  clientName: string;
  projectName: string;
  taskTitle: string;
  dueDate?: string;
  portalUrl: string;
}

export function TaskAssignedEmail({
  clientName,
  projectName,
  taskTitle,
  dueDate,
  portalUrl,
}: TaskAssignedEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>New task on {projectName}: {taskTitle}</Preview>
      <Body style={{ fontFamily: "sans-serif", padding: "40px 0" }}>
        <Container style={{ maxWidth: "480px", margin: "0 auto" }}>
          <Heading style={{ fontSize: "24px", marginBottom: "24px" }}>
            New Task Added
          </Heading>
          <Text style={{ fontSize: "16px", lineHeight: "24px" }}>
            {clientName}, a new task has been added to {projectName}:{" "}
            <strong>{taskTitle}</strong>
          </Text>
          {dueDate && (
            <Text style={{ fontSize: "14px", color: "#374151" }}>
              Due date: {dueDate}
            </Text>
          )}
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
            View Tasks
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
