import { describe, it, expect } from "vitest";
import { CONTRACT_TEMPLATES } from "@/shared";
import { ContractPdfService } from "./contract-pdf.service";
import { buildDefaultContractContent } from "./templates/contract-templates";

const prismaMock: any = {
  organization: { findUnique: async () => ({ name: "Acme Agency" }) },
};

const countPages = (pdf: Buffer) => (pdf.toString("latin1").match(/\/Type \/Page\b/g) ?? []).length;

describe("ContractPdfService", () => {
  const service = new ContractPdfService(prismaMock);

  it.each(CONTRACT_TEMPLATES.map((t) => t.id))("%s renders a cover plus content pages", async (id) => {
    const content = buildDefaultContractContent(
      id,
      { name: "Acme Agency" },
      { name: "Jo Client", email: "jo@example.com", company: "Client Co" },
      { name: "Website", tasks: [{ title: "Homepage" }] },
    );

    const { buffer, filename } = await service.render(
      { title: "Test", version: 3, status: "draft", projectName: "Website", content },
      "org_1",
    );

    expect(buffer.subarray(0, 5).toString()).toBe("%PDF-");
    expect(countPages(buffer)).toBeGreaterThanOrEqual(2);
    expect(filename).toMatch(/-v3\.pdf$/);
  });

  it("does not require an organization or branding to render", async () => {
    const bare = new ContractPdfService({ organization: { findUnique: async () => null } } as any);
    const content = buildDefaultContractContent("website-design", { name: "" }, { name: "" , email: "" }, { name: "P" });
    const { buffer } = await bare.render({ title: "NDA", version: 1, status: "draft", projectName: "P", content }, "org_1");
    expect(buffer.length).toBeGreaterThan(1000);
  });
});
