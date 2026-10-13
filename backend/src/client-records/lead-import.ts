import { plainText } from "../common";

export const MAX_IMPORT_ROWS = 200;

/** CSV header (lowercase, spaces and punctuation removed) → lead field. */
const HEADER_FIELDS: Record<string, "name" | "company" | "email" | "phone" | "whatsapp" | "website" | "industry" | "location" | "interestedIn" | "notes"> = {
  name: "name",
  contact: "name",
  contactname: "name",
  contactperson: "name",
  business: "company",
  businessname: "company",
  company: "company",
  companyname: "company",
  email: "email",
  emailaddress: "email",
  phone: "phone",
  phonenumber: "phone",
  telephone: "phone",
  mobile: "phone",
  whatsapp: "whatsapp",
  website: "website",
  url: "website",
  site: "website",
  industry: "industry",
  category: "industry",
  location: "location",
  address: "location",
  city: "location",
  service: "interestedIn",
  serviceinterestedin: "interestedIn",
  interestedin: "interestedIn",
  notes: "notes",
  note: "notes",
  comments: "notes",
};

export interface ParsedLead {
  line: number;
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  website?: string;
  industry?: string;
  location?: string;
  interestedIn?: string;
  notes?: string;
}

export interface ImportProblem {
  line: number;
  reason: string;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const normalizeHeader = (h: string) => h.toLowerCase().replace(/[^a-z]/g, "");

/** Lowercased host without "www." so "https://www.Acme.com/" and "acme.com" match. */
export function normalizeWebsite(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const host = value.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").split(/[/?#]/)[0];
  return host || undefined;
}

/**
 * Maps CSV rows to leads. The first row is the header. A lead needs a name (or a business name)
 * and a way to be reached; rows that fail are reported with their line number, never silently dropped.
 */
export function mapLeadRows(rows: string[][]): { leads: ParsedLead[]; problems: ImportProblem[]; unknownHeaders: string[] } {
  if (rows.length === 0) return { leads: [], problems: [], unknownHeaders: [] };

  const [header, ...body] = rows;
  const columns = header.map((h) => HEADER_FIELDS[normalizeHeader(h)]);
  const unknownHeaders = header.filter((h, i) => !columns[i] && h.trim() !== "");

  const leads: ParsedLead[] = [];
  const problems: ImportProblem[] = [];

  body.forEach((cells, index) => {
    const line = index + 2;
    const lead: ParsedLead = { line, name: "" };
    columns.forEach((field, i) => {
      if (!field) return;
      const value = plainText(cells[i], field === "notes" ? 5000 : 300);
      if (value && !lead[field]) lead[field] = value;
    });

    lead.name = lead.name || lead.company || "";
    if (!lead.name) {
      problems.push({ line, reason: "Missing a name or business name" });
      return;
    }
    if (lead.email) {
      lead.email = lead.email.toLowerCase();
      if (!EMAIL.test(lead.email)) {
        problems.push({ line, reason: `"${lead.email}" is not a valid email` });
        return;
      }
    }
    if (!lead.email && !lead.phone && !lead.whatsapp) {
      problems.push({ line, reason: "Needs an email, phone or WhatsApp number" });
      return;
    }
    leads.push(lead);
  });

  return { leads, problems, unknownHeaders };
}
