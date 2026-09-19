import { Injectable } from "@nestjs/common";
import { join } from "path";
import PDFDocument from "pdfkit";
import { PrismaService } from "../prisma/prisma.service";
import { ContractContent, contractClauseTitle, orderedContractClauses, resolveContractLayout } from "@/shared";

export interface ContractPdfInput {
  title: string;
  version: number;
  status: string;
  projectName: string;
  content: ContractContent;
}

const FONT_DIR = join(__dirname, "fonts");
const REGULAR = "Inter";
const SEMIBOLD = "Inter-SemiBold";

// A4 in points
const PAGE_W = 595.28;
const PAGE_H = 841.89;

// Cover page
const COVER_BG = "#151722";
const COVER_TEXT = "#ffffff";
const COVER_MUTED = "#6b6f85";
const COVER_LABEL = "#565a70";
const COVER_ACCENT = "#b9a6ff";
const COVER_LEFT = 57;

// Content pages
const INK = "#16171d";
const ACCENT = "#a78bfa";
const PAGE_NO = "#d6d6db";
const WAVE = "#e2e2e6";
const STRIP = "#1a1c26";
const LEFT = 50;
const CONTENT_W = PAGE_W - LEFT * 2;
const BOTTOM_LIMIT = PAGE_H - 62;

const BODY_SIZE = 9.8;
const BODY_GAP = 1.8;
const BULLET_INDENT = 16;

/**
 * Renders contract PDFs in memory. Nothing is persisted: the PDF is derived
 * from the contract's stored content every time it is requested.
 *
 * Design: a dark cover page followed by light, airy content pages set in Inter.
 */
@Injectable()
export class ContractPdfService {
  constructor(private prisma: PrismaService) {}

  async render(input: ContractPdfInput, organizationId: string): Promise<{ buffer: Buffer; filename: string }> {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { name: true },
    });

    const orgName = org?.name || "Organization";
    const { content } = input;
    const layout = resolveContractLayout(content);
    const title = content.agreement.title || input.title;
    const provider = content.parties.provider;
    const client = content.parties.client;
    const providerName = provider.company || provider.name || orgName;
    const clientName = client.company || client.name || "Client";
    const effective = parseDate(content.agreement.effectiveDate);

    const doc = new PDFDocument({ size: "A4", margin: 0 });
    doc.registerFont(REGULAR, join(FONT_DIR, "Inter-Regular.otf"));
    doc.registerFont(SEMIBOLD, join(FONT_DIR, "Inter-SemiBold.otf"));

    const chunks: Buffer[] = [];
    const done = new Promise<Buffer>((resolve, reject) => {
      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);
    });

    const money = (cents: number) => formatMoney(cents, content.payment.currency);

    // ---------------------------------------------------------------- Cover
    doc.rect(0, 0, PAGE_W, PAGE_H).fill(COVER_BG);

    const dayText = String(effective.getDate());
    doc.font(REGULAR).fontSize(50).fillColor(COVER_TEXT);
    const dayW = doc.widthOfString(dayText);
    doc.text(dayText, COVER_LEFT - 2.5, 60, { lineBreak: false, characterSpacing: -1 });
    doc.font(REGULAR).fontSize(23).fillColor(COVER_TEXT).text(
      effective.toLocaleDateString("en-GB", { month: "long" }),
      COVER_LEFT + dayW + 1,
      62,
      { lineBreak: false },
    );
    doc.font(REGULAR).fontSize(15).fillColor("#9296ab").text(String(effective.getFullYear()), COVER_LEFT + dayW + 1, 88, {
      lineBreak: false,
    });

    doc.font(REGULAR).fontSize(7.8).fillColor(COVER_MUTED).text(layout.coverSummary, 311, 56, {
      width: 236,
      lineGap: 4.2,
    });

    doc.font(REGULAR).fontSize(9.9).fillColor(COVER_TEXT).text(layout.coverLabel ?? `${title} between:`, COVER_LEFT, 283, {
      lineBreak: false,
    });

    // Parties as one big headline: "Client & Provider" with the provider in the accent colour.
    const headlineW = PAGE_W - COVER_LEFT * 2;
    let headlineSize = 63;
    doc.font(REGULAR);
    const longestWord = [...clientName.split(/\s+/), ...providerName.split(/\s+/)].reduce(
      (a, b) => (a.length >= b.length ? a : b),
      "",
    );
    while (headlineSize > 28 && (doc.fontSize(headlineSize).widthOfString(longestWord) > headlineW || doc.widthOfString(clientName) > headlineW)) {
      headlineSize -= 2;
    }
    const headlineGap = headlineSize * 1.01 - headlineSize * 1.21;
    doc.fontSize(headlineSize).fillColor(COVER_TEXT).text(clientName, COVER_LEFT - 3, 310 + (63 - headlineSize) * 0.5, {
      width: headlineW,
      lineGap: headlineGap,
      characterSpacing: -headlineSize * 0.02,
    });
    doc.fillColor(COVER_TEXT).text("& ", COVER_LEFT - 3, doc.y, {
      width: headlineW,
      lineGap: headlineGap,
      characterSpacing: -headlineSize * 0.02,
      continued: true,
    });
    doc.fillColor(COVER_ACCENT).text(providerName, { width: headlineW, lineGap: headlineGap, characterSpacing: -headlineSize * 0.02 });

    const coverFooterY = 560;
    const col2 = 311;
    const tinyLabel = (text: string, x: number) =>
      doc.font(SEMIBOLD).fontSize(5.2).fillColor(COVER_LABEL).text(text, x, coverFooterY, { lineBreak: false, characterSpacing: 0.7 });
    tinyLabel("PREPARED BY", COVER_LEFT - 4);
    tinyLabel("CREATED FOR", col2);
    doc.font(REGULAR).fontSize(14.1).fillColor(COVER_TEXT);
    doc.text(providerName, COVER_LEFT - 4, coverFooterY + 14, { width: 240, lineBreak: false, ellipsis: true });
    doc.text(clientName, col2, coverFooterY + 14, { width: 240, lineBreak: false, ellipsis: true });
    doc.font(REGULAR).fontSize(9.9).fillColor(COVER_TEXT);
    doc.text(provider.email || provider.website || "", COVER_LEFT - 4, coverFooterY + 33, { width: 240, lineBreak: false });
    doc.text(client.website || client.email || "", col2, coverFooterY + 33, { width: 240, lineBreak: false });

    // -------------------------------------------------------- Content pages
    let pageNo = 0;

    const startContentPage = (withTitle: boolean) => {
      doc.addPage();
      pageNo += 1;
      doc.rect(0, 0, PAGE_W, 4.5).fill(STRIP);
      doc.rect(0, PAGE_H - 4.5, PAGE_W, 4.5).fill(STRIP);

      doc.font(REGULAR).fontSize(24).fillColor(PAGE_NO).text(String(pageNo).padStart(2, "0"), LEFT, 57, {
        width: CONTENT_W,
        align: "right",
        lineBreak: false,
      });
      if (withTitle) {
        doc.font(REGULAR).fontSize(23.2).fillColor(INK).text(title, LEFT, 59, {
          width: CONTENT_W - 60,
          lineBreak: false,
          ellipsis: true,
          characterSpacing: -0.35,
        });
      }
      wave(doc, LEFT, 122, CONTENT_W);
      doc.y = withTitle ? 146 : 126;
    };

    /** Starts a new page if fewer than `height` points remain. */
    const ensureSpace = (height: number) => {
      if (doc.y + height > BOTTOM_LIMIT) startContentPage(false);
    };

    const runs = (parts: Run[], x: number, width: number, opts: { size?: number; gap?: number } = {}) => {
      parts.forEach((part, i) => {
        doc
          .font(part.bold ? SEMIBOLD : REGULAR)
          .fontSize(opts.size ?? BODY_SIZE)
          .fillColor(part.color ?? INK);
        const last = i === parts.length - 1;
        if (i === 0) doc.text(part.text, x, doc.y, { width, lineGap: opts.gap ?? BODY_GAP, continued: !last });
        else doc.text(part.text, { width, lineGap: opts.gap ?? BODY_GAP, continued: !last });
      });
    };

    const paragraph = (text: string) => {
      ensureSpace(30);
      runs(parseInline(text), LEFT, CONTENT_W);
      doc.y += 2;
    };

    const bullet = (text: string) => {
      ensureSpace(24);
      const y = doc.y;
      doc.circle(LEFT + 4.5, y + 4.9, 1.6).fill(INK);
      runs(parseInline(text), LEFT + BULLET_INDENT, CONTENT_W - BULLET_INDENT);
      doc.y += 1.7;
    };

    /** Renders multi-line text: "- item" lines become bullets, blank lines add a gap. */
    const body = (text: string) => {
      const lines = text.split("\n");
      lines.forEach((raw) => {
        const line = raw.trim();
        if (!line) doc.y += 6;
        else if (/^[-•]\s+/.test(line)) bullet(line.replace(/^[-•]\s+/, ""));
        else paragraph(line);
      });
    };

    let sectionNo = 0;
    const section = (name: string) => {
      ensureSpace(90);
      doc.y += 20;
      doc.font(REGULAR).fontSize(14.5).fillColor(INK).text(`${++sectionNo}.  ${name}`, LEFT, doc.y, {
        width: CONTENT_W,
        characterSpacing: -0.2,
      });
      doc.y += 11.5;
    };

    startContentPage(true);

    // Opening paragraph
    const labels = layout.partyLabels;
    const intro = `This ${title} (the "Agreement") is made and entered into on **${formatLongDate(effective)}** by and between ${clientName} ("${labels.client}") and ${providerName} ("${labels.provider}").`;
    paragraph(intro);

    // 1. Scope
    const { scope } = content;
    section(layout.scopeHeading);
    if (scope.projectDescription) paragraph(scope.projectDescription);
    if (scope.servicesIncluded) paragraph(scope.servicesIncluded);
    if (layout.showDeliverables) (scope.deliverables ?? []).forEach(bullet);
    if (scope.techStack) {
      doc.y += 14;
      paragraph(`{{accent:Tech Stack:}} ${scope.techStack}`);
    }
    if (scope.outOfScope) {
      doc.y += 4;
      paragraph(`**Out of scope:** ${scope.outOfScope}`);
    }

    // 2. Payment
    if (layout.showPayment) {
      const { payment } = content;
      section(layout.paymentHeading);
      paragraph(`Total Fee: **${money(payment.totalAmountCents)}**`);
      doc.y += 14;

      const schedule = payment.schedule ?? [];
      if (schedule.length) {
        paragraph("Payment Schedule:");
        schedule.forEach((item) => bullet(scheduleLine(item.milestoneName, item.amountCents, payment.totalAmountCents, money)));
        doc.y += 14;
      }
      const accepted = [
        payment.paymentMethod ? `Accepted: ${payment.paymentMethod}.` : "",
        payment.depositCents && !schedule.length ? `Initial deposit: ${money(payment.depositCents)}.` : "",
        payment.latePaymentTerms ?? "",
      ]
        .filter(Boolean)
        .join(" ");
      if (accepted) paragraph(accepted);
    }

    // 3. Timeline
    if (layout.showTimeline && (content.agreement.startDate || content.agreement.endDate)) {
      section("Project Timeline");
      const start = content.agreement.startDate ? parseDate(content.agreement.startDate) : null;
      const end = content.agreement.endDate ? parseDate(content.agreement.endDate) : null;
      if (start) paragraph(`Project start: ${formatLongDate(start)}`);
      if (end) paragraph(`Expected delivery: ${formatLongDate(end)}`);
      if (content.agreement.timelineNote) {
        doc.y += 14;
        paragraph(content.agreement.timelineNote);
      }
    }

    // Clauses, each as its own numbered section
    const terms = content.terms as unknown as Record<string, unknown>;
    for (const key of orderedContractClauses(content)) {
      const text = terms[`${key}Enabled`] ? (terms[`${key}Text`] as string | undefined) : undefined;
      if (!text) continue;
      section(contractClauseTitle(content, key));
      body(text);
    }

    // Signatures
    ensureSpace(190);
    section("Signatures");
    paragraph("IN WITNESS WHEREOF, the parties have executed this Agreement as of the Effective Date.");
    doc.y += 30;
    const sigY = doc.y + 18;
    const sigW = 215;
    [
      { x: LEFT, name: provider.name || providerName, role: `${labels.provider} representative` },
      { x: LEFT + CONTENT_W - sigW, name: client.name || clientName, role: `${labels.client} representative` },
    ].forEach((s) => {
      doc.moveTo(s.x, sigY).lineTo(s.x + sigW, sigY).strokeColor("#b8b9c2").lineWidth(0.7).stroke();
      doc.font(SEMIBOLD).fontSize(8.6).fillColor(INK).text(s.name, s.x, sigY + 7, { width: sigW, lineBreak: false });
      doc.font(REGULAR).fontSize(7.6).fillColor("#6b6f85").text(s.role, s.x, sigY + 20, { width: sigW, lineBreak: false });
      doc.text("Date:", s.x, sigY + 38, { width: 40, lineBreak: false });
      doc.moveTo(s.x + 30, sigY + 47).lineTo(s.x + 130, sigY + 47).strokeColor("#b8b9c2").lineWidth(0.7).stroke();
    });

    doc.end();
    const buffer = await done;

    const safeTitle = title.replace(/[^a-zA-Z0-9-_]/g, "_");
    return { buffer, filename: `${safeTitle}-v${input.version}.pdf` };
  }
}

interface Run {
  text: string;
  bold?: boolean;
  color?: string;
}

/** Splits `**bold**` and `{{accent:text}}` markup into styled runs. */
function parseInline(text: string): Run[] {
  const out: Run[] = [];
  for (const part of text.split(/(\*\*[^*]+\*\*|\{\{accent:[^}]+\}\})/)) {
    if (!part) continue;
    if (part.startsWith("**")) out.push({ text: part.slice(2, -2), bold: true });
    else if (part.startsWith("{{accent:")) out.push({ text: part.slice(9, -2), bold: true, color: ACCENT });
    else out.push({ text: part });
  }
  return out;
}

/**
 * "deposit due upon signing" + 25% of total  ->  "**25% deposit ($75)** due upon signing".
 * Items whose name has no "due" phrase are shown as "name: **$amount**".
 */
function scheduleLine(name: string, amountCents: number, totalCents: number, money: (c: number) => string): string {
  const dueAt = name.search(/\bdue\b/i);
  if (dueAt < 0 || totalCents <= 0) return `${name}: **${money(amountCents)}**`;
  const head = name.slice(0, dueAt).trim();
  const tail = name.slice(dueAt).trim();
  const pct = Math.round((amountCents / totalCents) * 100);
  const lead = head ? `${pct}% ${head} (${money(amountCents)})` : `${pct}% (${money(amountCents)})`;
  return `**${lead}** ${tail}`;
}

/** The signature wavy rule under the page header. */
function wave(doc: PDFKit.PDFDocument, x: number, y: number, width: number) {
  const amplitude = 1.7;
  const wavelength = 9;
  doc.moveTo(x, y);
  for (let dx = 0; dx <= width; dx += 0.75) {
    doc.lineTo(x + dx, y + amplitude * Math.sin((dx / wavelength) * 2 * Math.PI));
  }
  doc.strokeColor(WAVE).lineWidth(1.1).stroke();
}

function parseDate(value?: string): Date {
  const d = value ? new Date(value) : new Date();
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

function formatLongDate(d: Date): string {
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

function formatMoney(cents: number, currency = "USD"): string {
  const amount = (cents || 0) / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
  }).format(amount);
}
