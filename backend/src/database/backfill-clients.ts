/**
 * One-off, idempotent backfill: turns existing portal clients (Member role
 * "member" + ClientProfile) into Client + ClientContact records, then links
 * Project.clientId and Invoice.clientId.
 *
 *   npm run db:backfill-clients            # dry run, writes nothing
 *   npm run db:backfill-clients -- --apply # writes
 *
 * Safe to re-run: members that already have a ClientContact in their
 * organization are skipped, and only projects/invoices with a null clientId
 * are touched. Point DATABASE_URL at a Neon dev branch before using --apply.
 */
import { PrismaClient } from "@prisma/client";
import { NeonAuthPrismaClient } from "./index";

const apply = process.argv.includes("--apply");
const prisma = new PrismaClient();
const neonAuth = new NeonAuthPrismaClient();

async function main() {
  console.log(apply ? "APPLY mode: writing changes" : "DRY RUN: nothing will be written (use --apply)");

  const members = await prisma.member.findMany({ where: { role: "member" } });
  const users = await neonAuth.neonAuthUser.findMany({
    where: { id: { in: [...new Set(members.map((m) => m.userId))] } },
  });
  const userById = new Map(users.map((u) => [u.id, u]));
  const profiles = await prisma.clientProfile.findMany();
  const profileByKey = new Map(profiles.map((p) => [`${p.organizationId}:${p.userId}`, p]));

  let created = 0;
  let skipped = 0;
  const clientIdByOrgUser = new Map<string, string>();

  for (const m of members) {
    const key = `${m.organizationId}:${m.userId}`;
    const existing = await prisma.clientContact.findFirst({
      where: { userId: m.userId, client: { organizationId: m.organizationId } },
      select: { clientId: true },
    });
    if (existing) {
      clientIdByOrgUser.set(key, existing.clientId);
      skipped++;
      continue;
    }

    const user = userById.get(m.userId);
    const profile = profileByKey.get(key);
    const name = user?.name?.trim() || user?.email || "Unknown client";
    created++;
    if (!apply) continue;

    const client = await prisma.client.create({
      data: {
        organizationId: m.organizationId,
        name,
        company: profile?.company,
        email: user?.email?.toLowerCase(),
        phone: profile?.phone,
        website: profile?.website,
        location: profile?.address,
        notes: profile?.description,
        stage: "active",
        leadStatus: null,
        source: "existing portal client",
        contacts: {
          create: { userId: m.userId, name, email: user?.email, phone: profile?.phone, isPrimary: true },
        },
      },
    });
    clientIdByOrgUser.set(key, client.id);
  }

  // Link projects (first assigned portal client wins) and their invoices.
  const projects = await prisma.project.findMany({
    where: { clientId: null, clients: { some: {} } },
    select: {
      id: true,
      organizationId: true,
      clients: { orderBy: { createdAt: "asc" }, take: 1, select: { userId: true } },
    },
  });
  let projectsLinked = 0;
  let invoicesLinked = 0;
  for (const p of projects) {
    const clientId = clientIdByOrgUser.get(`${p.organizationId}:${p.clients[0].userId}`);
    if (!clientId) continue; // dry run, or the assigned user is not a "member" role
    projectsLinked++;
    if (!apply) continue;
    await prisma.project.update({ where: { id: p.id }, data: { clientId } });
    const res = await prisma.invoice.updateMany({
      where: { projectId: p.id, organizationId: p.organizationId, clientId: null },
      data: { clientId },
    });
    invoicesLinked += res.count;
  }

  console.log({ membersSeen: members.length, clientsToCreate: created, alreadyMigrated: skipped, projectsLinked, invoicesLinked });
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await neonAuth.$disconnect();
  });
