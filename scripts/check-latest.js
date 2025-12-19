const { Pool } = require('pg');
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'procurement_dashboard',
  user: 'procurement',
  password: 'procurement123',
});

async function check() {
  // Get latest rows by updatedAt
  const result = await pool.query(`
    SELECT
      "rowNumber",
      date,
      reference,
      vendor,
      "productName",
      "totalPrice",
      "minorGroup",
      "updatedAt"
    FROM "ProcurementTransaction"
    ORDER BY "updatedAt" DESC
    LIMIT 10
  `);

  console.log('=== 10 Records ล่าสุดที่ Sync ===\n');
  result.rows.forEach((r, i) => {
    console.log(`[${i+1}] Row ${r.rowNumber}`);
    console.log(`    Date: ${r.date ? r.date.toLocaleDateString('th-TH') : '-'}`);
    console.log(`    Ref: ${r.reference || '-'}`);
    console.log(`    Vendor: ${r.vendor || '-'}`);
    console.log(`    Product: ${r.productName || '-'}`);
    console.log(`    Total: ${r.totalPrice ? parseFloat(r.totalPrice).toLocaleString('th-TH') : '-'} THB`);
    console.log(`    Dept: ${r.minorGroup || '-'}`);
    console.log('');
  });

  // Get latest by date
  console.log('=== Records วันที่ล่าสุด (20/12/2025) ===\n');
  const latest = await pool.query(`
    SELECT
      "rowNumber",
      date,
      vendor,
      "productName",
      "totalPrice"
    FROM "ProcurementTransaction"
    WHERE date::date = '2025-12-20'
    ORDER BY "rowNumber"
    LIMIT 10
  `);

  latest.rows.forEach((r, i) => {
    console.log(`[${i+1}] Row ${r.rowNumber}: ${r.vendor} | ${r.productName} | ${parseFloat(r.totalPrice || 0).toLocaleString()} THB`);
  });

  await pool.end();
}

check().catch(console.error);
