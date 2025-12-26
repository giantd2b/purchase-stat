import { google } from "googleapis";
import { PrismaClient, Prisma } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import crypto from "crypto";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Google Sheets configuration
const SHEET_ID = "1ZxUeN8h9SRTncNWnwou8RonoRFnTOB_xVA5QFfI4lZ4";
const RANGE = "Sheet1";

// Header mapping (Thai -> English field names)
const HEADER_MAP: Record<string, string> = {
  "วันที่ออก": "date",
  "อ้างอิง": "reference",
  "สถานะ": "status",
  "รหัสผู้ติดต่อ": "contactCode",
  "ผู้ขาย/ผู้ให้บริการ": "vendor",
  "รายการที่": "itemNumber",
  "รหัสสินค้า/บริการ": "productCode",
  "ชื่อสินค้า/บริการ": "productName",
  "ผังบัญชี": "accountChart",
  "คำอธิบาย": "description",
  "จำนวน": "quantity",
  "หน่วย": "unit",
  "ราคา": "price",
  "ส่วนลด": "discount",
  "มูลค่าก่อนภาษี": "totalPrice",
  "ประเภทภาษี": "taxType",
  "ยอด VAT": "vatAmount",
  "หัก ณ ที่จ่าย": "withholdingTax",
  "กลุ่มใหญ่": "majorGroup",
  "กลุ่มย่อย": "minorGroup",
  "%": "percentage",
  "payment": "payment",
  "เลข-PO": "poNumber",
  "url": "url",
};

/**
 * Authenticate with Google Sheets API
 */
async function getAuthClient() {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!clientEmail || !privateKey) {
    throw new Error("Missing Google Service Account credentials");
  }

  return new google.auth.GoogleAuth({
    credentials: {
      client_email: clientEmail,
      private_key: privateKey,
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
}

/**
 * Parse date string to Date object (UTC to avoid timezone issues)
 */
function parseDate(dateStr: string | undefined): Date | null {
  if (!dateStr) return null;

  const parts = dateStr.split(/[-/]/);
  if (parts.length < 3) return null;

  try {
    let year: number, month: number, day: number;

    if (parts[0].length === 4) {
      // YYYY-MM-DD
      year = parseInt(parts[0]);
      month = parseInt(parts[1]) - 1;
      day = parseInt(parts[2]);
    } else {
      // DD/MM/YYYY
      day = parseInt(parts[0]);
      month = parseInt(parts[1]) - 1;
      year = parseInt(parts[2]);
    }

    // Use UTC to avoid timezone conversion issues
    return new Date(Date.UTC(year, month, day, 12, 0, 0));
  } catch {
    return null;
  }
}

/**
 * Parse number string to Decimal
 */
function parseDecimal(value: string | undefined): Prisma.Decimal | null {
  if (!value) return null;
  const cleaned = value.toString().replace(/[^0-9.-]/g, "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : new Prisma.Decimal(num);
}

/**
 * Parse integer string
 */
function parseInt2(value: string | undefined): number | null {
  if (!value) return null;
  const num = parseInt(value, 10);
  return isNaN(num) ? null : num;
}

/**
 * Compute MD5 hash of row data for change detection
 */
function computeRowHash(row: string[]): string {
  const content = row.join("|");
  return crypto.createHash("md5").update(content).digest("hex");
}

/**
 * Fetch data from Google Sheets
 */
async function fetchSheetData(): Promise<{ headers: string[]; rows: string[][] }> {
  const auth = await getAuthClient();
  const sheets = google.sheets({ version: "v4", auth });

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: RANGE,
  });

  const data = response.data.values;
  if (!data || data.length === 0) {
    return { headers: [], rows: [] };
  }

  return {
    headers: data[0] as string[],
    rows: data.slice(1) as string[][],
  };
}

/**
 * Map row data to database record
 */
function mapRowToRecord(
  row: string[],
  headerIndices: Record<string, number>,
  rowNumber: number
): Prisma.ProcurementTransactionCreateInput {
  const getValue = (field: string): string | undefined => {
    const index = headerIndices[field];
    return index !== undefined && index < row.length ? row[index] : undefined;
  };

  return {
    rowNumber,
    date: parseDate(getValue("date")),
    reference: getValue("reference") || null,
    status: getValue("status") || null,
    contactCode: getValue("contactCode") || null,
    vendor: getValue("vendor") || null,
    itemNumber: parseInt2(getValue("itemNumber")),
    productCode: getValue("productCode") || null,
    productName: getValue("productName") || null,
    accountChart: getValue("accountChart") || null,
    description: getValue("description") || null,
    quantity: parseDecimal(getValue("quantity")),
    unit: getValue("unit") || null,
    price: parseDecimal(getValue("price")),
    discount: parseDecimal(getValue("discount")),
    totalPrice: parseDecimal(getValue("totalPrice")),
    taxType: getValue("taxType") || null,
    vatAmount: parseDecimal(getValue("vatAmount")),
    withholdingTax: parseDecimal(getValue("withholdingTax")),
    // Calculate totalWithVat = totalPrice + vatAmount
    totalWithVat: (() => {
      const total = parseDecimal(getValue("totalPrice"));
      const vat = parseDecimal(getValue("vatAmount"));
      if (total === null) return null;
      // Use Decimal.add() for proper decimal arithmetic
      return vat ? total.add(vat) : total;
    })(),
    majorGroup: getValue("majorGroup") || null,
    minorGroup: getValue("minorGroup") || null,
    percentage: parseDecimal(getValue("percentage")),
    payment: getValue("payment") || null,
    poNumber: getValue("poNumber") || null,
    url: getValue("url") || null,
    rowHash: computeRowHash(row),
  };
}

/**
 * Main sync function
 */
export async function syncGoogleSheetsToDatabase(): Promise<{
  totalRows: number;
  insertedRows: number;
  updatedRows: number;
  deletedRows: number;
}> {
  console.log("Starting sync from Google Sheets to PostgreSQL...");

  // Create sync log entry
  const syncLog = await prisma.syncLog.create({
    data: { status: "running" },
  });

  try {
    // Fetch data from Google Sheets
    console.log("Fetching data from Google Sheets...");
    const { headers, rows } = await fetchSheetData();
    console.log(`Fetched ${rows.length} rows`);

    // Build header index map
    const headerIndices: Record<string, number> = {};
    headers.forEach((header, index) => {
      const trimmed = header.trim();
      const englishKey = HEADER_MAP[trimmed];
      if (englishKey) {
        headerIndices[englishKey] = index;
      }
    });

    console.log("Header indices:", headerIndices);

    // Get existing row hashes from database
    const existingRows = await prisma.procurementTransaction.findMany({
      select: { rowNumber: true, rowHash: true },
    });
    const existingHashMap = new Map(
      existingRows.map((r) => [r.rowNumber, r.rowHash])
    );

    let insertedRows = 0;
    let updatedRows = 0;
    const processedRowNumbers = new Set<number>();

    // Process rows in batches
    const BATCH_SIZE = 1000;
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      const operations: Promise<unknown>[] = [];

      for (let j = 0; j < batch.length; j++) {
        const row = batch[j];
        const rowNumber = i + j + 2; // +2 because row 1 is header, and we're 1-indexed
        processedRowNumbers.add(rowNumber);

        // Skip empty rows
        if (!row || row.length === 0 || row.every((cell) => !cell)) {
          continue;
        }

        const rowHash = computeRowHash(row);
        const existingHash = existingHashMap.get(rowNumber);

        if (!existingHash) {
          // New row - insert
          const record = mapRowToRecord(row, headerIndices, rowNumber);
          operations.push(
            prisma.procurementTransaction.create({ data: record }).then(() => {
              insertedRows++;
            })
          );
        } else if (existingHash !== rowHash) {
          // Changed row - update
          const record = mapRowToRecord(row, headerIndices, rowNumber);
          operations.push(
            prisma.procurementTransaction
              .update({
                where: { rowNumber },
                data: record,
              })
              .then(() => {
                updatedRows++;
              })
          );
        }
        // If hash matches, no action needed
      }

      // Execute batch operations
      await Promise.all(operations);
      console.log(`Processed rows ${i + 1} to ${Math.min(i + BATCH_SIZE, rows.length)}`);
    }

    // Delete rows that no longer exist in the sheet
    const rowNumbersToDelete = existingRows
      .map((r) => r.rowNumber)
      .filter((rn) => !processedRowNumbers.has(rn));

    let deletedRows = 0;
    if (rowNumbersToDelete.length > 0) {
      const deleteResult = await prisma.procurementTransaction.deleteMany({
        where: { rowNumber: { in: rowNumbersToDelete } },
      });
      deletedRows = deleteResult.count;
      console.log(`Deleted ${deletedRows} rows that no longer exist in sheet`);
    }

    // Update sync log
    await prisma.syncLog.update({
      where: { id: syncLog.id },
      data: {
        status: "completed",
        completedAt: new Date(),
        totalRows: rows.length,
        insertedRows,
        updatedRows,
        deletedRows,
      },
    });

    console.log(`Sync completed: ${insertedRows} inserted, ${updatedRows} updated, ${deletedRows} deleted`);

    return {
      totalRows: rows.length,
      insertedRows,
      updatedRows,
      deletedRows,
    };
  } catch (error) {
    // Update sync log with error
    await prisma.syncLog.update({
      where: { id: syncLog.id },
      data: {
        status: "failed",
        completedAt: new Date(),
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      },
    });
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Get last sync status
 */
export async function getLastSyncStatus() {
  const lastSync = await prisma.syncLog.findFirst({
    orderBy: { startedAt: "desc" },
  });
  return lastSync;
}
