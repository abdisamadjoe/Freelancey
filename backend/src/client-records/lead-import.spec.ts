import { describe, expect, it } from "vitest";
import { mapLeadRows, normalizeWebsite } from "./lead-import";

describe("normalizeWebsite", () => {
  it("matches the same site however it was typed", () => {
    expect(normalizeWebsite("https://www.Acme.com/about?x=1")).toBe("acme.com");
    expect(normalizeWebsite("acme.com")).toBe("acme.com");
    expect(normalizeWebsite("HTTP://ACME.COM")).toBe("acme.com");
  });

  it("returns undefined for nothing", () => {
    expect(normalizeWebsite(undefined)).toBeUndefined();
    expect(normalizeWebsite("  ")).toBeUndefined();
  });
});

describe("mapLeadRows", () => {
  const header = ["Business Name", "Contact", "Email", "Phone", "Website", "Service interested in", "Notes", "Rating"];

  it("maps common Google Maps style headers", () => {
    const { leads, problems, unknownHeaders } = mapLeadRows([
      header,
      ["ABC Construction", "Ahmed Hassan", "AHMED@abc.com", "+254700", "https://abc.com", "Website", "Looks outdated", "4.5"],
    ]);
    expect(problems).toEqual([]);
    expect(unknownHeaders).toEqual(["Rating"]);
    expect(leads[0]).toMatchObject({
      line: 2,
      name: "Ahmed Hassan",
      company: "ABC Construction",
      email: "ahmed@abc.com",
      phone: "+254700",
      website: "https://abc.com",
      interestedIn: "Website",
      notes: "Looks outdated",
    });
  });

  it("falls back to the business name when there is no contact name", () => {
    const { leads } = mapLeadRows([["Business", "Phone"], ["XYZ Restaurant", "+254711"]]);
    expect(leads[0].name).toBe("XYZ Restaurant");
  });

  it("reports rows with no name, a bad email or no way to reach them, with line numbers", () => {
    const { leads, problems } = mapLeadRows([
      ["Name", "Email", "Phone"],
      ["", "a@b.com", ""],
      ["Bad Email", "nope", ""],
      ["No Contact", "", ""],
      ["Good", "good@x.com", ""],
    ]);
    expect(leads.map((l) => l.name)).toEqual(["Good"]);
    expect(problems.map((p) => p.line)).toEqual([2, 3, 4]);
  });

  it("strips markup from cells", () => {
    const { leads } = mapLeadRows([["Name", "Phone"], ["<b>Bold</b> Co", "123"]]);
    expect(leads[0].name).toBe("Bold Co");
  });

  it("returns nothing for an empty file", () => {
    expect(mapLeadRows([])).toEqual({ leads: [], problems: [], unknownHeaders: [] });
  });
});
