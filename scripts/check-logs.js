const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgres://6105a086f72f78dbb699bd736eeeddad3dabd83a6aef30cbb6d29c1107909e06:sk_kS10ioXKLZnp2Uu_22G3n@db.prisma.io:5432/postgres?sslmode=require',
});

async function main() {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT action, "userName", "userEmail", description, "createdAt"
      FROM "ActivityLog"
      ORDER BY "createdAt" DESC
      LIMIT 10
    `);
    console.log('Recent Activity Logs:');
    console.log('=====================');
    result.rows.forEach((row, i) => {
      console.log(`${i + 1}. [${row.action}] ${row.userName || 'System'} (${row.userEmail || '-'})`);
      console.log(`   ${row.description}`);
      console.log(`   ${new Date(row.createdAt).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}`);
      console.log('');
    });
    if (result.rows.length === 0) {
      console.log('No activity logs found.');
    }
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);
