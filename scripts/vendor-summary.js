import { google } from 'googleapis';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, '..');

// Configuration
const CONFIG = {
  spreadsheetId: '1ZxUeN8h9SRTncNWnwou8RonoRFnTOB_xVA5QFfI4lZ4',
  credentialsPath: join(ROOT_DIR, 'iris-job-xlsx-a43eeed2e7a5.json'),
  outputDir: join(ROOT_DIR, 'output'),
  columns: {
    vendor: 'ผู้ขาย/ผู้ให้บริการ',
    amount: 'มูลค่าก่อนภาษี',
  },
  tableWidth: 100,
};

// Utility functions
const parseNumber = (str) => {
  if (!str) return 0;
  return parseFloat(str.replace(/,/g, '')) || 0;
};

const formatCurrency = (amount) =>
  amount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const formatPercent = (value, total) =>
  ((value / total) * 100).toFixed(2) + '%';

const escapeCsvField = (field) =>
  field.includes(',') || field.includes('"') ? `"${field.replace(/"/g, '""')}"` : field;

// Google Sheets API
async function createSheetsClient() {
  const credentials = JSON.parse(readFileSync(CONFIG.credentialsPath, 'utf8'));
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  return google.sheets({ version: 'v4', auth });
}

async function fetchSheetData(sheetName = 'Sheet1') {
  const sheets = await createSheetsClient();
  console.log(`Fetching ${sheetName} data...`);

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: CONFIG.spreadsheetId,
    range: sheetName,
  });

  const rows = response.data.values;
  if (!rows?.length) {
    console.log('No data found.');
    return [];
  }

  const [headers, ...dataRows] = rows;
  return dataRows.map((row) =>
    Object.fromEntries(headers.map((header, i) => [header, row[i] || '']))
  );
}

// Data aggregation
function aggregateByVendor(data) {
  const vendorMap = data.reduce((acc, row) => {
    const vendor = row[CONFIG.columns.vendor] || 'Unknown';
    const amount = parseNumber(row[CONFIG.columns.amount]);

    if (!acc[vendor]) {
      acc[vendor] = { vendor, totalAmount: 0, transactionCount: 0 };
    }
    acc[vendor].totalAmount += amount;
    acc[vendor].transactionCount += 1;
    return acc;
  }, {});

  return Object.values(vendorMap).sort((a, b) => b.totalAmount - a.totalAmount);
}

// Output formatting
function printTable(vendors, grandTotal, totalTransactions) {
  const { tableWidth } = CONFIG;
  const divider = '='.repeat(tableWidth);
  const separator = '-'.repeat(tableWidth);

  console.log(divider);
  console.log('TOTAL SPENDING BY VENDOR');
  console.log(divider);
  console.log(
    'Rank'.padEnd(6) +
    'Vendor'.padEnd(50) +
    'Total (THB)'.padStart(20) +
    'Transactions'.padStart(15) +
    '% of Total'.padStart(12)
  );
  console.log(separator);

  vendors.forEach((v, i) => {
    console.log(
      String(i + 1).padEnd(6) +
      v.vendor.substring(0, 48).padEnd(50) +
      formatCurrency(v.totalAmount).padStart(20) +
      v.transactionCount.toLocaleString().padStart(15) +
      formatPercent(v.totalAmount, grandTotal).padStart(12)
    );
  });

  console.log(separator);
  console.log(
    ''.padEnd(6) +
    'GRAND TOTAL'.padEnd(50) +
    formatCurrency(grandTotal).padStart(20) +
    totalTransactions.toLocaleString().padStart(15) +
    '100.00%'.padStart(12)
  );
  console.log(divider);
}

function printTopVendors(vendors, grandTotal, count = 10) {
  console.log(`\n--- TOP ${count} VENDORS ---`);
  vendors.slice(0, count).forEach((v, i) => {
    console.log(
      `${i + 1}. ${v.vendor}: ฿${formatCurrency(v.totalAmount)} (${formatPercent(v.totalAmount, grandTotal)})`
    );
  });
}

// File export
function ensureOutputDir() {
  mkdirSync(CONFIG.outputDir, { recursive: true });
}

function saveToJson(vendors, filename = 'vendor-summary.json') {
  ensureOutputDir();
  const filepath = join(CONFIG.outputDir, filename);
  writeFileSync(filepath, JSON.stringify(vendors, null, 2), 'utf8');
  console.log(`Summary saved to ${filepath}`);
}

function saveToCsv(vendors, grandTotal, filename = 'vendor-summary.csv') {
  ensureOutputDir();
  const filepath = join(CONFIG.outputDir, filename);
  const header = 'Rank,Vendor,Total (THB),Transactions,% of Total';
  const rows = vendors.map((v, i) =>
    [
      i + 1,
      escapeCsvField(v.vendor),
      v.totalAmount.toFixed(2),
      v.transactionCount,
      formatPercent(v.totalAmount, grandTotal),
    ].join(',')
  );

  writeFileSync(filepath, '\uFEFF' + [header, ...rows].join('\n'), 'utf8');
  console.log(`Summary saved to ${filepath}`);
}

// Main
async function summarizeByVendor() {
  const data = await fetchSheetData();
  console.log(`\nAnalyzing ${data.length} records...\n`);

  const vendors = aggregateByVendor(data);
  const grandTotal = vendors.reduce((sum, v) => sum + v.totalAmount, 0);

  printTable(vendors, grandTotal, data.length);
  console.log(`\nTotal vendors: ${vendors.length}`);

  saveToJson(vendors);
  saveToCsv(vendors, grandTotal);
  printTopVendors(vendors, grandTotal);

  return vendors;
}

summarizeByVendor();
