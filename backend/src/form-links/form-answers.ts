import { BadRequestException } from "@nestjs/common";
import { plainText } from "../common";
import type { IntakeField } from "../client-onboarding/intake-template";

const MAX_TEXT = 500;
const MAX_TEXTAREA = 5000;
const MAX_URL = 500;

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Keeps only the keys the form defines, as plain text, and enforces required fields,
 * select options and URLs. Unknown keys from the client are dropped, never stored.
 */
export function cleanAnswers(fields: IntakeField[], input: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  const problems: string[] = [];

  for (const field of fields) {
    const raw = input[field.key];
    const text = typeof raw === "string" ? raw : "";
    const max = field.type === "textarea" ? MAX_TEXTAREA : field.type === "url" ? MAX_URL : MAX_TEXT;
    const value = plainText(text, max);

    if (!value) {
      if (field.required) problems.push(`${field.label} is required`);
      continue;
    }
    if (field.type === "select" && !(field.options ?? []).includes(value)) {
      problems.push(`${field.label}: pick one of the options`);
      continue;
    }
    // URLs are stored as typed text; sanitising can only escape them, so check the raw value.
    if (field.type === "url" && !isHttpUrl(text.trim())) {
      problems.push(`${field.label} must be a link starting with http:// or https://`);
      continue;
    }
    out[field.key] = field.type === "url" ? text.trim().slice(0, MAX_URL) : value;
  }

  if (problems.length > 0) throw new BadRequestException(problems);
  return out;
}
