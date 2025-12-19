import { google } from "googleapis";

// Define the procurement record type
export interface ProcurementRecord {
  date: string;
  vendor: string;
  item: string;
  totalPrice: number;
  department: string;
}

// Thai to English header mapping
const HEADER_MAP: Record<string, keyof ProcurementRecord> = {
  "วันที่ออก": "date",
  "ผู้ขาย/ผู้ให้บริการ": "vendor",
  "ชื่อสินค้า/บริการ": "item",
  "มูลค่าก่อนภาษี": "totalPrice",
  "กลุ่มย่อย": "department",
};

// Google Sheets configuration
const SHEET_ID = "1ZxUeN8h9SRTncNWnwou8RonoRFnTOB_xVA5QFfI4lZ4";
const RANGE = "Sheet1"; // Full sheet

/**
 * Authenticate with Google Sheets API using Service Account
 */
async function getAuthClient() {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!clientEmail || !privateKey) {
    throw new Error(
      "Missing Google Service Account credentials in environment variables"
    );
  }

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: clientEmail,
      private_key: privateKey,
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });

  return auth;
}

/**
 * Parse a price string to number, handling Thai formatting
 */
function parsePrice(value: string | undefined): number {
  if (!value) return 0;
  // Remove commas and any non-numeric characters except decimal point and minus
  const cleaned = value.toString().replace(/[^0-9.-]/g, "");
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Fetch procurement data from Google Sheets
 * Uses Next.js 15 caching with 60 second revalidation
 */
export async function fetchProcurementData(): Promise<ProcurementRecord[]> {
  try {
    const auth = await getAuthClient();
    const sheets = google.sheets({ version: "v4", auth });

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: RANGE,
    });

    const rows = response.data.values;

    if (!rows || rows.length === 0) {
      console.log("No data found in sheet");
      return [];
    }

    console.log(`Fetched ${rows.length} rows from Google Sheets`);

    // First row contains headers
    const headers = rows[0] as string[];
    console.log("Headers found:", headers.slice(0, 10));

    // Map header indices to our field names
    const headerIndices: Record<keyof ProcurementRecord, number> = {
      date: -1,
      vendor: -1,
      item: -1,
      totalPrice: -1,
      department: -1,
    };

    headers.forEach((header, index) => {
      const trimmedHeader = header.trim();
      const englishKey = HEADER_MAP[trimmedHeader];
      if (englishKey) {
        headerIndices[englishKey] = index;
      }
    });

    console.log("Header indices mapped:", headerIndices);

    // Check if all required headers were found
    const missingHeaders = Object.entries(headerIndices)
      .filter(([, index]) => index === -1)
      .map(([key]) => key);

    if (missingHeaders.length > 0) {
      console.warn(`Missing headers: ${missingHeaders.join(", ")}`);
    }

    // Log first data row for debugging
    if (rows.length > 1) {
      console.log("First data row (length=" + rows[1].length + "):", rows[1].slice(0, 10));
      console.log("Header row length:", headers.length);
      // Find a row with enough columns
      let sampleRow = null;
      for (let i = 1; i < Math.min(100, rows.length); i++) {
        if (rows[i].length > headerIndices.totalPrice) {
          sampleRow = i;
          break;
        }
      }
      if (sampleRow) {
        console.log(`Row ${sampleRow} has ${rows[sampleRow].length} cols, totalPrice="${rows[sampleRow][headerIndices.totalPrice]}"`);
      } else {
        console.log("No rows in first 100 have enough columns for totalPrice!");
        // Log row lengths
        const lengths = rows.slice(1, 11).map((r, i) => `Row${i+1}:${r.length}`);
        console.log("First 10 row lengths:", lengths.join(", "));
      }
    }

    // Parse data rows (skip header row)
    const records: ProcurementRecord[] = rows.slice(1).map((row) => ({
      date: row[headerIndices.date] || "",
      vendor: row[headerIndices.vendor] || "",
      item: row[headerIndices.item] || "",
      totalPrice: parsePrice(row[headerIndices.totalPrice]),
      department: row[headerIndices.department] || "",
    }));

    // Filter out empty rows
    return records.filter(
      (record) =>
        record.date || record.vendor || record.item || record.totalPrice > 0
    );
  } catch (error) {
    console.error("Error fetching Google Sheets data:", error);
    throw error;
  }
}

/**
 * Cached version of fetchProcurementData for use in Server Components
 * Implements Next.js 15 caching with 60 second revalidation
 */
export async function getCachedProcurementData(): Promise<ProcurementRecord[]> {
  // Using Next.js unstable_cache for server-side caching
  const { unstable_cache } = await import("next/cache");

  const cachedFetch = unstable_cache(
    async () => {
      return await fetchProcurementData();
    },
    ["procurement-data"],
    {
      revalidate: 60, // Revalidate every 60 seconds
      tags: ["procurement"],
    }
  );

  return cachedFetch();
}

// KPI calculation types
export interface KPIData {
  totalSpend: number;
  totalTransactions: number;
  uniqueVendors: number;
  uniqueDepartments: number;
  topDepartment: { name: string; spend: number };
  topVendor: { name: string; spend: number };
  averageTransactionValue: number;
}

export interface DepartmentSpend {
  department: string;
  spend: number;
  count: number;
}

export interface VendorSpend {
  vendor: string;
  spend: number;
  count: number;
}

export interface MonthlySpend {
  month: string;
  spend: number;
  count: number;
}

/**
 * Calculate KPIs from procurement data
 */
export function calculateKPIs(data: ProcurementRecord[]): KPIData {
  const totalSpend = data.reduce((sum, record) => sum + record.totalPrice, 0);
  const totalTransactions = data.length;

  const vendors = new Set(data.map((r) => r.vendor).filter(Boolean));
  const departments = new Set(data.map((r) => r.department).filter(Boolean));

  // Calculate spend by department
  const departmentSpend = data.reduce(
    (acc, record) => {
      if (record.department) {
        acc[record.department] = (acc[record.department] || 0) + record.totalPrice;
      }
      return acc;
    },
    {} as Record<string, number>
  );

  // Calculate spend by vendor
  const vendorSpend = data.reduce(
    (acc, record) => {
      if (record.vendor) {
        acc[record.vendor] = (acc[record.vendor] || 0) + record.totalPrice;
      }
      return acc;
    },
    {} as Record<string, number>
  );

  // Find top department
  const topDepartmentEntry = Object.entries(departmentSpend).sort(
    ([, a], [, b]) => b - a
  )[0] || ["N/A", 0];

  // Find top vendor
  const topVendorEntry = Object.entries(vendorSpend).sort(
    ([, a], [, b]) => b - a
  )[0] || ["N/A", 0];

  return {
    totalSpend,
    totalTransactions,
    uniqueVendors: vendors.size,
    uniqueDepartments: departments.size,
    topDepartment: { name: topDepartmentEntry[0], spend: topDepartmentEntry[1] },
    topVendor: { name: topVendorEntry[0], spend: topVendorEntry[1] },
    averageTransactionValue:
      totalTransactions > 0 ? totalSpend / totalTransactions : 0,
  };
}

/**
 * Aggregate spending by department
 */
export function aggregateByDepartment(
  data: ProcurementRecord[]
): DepartmentSpend[] {
  const grouped = data.reduce(
    (acc, record) => {
      const dept = record.department || "Uncategorized";
      if (!acc[dept]) {
        acc[dept] = { spend: 0, count: 0 };
      }
      acc[dept].spend += record.totalPrice;
      acc[dept].count += 1;
      return acc;
    },
    {} as Record<string, { spend: number; count: number }>
  );

  return Object.entries(grouped)
    .map(([department, { spend, count }]) => ({
      department,
      spend,
      count,
    }))
    .sort((a, b) => b.spend - a.spend);
}

/**
 * Aggregate spending by vendor (top N)
 */
export function aggregateByVendor(
  data: ProcurementRecord[],
  topN: number = 10
): VendorSpend[] {
  const grouped = data.reduce(
    (acc, record) => {
      const vendor = record.vendor || "Unknown";
      if (!acc[vendor]) {
        acc[vendor] = { spend: 0, count: 0 };
      }
      acc[vendor].spend += record.totalPrice;
      acc[vendor].count += 1;
      return acc;
    },
    {} as Record<string, { spend: number; count: number }>
  );

  return Object.entries(grouped)
    .map(([vendor, { spend, count }]) => ({
      vendor,
      spend,
      count,
    }))
    .sort((a, b) => b.spend - a.spend)
    .slice(0, topN);
}

/**
 * Aggregate spending by month
 */
export function aggregateByMonth(data: ProcurementRecord[]): MonthlySpend[] {
  const grouped = data.reduce(
    (acc, record) => {
      if (!record.date) return acc;

      // Parse date (assuming format like "DD/MM/YYYY" or "YYYY-MM-DD")
      let month: string;
      const dateParts = record.date.split(/[-/]/);

      if (dateParts.length >= 2) {
        // Try to determine format
        if (dateParts[0].length === 4) {
          // YYYY-MM-DD format
          month = `${dateParts[0]}-${dateParts[1].padStart(2, "0")}`;
        } else {
          // DD/MM/YYYY format
          month = `${dateParts[2]}-${dateParts[1].padStart(2, "0")}`;
        }
      } else {
        return acc;
      }

      if (!acc[month]) {
        acc[month] = { spend: 0, count: 0 };
      }
      acc[month].spend += record.totalPrice;
      acc[month].count += 1;
      return acc;
    },
    {} as Record<string, { spend: number; count: number }>
  );

  return Object.entries(grouped)
    .map(([month, { spend, count }]) => ({
      month,
      spend,
      count,
    }))
    .sort((a, b) => a.month.localeCompare(b.month));
}
