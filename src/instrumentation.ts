/**
 * Next.js Instrumentation - runs on server startup
 * Used for scheduling automatic sync from Google Sheets
 */

export async function register() {
  // Only run on server side (not during build)
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const cron = await import("node-cron");
    const { syncGoogleSheetsToDatabase } = await import("./lib/sync");

    console.log("[Scheduler] Starting automatic sync scheduler...");

    // Run sync every hour at minute 0 (e.g., 1:00, 2:00, 3:00...)
    cron.default.schedule("0 * * * *", async () => {
      console.log(`[Scheduler] Running scheduled sync at ${new Date().toLocaleString("th-TH")}`);
      try {
        const result = await syncGoogleSheetsToDatabase();
        console.log(`[Scheduler] Sync complete: ${result.insertedRows} inserted, ${result.updatedRows} updated, ${result.deletedRows} deleted`);
      } catch (error) {
        console.error("[Scheduler] Sync failed:", error);
      }
    });

    console.log("[Scheduler] Cron job scheduled: sync every hour at :00");

    // Optional: Run initial sync on startup (uncomment if needed)
    // console.log("[Scheduler] Running initial sync...");
    // syncGoogleSheetsToDatabase().catch(console.error);
  }
}
