import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { config } from "dotenv";

// Load production environment
config({ path: ".env.production.local" });

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

// Show connection info
console.log("🔌 Connecting to database...");
if (connectionString) {
  const masked = connectionString.replace(/:([^:@]+)@/, ":****@");
  console.log(`   URL: ${masked.substring(0, 60)}...`);
}

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }, // Required for cloud databases
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function resetPettyCash() {
  console.log("🔄 Starting Petty Cash reset...\n");

  try {
    // Count before deletion
    const txCount = await prisma.pettyCashTransaction.count();
    const accountCount = await prisma.pettyCashAccount.count();

    console.log(`📊 Current data:`);
    console.log(`   - Transactions: ${txCount}`);
    console.log(`   - Accounts: ${accountCount}\n`);

    // Delete all transactions first (due to foreign key constraints)
    console.log("🗑️  Deleting all transactions...");
    const deletedTx = await prisma.pettyCashTransaction.deleteMany({});
    console.log(`   ✓ Deleted ${deletedTx.count} transactions\n`);

    // Delete all accounts
    console.log("🗑️  Deleting all accounts...");
    const deletedAccounts = await prisma.pettyCashAccount.deleteMany({});
    console.log(`   ✓ Deleted ${deletedAccounts.count} accounts\n`);

    console.log("✅ Petty Cash reset complete!");
    console.log("   All transactions and accounts have been deleted.");
  } catch (error) {
    console.error("❌ Error resetting petty cash:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

resetPettyCash();
