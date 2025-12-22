import { Pool } from "pg";
import "dotenv/config";

// Direct pg connections for bulk operations
const localPool = new Pool({
  connectionString: "postgresql://procurement:procurement123@localhost:5432/procurement_dashboard",
});

// Hardcoded Vercel Postgres URL to avoid env var issues
const VERCEL_URL = "postgres://6105a086f72f78dbb699bd736eeeddad3dabd83a6aef30cbb6d29c1107909e06:sk_kS10ioXKLZnp2Uu_22G3n@db.prisma.io:5432/postgres?sslmode=require";
const vercelPool = new Pool({
  connectionString: VERCEL_URL,
});

async function migrateData() {
  console.log("Starting migration from local to Vercel Postgres...");

  const localClient = await localPool.connect();
  const vercelClient = await vercelPool.connect();

  try {
    // Get count from local
    const countResult = await localClient.query('SELECT COUNT(*) FROM "ProcurementTransaction"');
    const localCount = parseInt(countResult.rows[0].count);
    console.log(`Found ${localCount} records in local database`);

    if (localCount === 0) {
      console.log("No data to migrate");
      return;
    }

    // Check if resuming from previous migration
    const existingCount = await vercelClient.query('SELECT COUNT(*) FROM "ProcurementTransaction"');
    const existingRecords = parseInt(existingCount.rows[0].count);

    if (existingRecords > 0) {
      console.log(`Found ${existingRecords} existing records in Vercel. Resuming migration...`);
    } else {
      // Clear Vercel database first (only if starting fresh)
      console.log("Clearing Vercel database...");
      await vercelClient.query('DELETE FROM "SyncLog"');
      console.log("Vercel database cleared");
    }

    // Migrate in batches - larger for faster migration
    const BATCH_SIZE = 1000;
    let migrated = existingRecords;
    let offset = existingRecords; // Start from where we left off

    while (true) {
      // Fetch batch from local, starting from offset
      const result = await localClient.query(
        `SELECT * FROM "ProcurementTransaction" ORDER BY id LIMIT $1 OFFSET $2`,
        [BATCH_SIZE, offset]
      );

      if (result.rows.length === 0) {
        console.log("No more records to migrate");
        break;
      }

      console.log(`Fetched ${result.rows.length} records from local (offset: ${offset})`);

      // Insert batch using multi-row INSERT for better performance
      const ROWS_PER_INSERT = 50; // Insert 50 rows at a time
      for (let i = 0; i < result.rows.length; i += ROWS_PER_INSERT) {
        const batch = result.rows.slice(i, i + ROWS_PER_INSERT);

        // Build multi-value INSERT statement
        const values: unknown[] = [];
        const valuePlaceholders: string[] = [];
        let paramIndex = 1;

        for (const row of batch) {
          const placeholders = [];
          for (let j = 0; j < 28; j++) {
            placeholders.push(`$${paramIndex++}`);
          }
          valuePlaceholders.push(`(${placeholders.join(", ")})`);
          values.push(
            row.rowNumber, row.date, row.reference, row.status, row.contactCode, row.vendor,
            row.itemNumber, row.productCode, row.productName, row.accountChart, row.description,
            row.quantity, row.unit, row.price, row.discount, row.totalPrice, row.taxType,
            row.vatAmount, row.withholdingTax, row.majorGroup, row.minorGroup, row.percentage,
            row.payment, row.poNumber, row.url, row.rowHash, row.createdAt, row.updatedAt
          );
        }

        try {
          await vercelClient.query(
            `INSERT INTO "ProcurementTransaction"
             ("rowNumber", "date", "reference", "status", "contactCode", "vendor",
              "itemNumber", "productCode", "productName", "accountChart", "description",
              "quantity", "unit", "price", "discount", "totalPrice", "taxType",
              "vatAmount", "withholdingTax", "majorGroup", "minorGroup", "percentage",
              "payment", "poNumber", "url", "rowHash", "createdAt", "updatedAt")
             VALUES ${valuePlaceholders.join(", ")}
             ON CONFLICT ("rowNumber") DO NOTHING`,
            values
          );
          migrated += batch.length;
        } catch (err) {
          console.error(`Error inserting batch at offset ${offset + i}:`, err);
          throw err;
        }
      }

      console.log(`Migrated ${migrated}/${localCount} records (${((migrated / localCount) * 100).toFixed(1)}%)`);
      offset += BATCH_SIZE;
    }

    // Create a sync log entry
    await vercelClient.query(
      `INSERT INTO "SyncLog" ("status", "completedAt", "totalRows", "insertedRows", "updatedRows", "deletedRows")
       VALUES ($1, $2, $3, $4, $5, $6)`,
      ["completed", new Date(), localCount, localCount, 0, 0]
    );

    console.log(`Migration completed! ${migrated} records transferred to Vercel Postgres`);
  } catch (error) {
    console.error("Migration failed:", error);
    throw error;
  } finally {
    localClient.release();
    vercelClient.release();
    await localPool.end();
    await vercelPool.end();
  }
}

migrateData();
