import { NextRequest, NextResponse } from "next/server";
import puppeteer from "puppeteer";

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { date, dateDisplay, openingBalance, todayExpenses, closingBalance, transactions, departmentExpenses } = data;

    // Generate HTML content
    const html = generateHTML({
      date,
      dateDisplay,
      openingBalance,
      todayExpenses,
      closingBalance,
      transactions,
      departmentExpenses,
    });

    // Launch Puppeteer
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    // Generate PDF
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "20mm",
        right: "15mm",
        bottom: "20mm",
        left: "15mm",
      },
    });

    await browser.close();

    // Return PDF
    return new NextResponse(pdf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="petty-cash-report-${date}.pdf"`,
      },
    });
  } catch (error) {
    console.error("PDF generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    );
  }
}

interface Transaction {
  id: number;
  date: string | null;
  reference: string | null;
  vendor: string | null;
  productName: string | null;
  totalPrice: number;
  minorGroup: string | null;
  note: string | null;
}

interface DepartmentExpense {
  department: string;
  total: number;
  count: number;
}

interface ReportData {
  date: string;
  dateDisplay: string;
  openingBalance: number;
  todayExpenses: number;
  closingBalance: number;
  transactions: Transaction[];
  departmentExpenses: DepartmentExpense[];
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function generateHTML(data: ReportData): string {
  const { dateDisplay, openingBalance, todayExpenses, closingBalance, transactions, departmentExpenses } = data;

  // Group transactions by department
  const groupedByDept = new Map<string, Transaction[]>();
  for (const tx of transactions) {
    const dept = tx.minorGroup || "ไม่ระบุแผนก";
    const existing = groupedByDept.get(dept) || [];
    groupedByDept.set(dept, [...existing, tx]);
  }

  const sortedDepts = Array.from(groupedByDept.entries())
    .map(([dept, txs]) => ({
      dept,
      txs,
      total: txs.reduce((sum, t) => sum + t.totalPrice, 0),
    }))
    .sort((a, b) => b.total - a.total);

  let tableRows = "";
  let runningIndex = 0;

  for (const { dept, txs, total } of sortedDepts) {
    // Department header
    tableRows += `
      <tr class="dept-header">
        <td colspan="6">${dept} (${txs.length} รายการ)</td>
      </tr>
    `;

    // Transactions
    for (const tx of txs) {
      runningIndex++;
      tableRows += `
        <tr>
          <td class="center">${runningIndex}</td>
          <td>${tx.date ? new Date(tx.date).toLocaleDateString("th-TH", { day: "numeric", month: "numeric", year: "2-digit" }) : "-"}</td>
          <td>${tx.reference || "-"}</td>
          <td>${tx.vendor || "-"}</td>
          <td>${tx.productName || "-"}</td>
          <td class="right">${formatCurrency(tx.totalPrice)}</td>
        </tr>
      `;
    }

    // Department subtotal
    tableRows += `
      <tr class="dept-subtotal">
        <td colspan="5" class="right">รวม ${dept}</td>
        <td class="right">${formatCurrency(total)}</td>
      </tr>
    `;
  }

  return `
    <!DOCTYPE html>
    <html lang="th">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>รายงานเงินสดย่อยประจำวัน</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700&display=swap');

        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: 'Sarabun', 'Tahoma', sans-serif;
          font-size: 12px;
          line-height: 1.4;
          color: #333;
        }

        .container {
          padding: 10px;
        }

        h1 {
          font-size: 20px;
          font-weight: 700;
          color: #1a365d;
          margin-bottom: 5px;
        }

        .date {
          font-size: 14px;
          color: #666;
          margin-bottom: 20px;
        }

        .summary {
          margin-bottom: 25px;
        }

        .summary h2 {
          font-size: 14px;
          font-weight: 600;
          margin-bottom: 10px;
        }

        .summary-grid {
          display: flex;
          gap: 20px;
        }

        .summary-item {
          background: #f7fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 12px 16px;
          min-width: 150px;
        }

        .summary-item .label {
          font-size: 11px;
          color: #718096;
          margin-bottom: 4px;
        }

        .summary-item .value {
          font-size: 16px;
          font-weight: 700;
        }

        .summary-item .value.expense {
          color: #e53e3e;
        }

        .summary-item .value.balance {
          color: #38a169;
        }

        .summary-item .value.negative {
          color: #e53e3e;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 15px;
          font-size: 11px;
        }

        th {
          background: #2d3748;
          color: white;
          padding: 10px 8px;
          text-align: left;
          font-weight: 600;
        }

        th.center, td.center {
          text-align: center;
        }

        th.right, td.right {
          text-align: right;
        }

        td {
          padding: 8px;
          border-bottom: 1px solid #e2e8f0;
        }

        tr:nth-child(even) {
          background: #f7fafc;
        }

        tr.dept-header {
          background: #ebf4ff !important;
        }

        tr.dept-header td {
          font-weight: 600;
          color: #2b6cb0;
          padding: 10px 8px;
        }

        tr.dept-subtotal {
          background: #f0f0f0 !important;
        }

        tr.dept-subtotal td {
          font-weight: 600;
          color: #dd6b20;
        }

        tr.grand-total {
          background: #e2e8f0 !important;
        }

        tr.grand-total td {
          font-weight: 700;
          font-size: 13px;
          color: #c53030;
          padding: 12px 8px;
        }

        .footer {
          margin-top: 30px;
          text-align: center;
          font-size: 10px;
          color: #a0aec0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>รายงานเงินสดย่อยประจำวัน</h1>
        <div class="date">วันที่: ${dateDisplay}</div>

        <div class="summary">
          <h2>สรุป</h2>
          <div class="summary-grid">
            <div class="summary-item">
              <div class="label">เงินสดยกมา</div>
              <div class="value">${formatCurrency(openingBalance)} บาท</div>
            </div>
            <div class="summary-item">
              <div class="label">รายจ่ายวันนี้</div>
              <div class="value expense">${formatCurrency(todayExpenses)} บาท</div>
            </div>
            <div class="summary-item">
              <div class="label">เงินสดคงเหลือ</div>
              <div class="value ${closingBalance >= 0 ? "balance" : "negative"}">${formatCurrency(closingBalance)} บาท</div>
            </div>
            <div class="summary-item">
              <div class="label">จำนวนรายการ</div>
              <div class="value">${transactions.length} รายการ</div>
            </div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th class="center" style="width: 40px;">ลำดับ</th>
              <th style="width: 70px;">วันที่</th>
              <th style="width: 120px;">อ้างอิง</th>
              <th>ผู้ขาย</th>
              <th>รายการ</th>
              <th class="right" style="width: 90px;">จำนวนเงิน</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
            <tr class="grand-total">
              <td colspan="5" class="right">รวมทั้งสิ้น</td>
              <td class="right">${formatCurrency(todayExpenses)}</td>
            </tr>
          </tbody>
        </table>

        <div class="footer">
          สร้างโดย Procurement Dashboard - ${new Date().toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
        </div>
      </div>
    </body>
    </html>
  `;
}
