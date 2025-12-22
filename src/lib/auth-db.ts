import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

// Separate Prisma client for NextAuth
// Uses the same adapter setup as db.ts for compatibility

const globalForPrisma = globalThis as unknown as {
  authPrisma: PrismaClient | undefined;
  authPool: Pool | undefined;
};

function createAuthPrismaClient() {
  const pool = globalForPrisma.authPool ?? new Pool({
    connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
    ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined,
  });
  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.authPool = pool;
  }
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

export const authPrisma = globalForPrisma.authPrisma ?? createAuthPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.authPrisma = authPrisma;
}
