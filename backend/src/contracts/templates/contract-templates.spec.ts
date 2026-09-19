import { describe, it, expect } from "vitest";
import { CONTRACT_TEMPLATES, CONTRACT_CLAUSES, contractClauseTitle } from "@/shared";
import { buildDefaultContractContent } from "./contract-templates";

const org = { name: "Acme Agency" };
const client = { name: "Jo Client", email: "jo@example.com" };
const project = { name: "Website Redesign", tasks: [{ title: "Homepage" }] };

describe("buildDefaultContractContent", () => {
  it.each(CONTRACT_TEMPLATES.map((t) => t.id))("%s builds a complete, populated document", (id) => {
    const content = buildDefaultContractContent(id, org, client, project);

    expect(content.agreement.title).toBeTruthy();
    expect(content.layout?.documentLabel).toBeTruthy();
    expect(content.parties.provider.name).toBe("Acme Agency");
    expect(content.parties.client.name).toBe("Jo Client");

    const enabled = CONTRACT_CLAUSES.filter(
      (c) => (content.terms as unknown as Record<string, unknown>)[`${c.key}Enabled`],
    );
    expect(enabled.length).toBeGreaterThan(0);
    for (const c of enabled) {
      const text = (content.terms as unknown as Record<string, string>)[`${c.key}Text`];
      expect(text, `${id}: ${c.key} is enabled but empty`).toBeTruthy();
    }
  });

  it("falls back to the website design template for an unknown template id", () => {
    const content = buildDefaultContractContent("nda" as never, org, client, project);
    expect(content.agreement.title).toBe("Website Design Service Agreement");
  });
});
