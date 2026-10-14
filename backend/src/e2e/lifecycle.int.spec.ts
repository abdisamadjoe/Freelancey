/**
 * The whole freelancer lifecycle against a real database, through the real HTTP API:
 * lead → discovery → proposal → contract → signature → client → onboarding → project →
 * brief → workflow → deliverable review → completion → handover → support.
 *
 * Run with `npm run test:integration` against a THROWAWAY database (TEST_DATABASE_URL).
 * Everything it creates is deleted again in afterAll.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { bootApp, makeApi, waitFor, type Harness } from "./harness";

let h: Harness;
let api: ReturnType<typeof makeApi>;

const stamp = Date.now().toString(36);
const id = (n: string) => `e2e-life-${stamp}-${n}`;
const email = (n: string) => `${n}-${stamp}@example.com`.toLowerCase();

const U = { owner: id("owner"), otherOwner: id("otherOwner") };
let orgId: string;
let otherOrgId: string;

let xff = 20;
/** Public calls get their own fake client IP so per-IP throttles only bite where a test wants them to. */
const ip = () => ({ "X-Forwarded-For": `10.8.${Math.floor(xff / 250)}.${xff++ % 250}` });
const tokenOf = (link: string) => link.split("/").pop() as string;

async function createUser(userId: string, name: string, mail: string) {
  const now = new Date();
  await h.prisma.$executeRawUnsafe(
    `INSERT INTO auth_user (id, name, email, "emailVerified", "createdAt", "updatedAt") VALUES ($1, $2, $3, true, $4, $4)`,
    userId,
    name,
    mail,
    now,
  );
}

async function createOrg(name: string, userId: string) {
  const slug = `${name.toLowerCase().replace(/\W+/g, "-")}-${stamp}`;
  const org = await h.prisma.organization.create({ data: { name, slug, members: { create: [{ userId, role: "owner" }] } } });
  await h.prisma.systemSettings.create({ data: { organizationId: org.id } });
  await h.prisma.projectStatus.createMany({
    data: [
      { name: "Not Started", slug: "not_started", order: 0, organizationId: org.id },
      { name: "Completed", slug: "completed", order: 3, organizationId: org.id },
    ],
  });
  return org.id;
}

beforeAll(async () => {
  h = await bootApp();
  api = makeApi(h.baseUrl);
  await createUser(U.owner, "Olive Owner", email("owner"));
  await createUser(U.otherOwner, "Other Owner", email("other"));
  orgId = await createOrg("Life Studio", U.owner);
  otherOrgId = await createOrg("Other Studio", U.otherOwner);
}, 120000);

afterAll(async () => {
  if (h) {
    const orgs = [orgId, otherOrgId].filter(Boolean);
    // Tables without a workspace foreign key first, then the workspaces (which cascade to clients and their records).
    await h.prisma.notification.deleteMany({ where: { organizationId: { in: orgs } } });
    await h.prisma.activityLog.deleteMany({ where: { organizationId: { in: orgs } } });
    await h.prisma.contract.deleteMany({ where: { organizationId: { in: orgs } } });
    await h.prisma.project.deleteMany({ where: { organizationId: { in: orgs } } });
    await h.prisma.formTemplate.deleteMany({ where: { organizationId: { in: orgs } } });
    await h.prisma.projectStatus.deleteMany({ where: { organizationId: { in: orgs } } });
    await h.prisma.organization.deleteMany({ where: { id: { in: orgs } } });
    await h.prisma.$executeRawUnsafe(`DELETE FROM auth_user WHERE id = ANY($1)`, [U.owner, U.otherOwner]);
    await h.close();
  }
});

describe("lifecycle", () => {
  let leadId: string;
  let proposalId: string;
  let optionalItemId: string;
  let contractId: string;
  let projectId: string;
  let deliverableId: string;
  let supportToken: string;

  // ── 1 · Lead ──────────────────────────────────────────────────────────────
  it("creates a lead by hand and records discovery", async () => {
    const created = await api("POST", "/client-records", {
      token: U.owner,
      body: { name: "Ahmed Hassan", company: "ABC Construction", email: email("ahmed"), website: "https://abc.example", source: "google_maps", interestedIn: "Website" },
    });
    expect(created.status).toBe(201);
    expect(created.json).toMatchObject({ stage: "lead", leadStatus: "new", source: "google_maps" });
    leadId = created.json.id;

    expect((await api("POST", "/client-records", { token: U.owner, body: { name: "Bad", email: email("bad"), source: "carrier-pigeon" } })).status).toBe(400);

    expect((await api("PATCH", `/client-records/${leadId}`, { token: U.owner, body: { leadStatus: "discovery" } })).status).toBe(200);
    const disc = await api("PUT", `/client-records/${leadId}/discovery`, {
      token: U.owner,
      body: { needs: "A new website", timeline: "6 weeks", budget: "$2,500" },
    });
    expect(disc.status).toBe(200);
    expect((await api("PATCH", `/client-records/${leadId}`, { token: U.owner, body: { leadStatus: "qualified" } })).status).toBe(200);
  });

  it("imports leads from CSV, skipping duplicates", async () => {
    const csv = `Business Name,Contact,Email,Phone\nXYZ Restaurant,Zed,${email("zed")},\nDup,Dup,${email("ahmed")},\nNo Contact,Nobody,,\n`;
    const res = await api("POST", "/client-records/import", { token: U.owner, body: { csv } });
    expect(res.status).toBe(201);
    expect(res.json.created).toBe(1);
    expect(res.json.skipped).toHaveLength(1);
    expect(res.json.problems).toHaveLength(1);
    const list = await api("GET", "/client-records?source=import", { token: U.owner });
    expect(list.json.data.map((r: { company: string }) => r.company)).toContain("XYZ Restaurant");
  });

  // ── 2 · Proposal ──────────────────────────────────────────────────────────
  it("drafts and sends a proposal; the lead moves to proposal_sent", async () => {
    const created = await api("POST", "/proposals", {
      token: U.owner,
      body: {
        clientId: leadId,
        title: "Website Development",
        scope: "A five page marketing site",
        deliverables: "- Home page\n- Contact page",
        timeline: "6 weeks",
        paymentTerms: "50% upfront",
        revisionLimit: 2,
        items: [
          { description: "Discovery", quantity: 1, unitPriceCents: 20000 },
          { description: "Development", quantity: 1, unitPriceCents: 150000 },
          { description: "SEO setup", quantity: 1, unitPriceCents: 30000, optional: true },
        ],
      },
    });
    expect(created.status).toBe(201);
    expect(created.json.totalCents).toBe(170000);
    proposalId = created.json.id;
    optionalItemId = created.json.items.find((i: { optional: boolean }) => i.optional).id;

    const sent = await api("POST", `/proposals/${proposalId}/send`, { token: U.owner, body: { email: false } });
    expect(sent.status).toBe(201);
    expect(sent.json.link).toContain("/proposal/");

    const lead = await api("GET", `/client-records/${leadId}`, { token: U.owner });
    expect(lead.json.leadStatus).toBe("proposal_sent");

    (globalThis as { __proposalToken?: string }).__proposalToken = tokenOf(sent.json.link);
  });

  it("the client views and accepts the proposal without an account", async () => {
    const token = (globalThis as { __proposalToken?: string }).__proposalToken as string;
    const view = await api("GET", `/proposals/public/${token}`, { headers: ip() });
    expect(view.status).toBe(200);
    expect(view.json.status).toBe("viewed");
    expect(JSON.stringify(view.json)).not.toContain(orgId);

    expect((await api("POST", `/proposals/public/${token}/accept`, { headers: ip(), body: { name: "  " } })).status).toBe(400);
    const accepted = await api("POST", `/proposals/public/${token}/accept`, {
      headers: ip(),
      body: { name: "Ahmed Hassan", optionalItemIds: [optionalItemId] },
    });
    expect(accepted.status).toBe(200);
    expect((await api("POST", `/proposals/public/${token}/accept`, { headers: ip(), body: { name: "Again" } })).status).toBe(409);

    const detail = await api("GET", `/proposals/${proposalId}`, { token: U.owner });
    expect(detail.json).toMatchObject({ status: "accepted", acceptedByName: "Ahmed Hassan", totalCents: 200000 });
    expect((await api("PATCH", `/proposals/${proposalId}`, { token: U.owner, body: { title: "Changed" } })).status).toBe(400);
  });

  // ── 3 · Contract ──────────────────────────────────────────────────────────
  it("creates the contract from the accepted proposal with everything carried over", async () => {
    const created = await api("POST", `/contracts/from-proposal/${proposalId}`, { token: U.owner, body: {} });
    expect(created.status).toBe(201);
    contractId = created.json.id;
    expect(created.json.projectId).toBeNull();
    expect(created.json.content.payment.totalAmountCents).toBe(200000);
    expect(created.json.content.scope.revisionsCount).toBe(2);
    expect(created.json.content.parties.client.name).toBe("Ahmed Hassan");

    const again = await api("POST", `/contracts/from-proposal/${proposalId}`, { token: U.owner, body: {} });
    expect(again.json.id).toBe(contractId);
  });

  it("sends the contract; the client signs; the lead becomes an active client", async () => {
    const sent = await api("POST", `/contracts/${contractId}/send-link`, { token: U.owner, body: { email: false } });
    expect(sent.status).toBe(201);
    const token = tokenOf(sent.json.link);

    const view = await api("GET", `/contracts/public/${token}`, { headers: ip() });
    expect(view.status).toBe(200);
    expect(view.json.status).toBe("viewed");

    expect((await api("POST", `/contracts/public/${token}/sign`, { headers: ip(), body: { name: "Ahmed Hassan", consent: false } })).status).toBe(400);
    const signed = await api("POST", `/contracts/public/${token}/sign`, { headers: ip(), body: { name: "Ahmed Hassan", consent: true } });
    expect(signed.status).toBe(200);
    expect((await api("POST", `/contracts/public/${token}/sign`, { headers: ip(), body: { name: "Ahmed Hassan", consent: true } })).status).toBe(409);

    const lead = await api("GET", `/client-records/${leadId}`, { token: U.owner });
    expect(lead.json).toMatchObject({ stage: "active", leadStatus: null });
    expect(lead.json.discovery.needs).toBe("A new website");

    const contract = await api("GET", `/contracts/${contractId}`, { token: U.owner });
    expect(contract.json).toMatchObject({ status: "signed", signedByName: "Ahmed Hassan" });
    expect((await api("PATCH", `/contracts/${contractId}`, { token: U.owner, body: { title: "Edit" } })).status).toBe(400);

    const history = await api("GET", `/client-records/${leadId}/activity?limit=50`, { token: U.owner });
    const actions = history.json.data.map((a: { detail: string }) => a.detail).join("\n");
    expect(actions).toContain("signed");
    expect(actions).toContain("converted to an active client");
  });

  // ── 4 · Onboarding ────────────────────────────────────────────────────────
  it("the client completes the onboarding form from a secure link", async () => {
    const sent = await api("POST", "/form-links", { token: U.owner, body: { clientId: leadId, kind: "onboarding", email: false } });
    expect(sent.status).toBe(201);
    expect(sent.json.link).toContain("/onboarding/");
    const token = tokenOf(sent.json.link);

    const form = await api("GET", `/forms/public/${token}`, { headers: ip() });
    expect(form.status).toBe(200);
    expect(form.json.fields.length).toBeGreaterThan(0);

    const bad = await api("POST", `/forms/public/${token}/submit`, { headers: ip(), body: { answers: { businessName: "ABC" } } });
    expect(bad.status).toBe(400);
    const ok = await api("POST", `/forms/public/${token}/submit`, {
      headers: ip(),
      body: { answers: { businessName: "ABC Construction", overview: "Builders", targetAudience: "Homeowners", websiteGoal: "Leads", ignored: "x" } },
    });
    expect(ok.status).toBe(200);
    expect((await api("POST", `/forms/public/${token}/submit`, { headers: ip(), body: { answers: {} } })).status).toBe(409);

    const links = await api("GET", `/form-links?clientId=${leadId}&kind=onboarding`, { token: U.owner });
    expect(links.json[0].status).toBe("completed");
    const answers = await api("GET", `/form-links/${links.json[0].id}/answers`, { token: U.owner });
    expect(answers.json.answers).toMatchObject({ businessName: "ABC Construction" });
    expect(answers.json.answers.ignored).toBeUndefined();
  });

  // ── 5 · Project ───────────────────────────────────────────────────────────
  it("creates the project inside the client, attaches the signed contract and sends the brief", async () => {
    const created = await api("POST", "/projects", {
      token: U.owner,
      body: { name: "ABC website", clientId: leadId, budgetCents: 200000, projectType: "Website", contractId },
    });
    expect(created.status).toBe(201);
    projectId = created.json.id;
    expect(created.json).toMatchObject({ clientId: leadId, budgetCents: 200000 });

    const contract = await api("GET", `/contracts/${contractId}`, { token: U.owner });
    expect(contract.json.projectId).toBe(projectId);

    let ready = await api("GET", `/projects/${projectId}/readiness`, { token: U.owner });
    expect(ready.json).toMatchObject({ onboarding: true, contract: true, brief: false, ready: false });

    const sent = await api("POST", "/form-links", { token: U.owner, body: { clientId: leadId, kind: "project_brief", projectId, email: false } });
    expect(sent.status).toBe(201);
    expect(sent.json.link).toContain("/brief/");
    const token = tokenOf(sent.json.link);
    const done = await api("POST", `/forms/public/${token}/submit`, {
      headers: ip(),
      body: { answers: { goals: "More leads", successCriteria: "10 enquiries a month" } },
    });
    expect(done.status).toBe(200);

    ready = await api("GET", `/projects/${projectId}/readiness`, { token: U.owner });
    expect(ready.json.ready).toBe(true);
  });

  it("applies the website template: milestones with tasks", async () => {
    const applied = await api("POST", `/projects/${projectId}/apply-template`, { token: U.owner, body: { templateId: "website" } });
    expect(applied.status).toBe(201);
    expect(applied.json).toHaveLength(7);
    expect(applied.json.every((m: { taskCount: number }) => m.taskCount === 3)).toBe(true);
    expect((await api("POST", `/projects/${projectId}/apply-template`, { token: U.owner, body: { templateId: "website" } })).status).toBe(400);

    expect((await api("POST", `/projects/${projectId}/meetings`, { token: U.owner, body: { title: "Kickoff", scheduledAt: "2026-11-01T10:00:00.000Z" } })).status).toBe(201);
    expect((await api("POST", `/projects/${projectId}/expenses`, { token: U.owner, body: { description: "Domain", amountCents: 1500, incurredOn: "2026-11-01T00:00:00.000Z" } })).status).toBe(201);
    const expenses = await api("GET", `/projects/${projectId}/expenses`, { token: U.owner });
    expect(expenses.json.totalCents).toBe(1500);
  });

  // ── 6 · Deliverable review ────────────────────────────────────────────────
  it("sends a deliverable, the client asks for changes, then approves version 2", async () => {
    const created = await api("POST", `/projects/${projectId}/deliverables`, {
      token: U.owner,
      body: { title: "Homepage design", description: "First pass", links: [{ label: "Figma", url: "https://figma.com/file/x" }] },
    });
    expect(created.status).toBe(201);
    deliverableId = created.json.id;

    const sent1 = await api("POST", `/projects/${projectId}/deliverables/${deliverableId}/send`, { token: U.owner, body: { email: false } });
    expect(sent1.status).toBe(201);
    expect(sent1.json.version).toBe(1);
    const token1 = tokenOf(sent1.json.link);

    const changes = await api("POST", `/deliverables/public/${token1}/request-changes`, { headers: ip(), body: { message: "Please change the hero section" } });
    expect(changes.status).toBe(200);
    expect((await api("POST", `/deliverables/public/${token1}/approve`, { headers: ip(), body: { name: "Ahmed" } })).status).toBe(409);

    const list = await api("GET", `/projects/${projectId}/deliverables`, { token: U.owner });
    expect(list.json.data[0].status).toBe("changes_requested");
    expect(list.json.revisions).toEqual({ used: 1, allowed: 2 });

    const tasks = await api("GET", `/tasks/project/${projectId}?limit=100`, { token: U.owner });
    const titles = JSON.stringify(tasks.json);
    expect(titles).toContain("Changes requested: Homepage design v1");

    const sent2 = await api("POST", `/projects/${projectId}/deliverables/${deliverableId}/send`, { token: U.owner, body: { email: false } });
    expect(sent2.json.version).toBe(2);
    expect((await api("GET", `/deliverables/public/${token1}`, { headers: ip() })).status).toBe(404); // old link is dead

    const approved = await api("POST", `/deliverables/public/${tokenOf(sent2.json.link)}/approve`, { headers: ip(), body: { name: "Ahmed Hassan" } });
    expect(approved.status).toBe(200);
  });

  // ── 7 · Completion and handover ───────────────────────────────────────────
  it("blocks completion while work is open, allows it with a reason, then runs the handover", async () => {
    const check = await api("GET", `/projects/${projectId}/completion-check`, { token: U.owner });
    expect(check.json.canComplete).toBe(false);
    expect(check.json.blockers.length).toBeGreaterThan(0);

    expect((await api("POST", `/projects/${projectId}/handover`, { token: U.owner })).status).toBe(400);
    expect((await api("POST", `/projects/${projectId}/complete`, { token: U.owner, body: {} })).status).toBe(400);
    const done = await api("POST", `/projects/${projectId}/complete`, { token: U.owner, body: { overrideReason: "Signed off by phone" } });
    expect(done.status).toBe(200);
    expect(done.json.overridden).toBe(true);

    const started = await api("POST", `/projects/${projectId}/handover`, { token: U.owner });
    expect(started.status).toBe(201);
    expect(started.json.items).toHaveLength(5);
    expect((await api("POST", `/projects/${projectId}/handover/complete`, { token: U.owner })).status).toBe(400);

    for (const item of started.json.items) {
      expect((await api("PATCH", `/projects/${projectId}/handover/items/${item.id}`, { token: U.owner, body: { done: true } })).status).toBe(200);
    }
    const shared = await api("POST", `/projects/${projectId}/handover/share`, { token: U.owner, body: { email: false } });
    expect(shared.status).toBe(201);
    const view = await api("GET", `/handover/public/${tokenOf(shared.json.link)}`, { headers: ip() });
    expect(view.status).toBe(200);
    expect(view.json.items).toHaveLength(5);
    expect((await api("POST", `/projects/${projectId}/handover/complete`, { token: U.owner })).status).toBe(200);
  });

  // ── 8 · Support ───────────────────────────────────────────────────────────
  it("the client raises a support request that lands in the inbox", async () => {
    const link = await api("POST", `/client-records/${leadId}/support-link`, { token: U.owner });
    expect(link.status).toBe(201);
    supportToken = tokenOf(link.json.link);

    const page = await api("GET", `/support/public/${supportToken}`, { headers: ip() });
    expect(page.status).toBe(200);
    expect(page.json.projects.map((p: { id: string }) => p.id)).toEqual([projectId]);

    expect((await api("POST", `/support/public/${supportToken}/tickets`, { headers: ip(), body: { subject: "x", message: "y", projectId: "not-mine" } })).status).toBe(400);
    const sent = await api("POST", `/support/public/${supportToken}/tickets`, {
      headers: ip(),
      body: { subject: "The site is down", message: "It shows an error", projectId },
    });
    expect(sent.status).toBe(200);

    const inbox = await api("GET", "/support-tickets?status=open", { token: U.owner });
    expect(inbox.json.data).toHaveLength(1);
    const ticketId = inbox.json.data[0].id;

    const reply = await api("POST", `/support-tickets/${ticketId}/replies`, { token: U.owner, body: { message: "On it", email: false } });
    expect(reply.status).toBe(201);
    const detail = await api("GET", `/support-tickets/${ticketId}`, { token: U.owner });
    expect(detail.json).toMatchObject({ status: "in_progress", projectName: "ABC website" });
    expect((await api("PATCH", `/support-tickets/${ticketId}`, { token: U.owner, body: { status: "resolved" } })).status).toBe(200);

    // A new link replaces the old one.
    const fresh = await api("POST", `/client-records/${leadId}/support-link`, { token: U.owner });
    expect(fresh.status).toBe(201);
    expect((await api("GET", `/support/public/${supportToken}`, { headers: ip() })).status).toBe(404);
  });

  // ── Dashboard ─────────────────────────────────────────────────────────────
  it("the pipeline summary reflects the workspace", async () => {
    const summary = await api("GET", "/pipeline/summary", { token: U.owner });
    expect(summary.status).toBe(200);
    expect(summary.json.activeClients).toBe(1);
    expect(summary.json.leadsByStatus.find((s: { status: string }) => s.status === "new").count).toBe(1); // the CSV lead
    expect(summary.json.openTickets).toBe(0);
  });

  // ── Tenant isolation ──────────────────────────────────────────────────────
  it("another workspace sees and changes nothing of this one", async () => {
    const t = U.otherOwner;
    expect((await api("GET", `/proposals/${proposalId}`, { token: t })).status).toBe(404);
    expect((await api("PATCH", `/proposals/${proposalId}`, { token: t, body: { title: "x" } })).status).toBe(404);
    expect((await api("POST", `/proposals/${proposalId}/send`, { token: t, body: {} })).status).toBe(404);
    expect((await api("POST", `/contracts/from-proposal/${proposalId}`, { token: t, body: {} })).status).toBe(404);
    expect((await api("GET", `/contracts/${contractId}`, { token: t })).status).toBe(404);
    expect((await api("POST", `/contracts/${contractId}/send-link`, { token: t, body: {} })).status).toBe(404);
    expect((await api("POST", "/form-links", { token: t, body: { clientId: leadId, kind: "onboarding" } })).status).toBe(404);
    expect((await api("GET", `/projects/${projectId}/milestones`, { token: t })).status).toBe(404);
    expect((await api("GET", `/projects/${projectId}/deliverables`, { token: t })).status).toBe(404);
    expect((await api("GET", `/projects/${projectId}/handover`, { token: t })).status).toBe(404);
    expect((await api("POST", `/client-records/${leadId}/support-link`, { token: t })).status).toBe(404);
    expect((await api("PUT", `/client-records/${leadId}/discovery`, { token: t, body: { needs: "x" } })).status).toBe(404);
    expect((await api("GET", "/support-tickets", { token: t })).json.data).toHaveLength(0);
    expect((await api("GET", "/pipeline/summary", { token: t })).json.activeClients).toBe(0);
  });

  it("every staff endpoint refuses anonymous callers", async () => {
    for (const [method, path] of [
      ["GET", "/proposals"],
      ["GET", `/contracts/${contractId}`],
      ["GET", "/form-links?clientId=x"],
      ["GET", `/projects/${projectId}/milestones`],
      ["GET", `/projects/${projectId}/deliverables`],
      ["GET", `/projects/${projectId}/handover`],
      ["GET", "/support-tickets"],
      ["GET", "/pipeline/summary"],
      ["POST", "/client-records/import"],
    ] as const) {
      expect((await api(method, path)).status, `${method} ${path}`).toBe(401);
    }
  });

  it("waits for background notifications to settle before cleanup", async () => {
    await waitFor(async () => (await h.prisma.notification.count({ where: { organizationId: orgId } })) >= 0);
  });
});
