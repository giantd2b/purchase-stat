import { prisma } from "./db";
import { fetchItemsFromSheet } from "./google-sheets";

/**
 * Sync items from Google Sheets to database
 * Uses upsert to insert new items or update existing ones
 */
export async function syncItems(): Promise<{
  inserted: number;
  updated: number;
  total: number;
}> {
  console.log("Starting items sync from Google Sheets...");

  try {
    // Fetch items from Google Sheets
    const sheetItems = await fetchItemsFromSheet();
    console.log(`Fetched ${sheetItems.length} items from Google Sheets`);

    let inserted = 0;
    let updated = 0;

    // Process items in batches to avoid overwhelming the database
    const BATCH_SIZE = 100;
    for (let i = 0; i < sheetItems.length; i += BATCH_SIZE) {
      const batch = sheetItems.slice(i, i + BATCH_SIZE);

      await Promise.all(
        batch.map(async (item) => {
          const existing = await prisma.item.findUnique({
            where: { id: item.id },
          });

          await prisma.item.upsert({
            where: { id: item.id },
            create: {
              id: item.id,
              name: item.name,
              unit: item.unit,
              type: item.type,
              category: item.category,
              supplier1: item.supplier1,
              supplier2: item.supplier2,
            },
            update: {
              name: item.name,
              unit: item.unit,
              type: item.type,
              category: item.category,
              supplier1: item.supplier1,
              supplier2: item.supplier2,
            },
          });

          if (existing) {
            updated++;
          } else {
            inserted++;
          }
        })
      );

      console.log(`Processed ${Math.min(i + BATCH_SIZE, sheetItems.length)}/${sheetItems.length} items`);
    }

    console.log(`Items sync completed: ${inserted} inserted, ${updated} updated`);

    return {
      inserted,
      updated,
      total: sheetItems.length,
    };
  } catch (error) {
    console.error("Error syncing items:", error);
    throw error;
  }
}
