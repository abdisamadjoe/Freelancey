// Safety guard: unit tests must never reach a real database. Prisma would
// otherwise pick up DATABASE_URL from backend/.env (a shared dev DB) and the
// integration specs wipe tables. Real-DB specs are named *.int.spec.ts and only
// run via `npm run test:integration` with TEST_DATABASE_URL pointing at a
// throwaway Neon branch.
const testUrl = process.env.TEST_DATABASE_URL;
const blocked = "postgresql://blocked:blocked@127.0.0.1:1/blocked";

process.env.DATABASE_URL = testUrl ?? blocked;
process.env.DIRECT_URL = process.env.TEST_DIRECT_URL ?? testUrl ?? blocked;
