import { describe, expect, it } from "vitest";
import { BadRequestException } from "@nestjs/common";
import { cleanAnswers } from "./form-answers";
import type { IntakeField } from "../client-onboarding/intake-template";

const fields: IntakeField[] = [
  { key: "name", label: "Name", type: "text", section: "A", required: true },
  { key: "about", label: "About", type: "textarea", section: "A" },
  { key: "kind", label: "Kind", type: "select", section: "A", options: ["One", "Two"] },
  { key: "site", label: "Site", type: "url", section: "A" },
];

describe("cleanAnswers", () => {
  it("keeps only defined keys, trimmed", () => {
    expect(cleanAnswers(fields, { name: "  Acme ", extra: "nope" })).toEqual({ name: "Acme" });
  });

  it("strips markup from text", () => {
    expect(cleanAnswers(fields, { name: "<b>Acme</b>", about: "<script>x</script>hello" })).toEqual({
      name: "Acme",
      about: "hello",
    });
  });

  it("requires required fields, listing every problem", () => {
    try {
      cleanAnswers(fields, { kind: "Three", site: "javascript:alert(1)" });
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(BadRequestException);
      const messages = (err as BadRequestException).getResponse() as { message: string[] };
      expect(messages.message).toHaveLength(3);
    }
  });

  it("accepts valid selects and http(s) links", () => {
    expect(cleanAnswers(fields, { name: "A", kind: "Two", site: "https://example.com/logo.png" })).toEqual({
      name: "A",
      kind: "Two",
      site: "https://example.com/logo.png",
    });
  });

  it("ignores non-string values", () => {
    expect(() => cleanAnswers(fields, { name: 42 })).toThrow(BadRequestException);
  });

  it("caps long values", () => {
    const out = cleanAnswers(fields, { name: "x".repeat(2000), about: "y".repeat(9000) });
    expect(out.name).toHaveLength(500);
    expect(out.about).toHaveLength(5000);
  });
});
