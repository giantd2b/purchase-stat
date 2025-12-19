/**
 * CLI script to sync Google Sheets data to PostgreSQL
 * Run with: npx tsx scripts/sync-db.ts
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local" });
import { syncGoogleSheetsToDatabase } from "../src/lib/sync";

async function main() {
  console.log("=".repeat(60));
  console.log("Google Sheets -> PostgreSQL Sync");
  console.log("=".repeat(60));
  console.log();

  const startTime = Date.now();

  try {
    const result = await syncGoogleSheetsToDatabase();

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log();
    console.log("=".repeat(60));
    console.log("SYNC COMPLETE");
    console.log("=".repeat(60));
    console.log(`Total rows processed: ${result.totalRows.toLocaleString()}`);
    console.log(`Inserted: ${result.insertedRows.toLocaleString()}`);
    console.log(`Updated: ${result.updatedRows.toLocaleString()}`);
    console.log(`Deleted: ${result.deletedRows.toLocaleString()}`);
    console.log(`Duration: ${duration}s`);
    console.log("=".repeat(60));
  } catch (error) {
    console.error("Sync failed:", error);
    process.exit(1);
  }
}

main();
