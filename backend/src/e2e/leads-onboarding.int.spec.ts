import { execFileSync } from "child_process";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { bootApp, makeApi, waitFor, type Harness } from "./harness";
import { LeadFollowUpTask } from "../client-records/lead-follow-up.task";

let h: Harness;
let api: ReturnType<typeof makeApi>;

const stamp = Date.now().toString(36);
const id = (n: string) => `e2e-${stamp}-${n}`;
const email = (n: string) => `${n}-${stamp}@example.com`.toLowerCase();

const U = {
  ownerA: id("ownerA"),
  adminA: id("adminA"),
  clientA: id("clientA"), // becomes a portal client of org A through an invitation
  ownerB: id("ownerB"),
  clientB: id("clientB"),
};
let orgA: string;
let orgB: string;
let slugA: string;

async function createUser(userId: string, name: string, mail: string) {
  const now = new Date();
  await h.prisma.$executeRawUnsafe(
    `INSERT INTO neon_auth."user" (id, name, email, "emailVerified", "createdAt", "updatedAt") VALUES ($1, $2, $3, true, $4, $4)`,
    userId, name, mail, now,
  );
}

async function createOrg(name: string, members: { userId: string; role: string }[]) {
  const slug = `${name.toLowerCase().replace(/\W+/g, "-")}-${stamp}`;
  const org = await h.prisma.organization.create({ data: { name, slug, members: { create: members } } });
  await h.prisma.systemSettings.create({ data: { organizationId: org.id } });
  return { id: org.id, slug };
}

let xff = 10;
/** Every public-form call gets its own fake client IP so the per-IP throttle only bites where a test wants it to. */
const freshIp = () => ({ "X-Forwarded-For": `10.9.${Math.floor(xff / 250)}.${xff++ % 250}` });

beforeAll(async () => {
  h = await bootApp();
  api = makeApi(h.baseUrl);
  await createUser(U.ownerA, "Olive Owner", email("ownerA"));
  await createUser(U.adminA, "Adam Admin", email("adminA"));
  await createUser(U.clientA, "Kim Client", email("clientA"));
  await createUser(U.ownerB, "Bob Owner", email("ownerB"));
  await createUser(U.clientB, "Bea Client", email("clientB"));
  const a = await createOrg("Studio A", [
    { userId: U.ownerA, role: "owner" },
    { userId: U.adminA, role: "admin" },
  ]);
  const b = await createOrg("Studio B", [
    { userId: U.ownerB, role: "owner" },
    { userId: U.clientB, role: "member" },
  ]);
  orgA = a.id;
  slugA = a.slug;
  orgB = b.id;
}, 120000);

afterAll(async () => {
  await h?.close();
});

// ─────────────────────────────────────────────────────────────────────────────
describe("access control on the new endpoints", () => {
  it("staff only: clients get 403 on leads, anonymous gets 401", async () => {
    expect((await api("GET", "/client-records")).status).toBe(401);
    // clientB is a portal client of org B
    expect((await api("GET", "/client-records", { token: U.clientB })).status).toBe(403);
    expect((await api("POST", "/client-records", { token: U.clientB, body: { name: "x", email: "x@x.com" } })).status).toBe(403);
    expect((await api("GET", "/client-records/lead-form", { token: U.clientB })).status).toBe(403);
    expect((await api("GET", "/client-records", { token: U.ownerA })).status).toBe(200);
    expect((await api("GET", "/client-records", { token: U.adminA })).status).toBe(200);
  });

  it("the lead-form route is not swallowed by /:id", async () => {
    const res = await api("GET", "/client-records/lead-form", { token: U.ownerA });
    expect(res.status).toBe(200);
    expect(res.json).toMatchObject({ enabled: false, slug: slugA });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("lead CRUD and tenant isolation", () => {
  let leadId: string;
  let foreignLeadId: string;

  it("validates input: a contact method is required, unknown fields are rejected", async () => {
    expect((await api("POST", "/client-records", { token: U.ownerA, body: { name: "No contact" } })).status).toBe(400);
    expect((await api("POST", "/client-records", { token: U.ownerA, body: { name: "", email: "a@b.com" } })).status).toBe(400);
    expect((await api("POST", "/client-records", { token: U.ownerA, body: { name: "X", email: "a@b.com", organizationId: orgB } })).status).toBe(400);
    expect((await api("POST", "/client-records", { token: U.ownerA, body: { name: "X", email: "not-an-email" } })).status).toBe(400);
    expect((await api("POST", "/client-records", { token: U.ownerA, body: { name: "X", whatsapp: "+254700", stage: "bogus" } })).status).toBe(400);
  });

  it("creates a lead with only WhatsApp, owned by the creator, with a timeline entry", async () => {
    const res = await api("POST", "/client-records", {
      token: U.ownerA,
      body: { name: "Wanjiru", whatsapp: "+254700111222", source: "Referral", estimatedBudgetCents: 250000 },
    });
    expect(res.status).toBe(201);
    expect(res.json).toMatchObject({ stage: "lead", leadStatus: "new", organizationId: orgA, ownerId: U.ownerA });
    leadId = res.json.id;

    const act = await api("GET", `/client-records/${leadId}/activity`, { token: U.ownerA });
    expect(act.status).toBe(200);
    expect(act.json.data.map((a: any) => a.action)).toContain("created");
    expect(act.json.data[0].actor.name).toBe("Olive Owner");
  });

  it("lists, filters by stage / lead status / search, and sorts due follow-ups first", async () => {
    const soon = new Date(Date.now() + 3 * 86400_000).toISOString();
    const past = new Date(Date.now() - 86400_000).toISOString();
    await api("POST", "/client-records", { token: U.ownerA, body: { name: "Later Lead", email: email("later"), nextFollowUpAt: soon } });
    await api("POST", "/client-records", { token: U.ownerA, body: { name: "Overdue Lead", email: email("overdue"), nextFollowUpAt: past } });

    const all = await api("GET", "/client-records?stage=lead&limit=50", { token: U.ownerA });
    const names = all.json.data.map((r: any) => r.name);
    expect(names.indexOf("Overdue Lead")).toBeLessThan(names.indexOf("Later Lead"));
    expect(names.indexOf("Later Lead")).toBeLessThan(names.indexOf("Wanjiru")); // no follow-up sorts last

    const due = await api("GET", "/client-records?followUpDue=true", { token: U.ownerA });
    expect(due.json.data.map((r: any) => r.name)).toEqual(["Overdue Lead"]);

    const search = await api("GET", "/client-records?search=wanj", { token: U.ownerA });
    expect(search.json.data).toHaveLength(1);
    expect((await api("GET", "/client-records?stage=nonsense", { token: U.ownerA })).status).toBe(400);
  });

  it("never shows one workspace's leads, or lets it touch them, to another", async () => {
    const created = await api("POST", "/client-records", { token: U.ownerB, body: { name: "B Secret Lead", email: email("bsecret") } });
    foreignLeadId = created.json.id;

    const listA = await api("GET", "/client-records?limit=100", { token: U.ownerA });
    expect(listA.json.data.map((r: any) => r.name)).not.toContain("B Secret Lead");
    expect((await api("GET", `/client-records/${foreignLeadId}`, { token: U.ownerA })).status).toBe(404);
    expect((await api("PATCH", `/client-records/${foreignLeadId}`, { token: U.ownerA, body: { name: "hacked" } })).status).toBe(404);
    expect((await api("POST", `/client-records/${foreignLeadId}/archive`, { token: U.ownerA })).status).toBe(404);
    expect((await api("GET", `/client-records/${foreignLeadId}/activity`, { token: U.ownerA })).status).toBe(404);
    expect((await api("POST", `/client-records/${foreignLeadId}/activity`, { token: U.ownerA, body: { kind: "note", summary: "x" } })).status).toBe(404);
    expect((await api("GET", `/client-records/${foreignLeadId}/onboarding`, { token: U.ownerA })).status).toBe(404);
    expect((await api("POST", `/client-records/${foreignLeadId}/onboarding/start`, { token: U.ownerA, body: {} })).status).toBe(404);
    expect((await api("POST", `/client-records/${foreignLeadId}/onboarding/invite`, { token: U.ownerA, body: {} })).status).toBe(404);
    const untouched = await h.prisma.client.findUnique({ where: { id: foreignLeadId } });
    expect(untouched?.name).toBe("B Secret Lead");
  });

  it("status and stage changes follow the rules and leave a trail", async () => {
    expect((await api("PATCH", `/client-records/${leadId}`, { token: U.ownerA, body: { leadStatus: "contacted" } })).status).toBe(200);
    expect((await api("PATCH", `/client-records/${leadId}`, { token: U.ownerA, body: { stage: "lost" } })).status).toBe(400); // reason required
    const lost = await api("PATCH", `/client-records/${leadId}`, { token: U.ownerA, body: { stage: "lost", lostReason: "Budget" } });
    expect(lost.json).toMatchObject({ stage: "lost", leadStatus: null, lostReason: "Budget" });
    const reopened = await api("PATCH", `/client-records/${leadId}`, { token: U.ownerA, body: { stage: "lead" } });
    expect(reopened.json).toMatchObject({ stage: "lead", leadStatus: "new", lostReason: null });

    expect((await api("PATCH", `/client-records/${leadId}`, { token: U.ownerA, body: { whatsapp: null } })).status).toBe(400); // last contact method

    const act = await api("GET", `/client-records/${leadId}/activity`, { token: U.ownerA });
    const summaries = act.json.data.map((a: any) => a.detail).join("\n");
    expect(summaries).toContain("Lead status: new → contacted");
    expect(summaries).toContain("→ Lost (Budget)");
  });

  it("logs manual activity and validates its kind", async () => {
    expect((await api("POST", `/client-records/${leadId}/activity`, { token: U.ownerA, body: { kind: "system", summary: "spoof" } })).status).toBe(400);
    const ok = await api("POST", `/client-records/${leadId}/activity`, {
      token: U.adminA,
      body: { kind: "whatsapp", summary: "Sent intro", occurredAt: "2026-09-01T10:00:00.000Z" },
    });
    expect(ok.status).toBe(201);
    const act = await api("GET", `/client-records/${leadId}/activity`, { token: U.ownerA });
    expect(act.json.data.find((a: any) => a.kind === "whatsapp")).toMatchObject({ detail: "Sent intro", actor: { name: "Adam Admin" } });
  });

  it("archives and hides archived records unless asked", async () => {
    const r = await api("POST", "/client-records", { token: U.ownerA, body: { name: "To Archive", email: email("arch") } });
    await api("POST", `/client-records/${r.json.id}/archive`, { token: U.ownerA });
    const list = await api("GET", "/client-records?limit=100", { token: U.ownerA });
    expect(list.json.data.map((x: any) => x.name)).not.toContain("To Archive");
    const withArchived = await api("GET", "/client-records?limit=100&archived=true", { token: U.ownerA });
    expect(withArchived.json.data.map((x: any) => x.name)).toContain("To Archive");
    await api("POST", `/client-records/${r.json.id}/unarchive`, { token: U.ownerA });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("public lead form", () => {
  const payload = (over: Record<string, unknown> = {}) => ({ name: "Visitor", email: email(`v${xff}`), message: "Need a website", ...over });
  const post = (body: unknown, headers: Record<string, string> = freshIp()) => api("POST", `/leads/public/${slugA}`, { body, headers });

  it("is off by default and looks identical to an unknown workspace", async () => {
    expect((await post(payload())).status).toBe(404);
    expect((await api("GET", `/leads/public/${slugA}`)).status).toBe(404);
    expect((await api("GET", `/leads/public/does-not-exist-${stamp}`)).status).toBe(404);
    expect(await h.prisma.client.count({ where: { organizationId: orgA, source: "website form" } })).toBe(0);
  });

  it("only owners and admins can switch it on", async () => {
    expect((await api("PUT", "/client-records/lead-form", { token: U.clientB, body: { enabled: true } })).status).toBe(403);
    expect((await api("PUT", "/client-records/lead-form", { token: U.ownerA, body: { enabled: "yes" } })).status).toBe(400);
    const on = await api("PUT", "/client-records/lead-form", { token: U.ownerA, body: { enabled: true } });
    expect(on.json).toMatchObject({ enabled: true, slug: slugA });
  });

  it("serves only public-safe info for the form", async () => {
    const res = await api("GET", `/leads/public/${slugA}`);
    expect(res.status).toBe(200);
    expect(Object.keys(res.json).sort()).toEqual(["logoUrl", "name", "primaryColor"]);
    expect(res.json.name).toBe("Studio A");
  });

  it("creates a lead in the right workspace, sets tomorrow's follow-up and notifies the admins", async () => {
    const mail = email("formlead");
    const res = await post(payload({ name: "Form Lead", email: mail, budget: "$2k", interestedIn: "Website", message: "Hello there" }));
    expect(res.status).toBe(201);
    expect(res.json).toEqual({ ok: true });

    const lead = await h.prisma.client.findFirst({ where: { email: mail } });
    expect(lead).toMatchObject({ organizationId: orgA, stage: "lead", leadStatus: "new", source: "website form" });
    const followUp = lead!.nextFollowUpAt!.getTime() - Date.now();
    expect(followUp).toBeGreaterThan(23 * 3600_000);
    expect(followUp).toBeLessThan(25 * 3600_000);

    const acts = await h.prisma.activityLog.findMany({ where: { clientId: lead!.id } });
    expect(acts.map((a) => a.actorId)).toContain("public");
    expect(acts.find((a) => a.action === "form_submitted")!.detail).toContain("Hello there");

    const notes = await waitFor(async () => {
      const rows = await h.prisma.notification.findMany({ where: { organizationId: orgA, type: "new_lead", link: `/dashboard/leads/${lead!.id}` } });
      return rows.length >= 2 ? rows : null;
    });
    expect(notes.map((n) => n.userId).sort()).toEqual([U.adminA, U.ownerA].sort());
    expect(await h.prisma.notification.count({ where: { organizationId: orgB, type: "new_lead" } })).toBe(0);
  });

  it("dedupes by email: a second submission adds to the timeline instead of creating a record", async () => {
    const mail = email("dupe");
    await post(payload({ name: "Dupe", email: mail, message: "first" }));
    await post(payload({ name: "Dupe Again", email: mail.toUpperCase(), message: "second" }));
    const rows = await h.prisma.client.findMany({ where: { organizationId: orgA, email: mail } });
    expect(rows).toHaveLength(1);
    const acts = await h.prisma.activityLog.findMany({ where: { clientId: rows[0].id, action: "form_submitted" } });
    expect(acts).toHaveLength(2);
  });

  it("silently drops bots, and rejects malformed or oversized input", async () => {
    const before = await h.prisma.client.count({ where: { organizationId: orgA } });
    expect((await post(payload({ hp: "i-am-a-bot" }))).json).toEqual({ ok: true });
    expect(await h.prisma.client.count({ where: { organizationId: orgA } })).toBe(before);

    expect((await post({ name: "No Contact" })).status).toBe(400);
    expect((await post(payload({ message: "x".repeat(3001) }))).status).toBe(400);
    expect((await post(payload({ organizationId: orgB }))).status).toBe(400); // tenant can never come from the body
    expect((await post(payload({ stage: "active" }))).status).toBe(400); // cannot pick a stage
    expect((await post(payload({ email: "nope" }))).status).toBe(400);
  });

  it("stores markup-free text only", async () => {
    const mail = email("xss");
    await post(payload({
      name: "<script>alert(1)</script>Eve",
      email: mail,
      company: "<img src=x onerror=alert(1)>Evil & Co",
      message: "<a href='http://evil.test'>click</a> Tom & Jerry",
    }));
    const lead = await h.prisma.client.findFirst({ where: { email: mail } });
    expect(lead!.name).toBe("Eve");
    expect(lead!.company).toBe("Evil & Co");
    const act = await h.prisma.activityLog.findFirst({ where: { clientId: lead!.id, action: "form_submitted" } });
    expect(act!.detail).not.toMatch(/<|href|script/);
    expect(act!.detail).toContain("Tom & Jerry");
  });

  it("is rate limited per client IP", async () => {
    const ip = { "X-Forwarded-For": "203.0.113.77" };
    const statuses: number[] = [];
    for (let i = 0; i < 7; i++) statuses.push((await post(payload({ email: email(`rl${i}`) }), ip)).status);
    expect(statuses.slice(0, 5).every((s) => s === 201)).toBe(true);
    expect(statuses.slice(5)).toEqual([429, 429]);
    // a different visitor is unaffected
    expect((await post(payload({ email: email("rl-other") }), { "X-Forwarded-For": "203.0.113.78" })).status).toBe(201);
  });

  it("can be switched off again", async () => {
    await api("PUT", "/client-records/lead-form", { token: U.ownerA, body: { enabled: false } });
    expect((await post(payload())).status).toBe(404);
    await api("PUT", "/client-records/lead-form", { token: U.ownerA, body: { enabled: true } });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("won client → project → onboarding → portal", () => {
  let clientRecordId: string;
  let projectId: string;
  let inviteId: string;
  const clientMail = () => email("clientA");

  it("marks a lead won and creates a project from it, without assigning anyone yet", async () => {
    const lead = await api("POST", "/client-records", { token: U.ownerA, body: { name: "Kim Client", company: "Kim Ltd", email: clientMail() } });
    clientRecordId = lead.json.id;
    expect((await api("PATCH", `/client-records/${clientRecordId}`, { token: U.ownerA, body: { stage: "active" } })).json.stage).toBe("active");

    const project = await api("POST", "/projects", { token: U.ownerA, body: { name: "Kim website", clientId: clientRecordId, startDate: "2026-10-01" } });
    expect(project.status).toBe(201);
    projectId = project.json.id;
    expect(project.json.clientId).toBe(clientRecordId);
    expect(project.json.clients).toEqual([]); // no login yet
  });

  it("refuses a project for another workspace's client", async () => {
    const foreign = await h.prisma.client.findFirstOrThrow({ where: { organizationId: orgB } });
    const res = await api("POST", "/projects", { token: U.ownerA, body: { name: "Steal", clientId: foreign.id } });
    expect(res.status).toBe(400);
    expect(await h.prisma.project.count({ where: { name: "Steal" } })).toBe(0);
  });

  it("starts onboarding once, with the four default steps", async () => {
    const started = await api("POST", `/client-records/${clientRecordId}/onboarding/start`, { token: U.ownerA, body: { projectId } });
    expect(started.status).toBe(201);
    expect(started.json.items.map((i: any) => i.kind)).toEqual(["sign_agreement", "pay_deposit", "intake", "upload_assets"]);
    expect(started.json.progress).toEqual({ done: 0, total: 4, complete: false });
    expect(started.json.intake.status).toBe("draft");
    expect(started.json.intake.fields.length).toBeGreaterThan(15);

    const again = await api("POST", `/client-records/${clientRecordId}/onboarding/start`, { token: U.ownerA, body: {} });
    expect(again.json.items).toHaveLength(4);
    expect(await h.prisma.onboardingItem.count({ where: { clientId: clientRecordId } })).toBe(4);
    expect(await h.prisma.formResponse.count({ where: { clientId: clientRecordId } })).toBe(1);
  });

  it("emails a project-specific invitation and remembers the contact", async () => {
    const res = await api("POST", `/client-records/${clientRecordId}/onboarding/invite`, { token: U.ownerA, body: { projectId } });
    expect(res.status).toBe(201);
    expect(res.json).toMatchObject({ status: "invited", email: clientMail() });
    const mail = h.mails.find((m) => m.to === clientMail());
    expect(mail?.html).toContain("Kim website");
    expect(mail?.html).toContain("/accept-invitation".replace("/accept-invitation", "/accept-invite?id="));
    const inv = await h.prisma.invitation.findFirstOrThrow({ where: { email: clientMail(), organizationId: orgA } });
    expect(inv).toMatchObject({ role: "member", status: "pending" });
    inviteId = inv.id;
    expect(res.json.inviteLink).toContain(inviteId);
    const contact = await h.prisma.clientContact.findFirstOrThrow({ where: { clientId: clientRecordId } });
    expect(contact).toMatchObject({ email: clientMail(), userId: null, isPrimary: true });
  });

  it("will not invite a team member, or someone without an email, as a client", async () => {
    const teamMail = email("adminA");
    const t = await api("POST", "/client-records", { token: U.ownerA, body: { name: "Adam", email: teamMail } });
    const res = await api("POST", `/client-records/${t.json.id}/onboarding/invite`, { token: U.ownerA, body: {} });
    expect(res.status).toBe(400);
    const noEmail = await api("POST", "/client-records", { token: U.ownerA, body: { name: "Phone Only", phone: "123" } });
    expect((await api("POST", `/client-records/${noEmail.json.id}/onboarding/invite`, { token: U.ownerA, body: {} })).status).toBe(400);
  });

  it("links the login, the project and a notification when the client accepts", async () => {
    // Someone else cannot accept it
    expect((await api("POST", "/organizations/accept-invitation", { token: U.clientB, body: { invitationId: inviteId } })).status).toBe(403);

    const res = await api("POST", "/organizations/accept-invitation", { token: U.clientA, body: { invitationId: inviteId } });
    expect(res.status).toBe(201);
    expect(res.json).toMatchObject({ organizationId: orgA, role: "member" });

    const contact = await h.prisma.clientContact.findFirstOrThrow({ where: { clientId: clientRecordId } });
    expect(contact.userId).toBe(U.clientA);
    expect(await h.prisma.projectClient.count({ where: { projectId, userId: U.clientA } })).toBe(1);

    const n = await waitFor(() => h.prisma.notification.findFirst({ where: { organizationId: orgA, type: "client_joined", userId: U.ownerA } }));
    expect(n.link).toBe(`/dashboard/leads/${clientRecordId}`);
    expect(await h.prisma.member.count({ where: { userId: U.clientA, organizationId: orgA, role: "member" } })).toBe(1);
  });

  it("new projects for this client are assigned to its login automatically", async () => {
    const p2 = await api("POST", "/projects", { token: U.ownerA, body: { name: "Kim phase 2", clientId: clientRecordId } });
    expect(p2.json.clients).toEqual([{ userId: U.clientA }]);
    const mine = await api("GET", "/projects/mine", { token: U.clientA });
    expect(mine.json.data.map((p: any) => p.name).sort()).toEqual(["Kim phase 2", "Kim website"]);
  });

  it("shows the client only their own checklist", async () => {
    const mine = await api("GET", "/client-onboarding/mine", { token: U.clientA });
    expect(mine.status).toBe(200);
    expect(mine.json.items).toHaveLength(4);
    expect(mine.json.progress.done).toBe(0);
    const intakeItem = mine.json.items.find((i: any) => i.kind === "intake");
    expect(intakeItem.linkedId).toBeNull(); // internal id hidden
    expect(mine.json.items.find((i: any) => i.kind === "upload_assets").canToggle).toBe(true);
    expect(mine.json.items.find((i: any) => i.kind === "sign_agreement").canToggle).toBe(false);

    // a portal client of another workspace sees nothing of this one
    const other = await api("GET", "/client-onboarding/mine", { token: U.clientB });
    expect(other.json.items).toEqual([]);
    expect((await api("GET", "/client-onboarding/mine")).status).toBe(401);
  });

  it("lets the client tick only steps they can honestly report", async () => {
    const mine = await api("GET", "/client-onboarding/mine", { token: U.clientA });
    const byKind = (k: string) => mine.json.items.find((i: any) => i.kind === k).id;
    expect((await api("POST", `/client-onboarding/mine/items/${byKind("sign_agreement")}`, { token: U.clientA, body: { done: true } })).status).toBe(400);
    expect((await api("POST", `/client-onboarding/mine/items/${byKind("intake")}`, { token: U.clientA, body: { done: true } })).status).toBe(400);
    expect((await api("POST", `/client-onboarding/mine/items/${byKind("upload_assets")}`, { token: U.clientA, body: { done: "yes" } })).status).toBe(400);
    expect((await api("POST", `/client-onboarding/mine/items/${byKind("upload_assets")}`, { token: U.clientA, body: { done: true } })).status).toBe(201);
    // someone else's item id is a 404, not a 403 leak
    const theirs = await h.prisma.onboardingItem.findFirstOrThrow({ where: { clientId: clientRecordId, kind: "pay_deposit" } });
    expect((await api("POST", `/client-onboarding/mine/items/${theirs.id}`, { token: U.clientB, body: { done: true } })).status).toBe(404);
  });

  it("keeps the questionnaire honest: drafts, required answers, unknown keys dropped, no edits after sending", async () => {
    const save = (answers: Record<string, unknown>, submit = false, token = U.clientA) =>
      api("PUT", "/client-onboarding/mine/intake", { token, body: { answers, submit } });

    expect((await save({ overview: "We sell shoes", isAdmin: "true", websiteType: "Spaceship" })).status).toBe(200);
    let staff = await api("GET", `/client-records/${clientRecordId}/onboarding`, { token: U.ownerA });
    expect(staff.json.intake.answers).toEqual({ overview: "We sell shoes" }); // unknown key and invalid option dropped
    expect(staff.json.intake.status).toBe("draft");

    const missing = await save({ overview: "We sell shoes" }, true);
    expect(missing.status).toBe(400);
    expect(JSON.stringify(missing.json)).toContain("Business name");

    expect((await save({ businessName: "Kim Shoes", overview: "We sell shoes", targetAudience: "Runners", websiteGoal: "Sell online", websiteType: "Online store" }, true)).status).toBe(200);
    expect((await save({ businessName: "Changed" })).status).toBe(400);
    expect((await save({ businessName: "Hijack" }, false, U.clientB)).status).toBe(404); // not their questionnaire

    staff = await api("GET", `/client-records/${clientRecordId}/onboarding`, { token: U.ownerA });
    expect(staff.json.intake.status).toBe("submitted");
    expect(staff.json.items.find((i: any) => i.kind === "intake").done).toBe(true);
    expect(staff.json.progress.done).toBe(2); // upload_assets + intake

    const n = await waitFor(() => h.prisma.notification.findFirst({ where: { organizationId: orgA, type: "intake_submitted", userId: U.ownerA } }));
    expect(n.title).toContain("Kim Client");
  });

  it("copies the answers into an internal project note only for this workspace's project", async () => {
    const foreignProject = await h.prisma.project.create({ data: { name: "B project", organizationId: orgB } });
    expect((await api("POST", `/client-records/${clientRecordId}/onboarding/intake-to-note`, { token: U.ownerA, body: { projectId: foreignProject.id } })).status).toBe(400);
    const ok = await api("POST", `/client-records/${clientRecordId}/onboarding/intake-to-note`, { token: U.ownerA, body: { projectId } });
    expect(ok.status).toBe(201);
    const note = await h.prisma.projectNote.findFirstOrThrow({ where: { projectId } });
    expect(note.content).toContain("Business name: Kim Shoes");
    expect(note.organizationId).toBe(orgA);
    // clients cannot read internal notes
    expect((await api("GET", `/notes/project/${projectId}`, { token: U.clientA })).status).toBe(403);
  });

  it("derives the agreement and deposit steps from the linked document and invoice", async () => {
    const file = await h.prisma.file.create({ data: { filename: "agreement.pdf", projectId, organizationId: orgA, uploadedById: U.ownerA } });
    const doc = await h.prisma.document.create({
      data: { type: "contract", title: "Agreement", fileId: file.id, projectId, organizationId: orgA, uploadedById: U.ownerA, status: "pending", requiresSignature: true },
    });
    const foreignFile = await h.prisma.file.create({ data: { filename: "b.pdf", projectId: (await h.prisma.project.findFirstOrThrow({ where: { organizationId: orgB } })).id, organizationId: orgB, uploadedById: U.ownerB } });
    const foreignDoc = await h.prisma.document.create({
      data: { type: "contract", title: "B doc", fileId: foreignFile.id, projectId: foreignFile.projectId, organizationId: orgB, uploadedById: U.ownerB, status: "signed" },
    });
    const invoice = await api("POST", "/invoices", { token: U.ownerA, body: { projectId, lineItems: [{ description: "Deposit", quantity: 1, unitPrice: 50000 }] } });
    expect(invoice.status).toBe(201);

    const staff = await api("GET", `/client-records/${clientRecordId}/onboarding`, { token: U.ownerA });
    const item = (k: string) => staff.json.items.find((i: any) => i.kind === k).id;
    const patch = (k: string, body: unknown) => api("PATCH", `/client-records/${clientRecordId}/onboarding/items/${item(k)}`, { token: U.ownerA, body });

    // cannot link to another workspace's document, or invent a type
    expect((await patch("sign_agreement", { linkedType: "document", linkedId: foreignDoc.id })).status).toBe(400);
    expect((await patch("sign_agreement", { linkedType: "form", linkedId: doc.id })).status).toBe(400);
    expect((await patch("sign_agreement", { linkedType: "document", linkedId: doc.id })).status).toBe(200);
    expect((await patch("pay_deposit", { linkedType: "invoice", linkedId: invoice.json.id })).status).toBe(200);
    expect((await patch("pay_deposit", { done: true })).status).toBe(400); // linked items complete on their own

    let now = await api("GET", `/client-records/${clientRecordId}/onboarding`, { token: U.ownerA });
    expect(now.json.items.find((i: any) => i.kind === "sign_agreement")).toMatchObject({ done: false, linkedLabel: "Agreement", linkedStatus: "pending" });

    // the document gets signed, the invoice gets paid (by hand, through the real invoice API)
    await h.prisma.document.update({ where: { id: doc.id }, data: { status: "signed" } });
    await api("PUT", `/invoices/${invoice.json.id}`, { token: U.ownerA, body: { status: "sent" } });
    now = await api("GET", `/client-records/${clientRecordId}/onboarding`, { token: U.ownerA });
    expect(now.json.items.find((i: any) => i.kind === "pay_deposit").done).toBe(false);
    const paid = await api("PUT", `/invoices/${invoice.json.id}`, { token: U.ownerA, body: { status: "paid" } });
    expect(paid.status).toBe(200);

    now = await api("GET", `/client-records/${clientRecordId}/onboarding`, { token: U.ownerA });
    expect(now.json.items.every((i: any) => i.done)).toBe(true);
    expect(now.json.progress).toEqual({ done: 4, total: 4, complete: true });

    // and the client sees the same, with no way to have faked it
    const mine = await api("GET", "/client-onboarding/mine", { token: U.clientA });
    expect(mine.json.progress.complete).toBe(true);
  });

  it("supports custom steps and removing steps, but the questionnaire step stays", async () => {
    const added = await api("POST", `/client-records/${clientRecordId}/onboarding/items`, { token: U.ownerA, body: { title: "Send brand guide" } });
    expect(added.status).toBe(201);
    expect((await api("DELETE", `/client-records/${clientRecordId}/onboarding/items/${added.json.id}`, { token: U.ownerA })).status).toBe(200);
    const staff = await api("GET", `/client-records/${clientRecordId}/onboarding`, { token: U.ownerA });
    const intake = staff.json.items.find((i: any) => i.kind === "intake");
    expect((await api("PATCH", `/client-records/${clientRecordId}/onboarding/items/${intake.id}`, { token: U.ownerA, body: { linkedType: null, linkedId: null } })).status).toBe(400);
  });

  it("portal clients cannot use the staff onboarding API", async () => {
    expect((await api("GET", `/client-records/${clientRecordId}/onboarding`, { token: U.clientA })).status).toBe(403);
    expect((await api("POST", `/client-records/${clientRecordId}/onboarding/invite`, { token: U.clientA, body: {} })).status).toBe(403);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("follow-up digest", () => {
  it("notifies each workspace about its own due leads only, once", async () => {
    await h.prisma.notification.deleteMany({ where: { type: "lead_follow_up", organizationId: { in: [orgA, orgB] } } });
    await h.prisma.client.create({ data: { organizationId: orgB, name: "B overdue", email: email("bod"), nextFollowUpAt: new Date(Date.now() - 3600_000) } });

    const task = h.app.get(LeadFollowUpTask);
    const workspaces = await task.sendDigests();
    expect(workspaces).toBeGreaterThanOrEqual(2);

    await waitFor(async () => (await h.prisma.notification.count({ where: { type: "lead_follow_up", organizationId: orgA } })) >= 2);
    const a = await h.prisma.notification.findMany({ where: { type: "lead_follow_up", organizationId: orgA } });
    const b = await h.prisma.notification.findMany({ where: { type: "lead_follow_up", organizationId: orgB } });
    expect(a.map((n) => n.userId).sort()).toEqual([U.adminA, U.ownerA].sort());
    expect(b.map((n) => n.userId)).toEqual([U.ownerB]);
    expect(b[0].message).toContain("B overdue");
    expect(b[0].message).not.toContain("Overdue Lead"); // org A's lead
    expect(a.every((n) => !n.message.includes("B overdue"))).toBe(true);
    expect(a.length).toBe(2); // one digest per admin, not one per lead
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("earlier security and integrity fixes, over real HTTP", () => {
  it("only owners can invite owners", async () => {
    expect((await api("POST", "/clients/invitations", { token: U.adminA, body: { email: email("evil"), role: "owner" } })).status).toBe(403);
    expect(await h.prisma.invitation.count({ where: { email: email("evil") } })).toBe(0);
    expect((await api("POST", "/clients/invitations", { token: U.adminA, body: { email: email("okadmin"), role: "admin" } })).status).toBe(201);
    expect((await api("POST", "/clients/invitations", { token: U.ownerA, body: { email: email("okowner"), role: "owner" } })).status).toBe(201);
  });

  it("contracts refuse a client from another workspace and any hand-set status", async () => {
    const project = await h.prisma.project.create({ data: { name: "Contract project", organizationId: orgA } });
    const foreignUser = U.clientB;
    const bad = await api("POST", `/projects/${project.id}/contracts`, { token: U.ownerA, body: { title: "C", template: "website-design", clientId: foreignUser } });
    expect(bad.status).toBe(400);
    expect(await h.prisma.contract.count({ where: { projectId: project.id } })).toBe(0);

    const ok = await api("POST", `/projects/${project.id}/contracts`, { token: U.ownerA, body: { title: "C", template: "website-design" } });
    expect(ok.status).toBe(201);
    expect((await api("PATCH", `/contracts/${ok.json.id}`, { token: U.ownerA, body: { status: "signed" } })).status).toBe(400);
    expect((await api("PATCH", `/contracts/${ok.json.id}`, { token: U.ownerA, body: { clientId: foreignUser } })).status).toBe(400);
    expect((await h.prisma.contract.findUniqueOrThrow({ where: { id: ok.json.id } })).status).toBe("draft");
  });

  it("invoices: manual paid records date and amount and notifies; items lock after draft", async () => {
    const project = await h.prisma.project.create({ data: { name: "Invoice project", organizationId: orgA } });
    const inv = await api("POST", "/invoices", { token: U.ownerA, body: { projectId: project.id, lineItems: [{ description: "A", quantity: 2, unitPrice: 1500 }, { description: "B", quantity: 1, unitPrice: 500 }] } });
    expect((await api("PUT", `/invoices/${inv.json.id}`, { token: U.ownerA, body: { lineItems: [{ description: "A2", quantity: 1, unitPrice: 100 }] } })).status).toBe(200); // draft: editable
    await api("PUT", `/invoices/${inv.json.id}`, { token: U.ownerA, body: { status: "sent" } });
    const locked = await api("PUT", `/invoices/${inv.json.id}`, { token: U.ownerA, body: { lineItems: [{ description: "sneaky", quantity: 1, unitPrice: 1 }] } });
    expect(locked.status).toBe(400);

    await api("PUT", `/invoices/${inv.json.id}`, { token: U.ownerA, body: { status: "paid" } });
    const row = await h.prisma.invoice.findUniqueOrThrow({ where: { id: inv.json.id } });
    expect(row.status).toBe("paid");
    expect(row.paidAt).toBeInstanceOf(Date);
    expect(row.paidAmount).toBe(100);
    await waitFor(() => h.prisma.notification.findFirst({ where: { organizationId: orgA, type: { contains: "invoice" }, link: { contains: project.id } } }));
    expect((await api("PUT", `/invoices/${inv.json.id}`, { token: U.ownerA, body: { lineItems: [{ description: "after paid", quantity: 1, unitPrice: 1 }] } })).status).toBe(400);
  });

  it("invoice numbering keeps working past INV-9999", async () => {
    const org = await h.prisma.organization.create({ data: { name: "Numbers", slug: `numbers-${stamp}` } });
    const owner = id("numowner");
    await createUser(owner, "Num Owner", email("numowner"));
    await h.prisma.member.create({ data: { userId: owner, organizationId: org.id, role: "owner" } });
    await h.prisma.invoice.create({ data: { invoiceNumber: "INV-9999", organizationId: org.id, status: "draft" } });
    const res = await api("POST", "/invoices", { token: owner, body: { lineItems: [{ description: "x", quantity: 1, unitPrice: 1 }] } });
    expect(res.status).toBe(201);
    expect(res.json.invoiceNumber).toBe("INV-10000");
    const res2 = await api("POST", "/invoices", { token: owner, body: { lineItems: [{ description: "x", quantity: 1, unitPrice: 1 }] } });
    expect(res2.json.invoiceNumber).toBe("INV-10001");
  });

  it("search stays inside the workspace, even for a person who is a client in two", async () => {
    const shared = id("shared");
    await createUser(shared, "Zed Sharedname", email("shared"));
    await h.prisma.member.createMany({ data: [{ userId: shared, organizationId: orgA, role: "member" }, { userId: shared, organizationId: orgB, role: "member" }] });
    await h.prisma.clientProfile.createMany({ data: [
      { userId: shared, organizationId: orgA, company: "A-Company" },
      { userId: shared, organizationId: orgB, company: "B-SECRET-COMPANY" },
    ] });
    // 25 people in org B with the same first name would have pushed org A's client out of a global top-20
    for (let i = 0; i < 25; i++) {
      const uid = id(`zedb${i}`);
      await createUser(uid, `Zed Number${i}`, email(`zedb${i}`));
      await h.prisma.member.create({ data: { userId: uid, organizationId: orgB, role: "member" } });
    }

    const res = await api("GET", "/search?q=zed", { token: U.ownerA });
    expect(res.status).toBe(200);
    expect(res.json.clients).toHaveLength(1);
    expect(res.json.clients[0]).toMatchObject({ company: "A-Company", user: { name: "Zed Sharedname" } });
    expect(JSON.stringify(res.json)).not.toContain("B-SECRET-COMPANY");
    expect(JSON.stringify(res.json)).not.toContain("Number");
  });

  it("notifications and profile endpoints work for a signed-in user and are scoped to them", async () => {
    const mine = await api("GET", "/notifications", { token: U.ownerA });
    expect(mine.status).toBe(200);
    expect(mine.json.data.every((n: any) => n.userId === undefined || n.userId === U.ownerA)).toBe(true);
    const me = await api("GET", "/auth/me", { token: U.ownerA });
    expect(me.json.user.id).toBe(U.ownerA);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("backfill of existing portal clients", () => {
  const run = (...args: string[]) =>
    execFileSync("npx", ["tsx", "src/database/backfill-clients.ts", ...args], {
      env: { ...process.env, DATABASE_URL: process.env.TEST_DATABASE_URL, DIRECT_URL: process.env.TEST_DATABASE_URL },
      encoding: "utf8",
      timeout: 120000,
    });

  let orgC: string;
  let legacyUser: string;
  let legacyProject: string;

  it("sets up a legacy workspace (client login, profile, assigned project, invoice)", async () => {
    const c = await createOrg("Legacy C", [{ userId: id("ownerC"), role: "owner" }]).catch(async () => null);
    void c;
    const owner = id("ownerC2");
    await createUser(owner, "Legacy Owner", email("ownerC2"));
    legacyUser = id("legacyclient");
    await createUser(legacyUser, "Lena Legacy", email("legacy"));
    const org = await h.prisma.organization.create({ data: { name: "Legacy Org", slug: `legacy-${stamp}`, members: { create: [{ userId: owner, role: "owner" }, { userId: legacyUser, role: "member" }] } } });
    orgC = org.id;
    await h.prisma.clientProfile.create({ data: { userId: legacyUser, organizationId: orgC, company: "Legacy Ltd", phone: "555", address: "1 Old St", website: "https://legacy.test", description: "Long-time client" } });
    const p = await h.prisma.project.create({ data: { name: "Legacy project", organizationId: orgC, clients: { create: [{ userId: legacyUser }] } } });
    legacyProject = p.id;
    await h.prisma.invoice.create({ data: { invoiceNumber: "INV-0001", organizationId: orgC, projectId: legacyProject, status: "sent" } });
    await h.prisma.invoice.create({ data: { invoiceNumber: "INV-0002", organizationId: orgC, status: "sent" } }); // no project: stays unlinked
  });

  it("dry run reports but writes nothing", async () => {
    const out = run();
    expect(out).toContain("DRY RUN");
    expect(await h.prisma.client.count({ where: { organizationId: orgC } })).toBe(0);
    expect((await h.prisma.project.findUniqueOrThrow({ where: { id: legacyProject } })).clientId).toBeNull();
  });

  it("apply creates the client, contact, and links the project and its invoices", async () => {
    run("--apply");
    const clients = await h.prisma.client.findMany({ where: { organizationId: orgC }, include: { contacts: true } });
    expect(clients).toHaveLength(1);
    expect(clients[0]).toMatchObject({ name: "Lena Legacy", company: "Legacy Ltd", email: email("legacy"), phone: "555", stage: "active", leadStatus: null, location: "1 Old St", notes: "Long-time client" });
    expect(clients[0].contacts).toEqual([expect.objectContaining({ userId: legacyUser, isPrimary: true })]);

    const project = await h.prisma.project.findUniqueOrThrow({ where: { id: legacyProject } });
    expect(project.clientId).toBe(clients[0].id);
    const invoices = await h.prisma.invoice.findMany({ where: { organizationId: orgC }, orderBy: { invoiceNumber: "asc" } });
    expect(invoices.map((i) => i.clientId)).toEqual([clients[0].id, null]);

    // access is unchanged: the login still reaches the project
    expect((await api("GET", "/projects/mine", { token: legacyUser })).json.data.map((p: any) => p.name)).toEqual(["Legacy project"]);
  });

  it("is safe to run again", async () => {
    const before = await h.prisma.client.count();
    run("--apply");
    expect(await h.prisma.client.count()).toBe(before);
    expect(await h.prisma.clientContact.count({ where: { userId: legacyUser } })).toBe(1);
  });
});
