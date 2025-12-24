import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import "dotenv/config";

console.log("🔍 Checking database connection...\n");
console.log("DATABASE_URL:", process.env.DATABASE_URL ? "✓ Set" : "✗ Not set");
console.log("POSTGRES_URL:", process.env.POSTGRES_URL ? "✓ Set" : "✗ Not set");

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (connectionString) {
  // Show partial connection string (hide password)
  const masked = connectionString.replace(/:([^:@]+)@/, ":****@");
  console.log("Using:", masked.substring(0, 80) + "...\n");
}

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function checkData() {
  try {
    // Check petty cash data
    const txCount = await prisma.pettyCashTransaction.count();
    const accountCount = await prisma.pettyCashAccount.count();

    console.log("📊 Petty Cash Data:");
    console.log(`   - Transactions: ${txCount}`);
    console.log(`   - Accounts: ${accountCount}`);

    // List accounts if any
    if (accountCount > 0) {
      const accounts = await prisma.pettyCashAccount.findMany({
        include: { user: { select: { name: true, email: true } } }
      });
      console.log("\n📋 Accounts:");
      accounts.forEach(acc => {
        console.log(`   - ${acc.user.name || acc.user.email}: ฿${Number(acc.balance).toLocaleString()}`);
      });
    }

    // List recent transactions if any
    if (txCount > 0) {
      const transactions = await prisma.pettyCashTransaction.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        include: { account: { include: { user: { select: { name: true } } } } }
      });
      console.log("\n📋 Recent Transactions:");
      transactions.forEach(tx => {
        console.log(`   - ${tx.type} ฿${Number(tx.amount).toLocaleString()} (${tx.status}) - ${tx.account.user.name}`);
      });
    }

  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

checkData();
