"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import type { DailyPettyCashSummary } from "@/lib/petty-cash-report-db";

interface ExportButtonsProps {
  date: Date;
  summary: DailyPettyCashSummary;
  openingBalance: number;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function ExportButtons({ date, summary, openingBalance }: ExportButtonsProps) {
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const dateStr = format(date, "yyyy-MM-dd");
  const dateDisplay = format(date, "d MMMM yyyy", { locale: th });
  const closingBalance = openingBalance - summary.todayExpenses;

  const handleExportExcel = async () => {
    setIsExportingExcel(true);
    try {
      const wb = XLSX.utils.book_new();

      // Summary data
      const summaryData = [
        ["รายงานเงินสดย่อยประจำวัน"],
        [`วันที่: ${dateDisplay}`],
        [""],
        ["สรุป", "จำนวนเงิน (บาท)"],
        ["เงินสดยกมา", openingBalance],
        ["รายจ่ายวันนี้", summary.todayExpenses],
        ["เงินสดคงเหลือ", closingBalance],
        [""],
        ["จำนวนรายการ", summary.transactions.length],
      ];

      // Group transactions by department
      const groupedByDept = new Map<string, typeof summary.transactions>();
      for (const tx of summary.transactions) {
        const dept = tx.minorGroup || "ไม่ระบุแผนก";
        const existing = groupedByDept.get(dept) || [];
        groupedByDept.set(dept, [...existing, tx]);
      }

      // Sort departments by total (descending)
      const sortedDepts = Array.from(groupedByDept.entries())
        .map(([dept, txs]) => ({
          dept,
          txs,
          total: txs.reduce((sum, t) => sum + t.totalPrice, 0),
        }))
        .sort((a, b) => b.total - a.total);

      // Build grouped transactions data
      const txHeaders = ["ลำดับ", "วันที่", "อ้างอิง", "ผู้ขาย", "รายการ", "จำนวนเงิน", "หมายเหตุ"];
      const txData: (string | number)[][] = [];
      let runningIndex = 0;

      for (const { dept, txs, total } of sortedDepts) {
        // Department header
        txData.push([`📁 ${dept} (${txs.length} รายการ)`, "", "", "", "", "", ""]);

        // Transactions in this department
        for (const tx of txs) {
          runningIndex++;
          txData.push([
            runningIndex,
            tx.date ? format(new Date(tx.date), "d/M/yyyy") : "-",
            tx.reference || "-",
            tx.vendor || "-",
            tx.productName || "-",
            tx.totalPrice,
            tx.note || "",
          ]);
        }

        // Department subtotal
        txData.push(["", "", "", "", `รวม ${dept}`, total, ""]);
      }

      // Grand total row
      txData.push(["", "", "", "", "รวมทั้งสิ้น", summary.todayExpenses, ""]);

      // Create worksheets
      const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
      const wsTx = XLSX.utils.aoa_to_sheet([txHeaders, ...txData]);

      // Set column widths
      wsTx["!cols"] = [
        { wch: 8 },   // ลำดับ
        { wch: 12 },  // วันที่
        { wch: 15 },  // อ้างอิง
        { wch: 30 },  // ผู้ขาย
        { wch: 30 },  // รายการ
        { wch: 15 },  // จำนวนเงิน
        { wch: 25 },  // หมายเหตุ
      ];

      XLSX.utils.book_append_sheet(wb, wsSummary, "สรุป");
      XLSX.utils.book_append_sheet(wb, wsTx, "รายการ");

      XLSX.writeFile(wb, `petty-cash-report-${dateStr}.xlsx`);
      toast.success("ส่งออกไฟล์ Excel สำเร็จ");
    } catch (error) {
      console.error("Export Excel error:", error);
      toast.error("ไม่สามารถส่งออกไฟล์ Excel ได้");
    }
    setIsExportingExcel(false);
  };

  const handleExportPdf = async () => {
    setIsExportingPdf(true);
    try {
      // Call API to generate PDF with Puppeteer
      const response = await fetch("/api/export-pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          date: dateStr,
          dateDisplay,
          openingBalance: openingBalance,
          todayExpenses: summary.todayExpenses,
          closingBalance,
          transactions: summary.transactions,
          departmentExpenses: summary.departmentExpenses,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate PDF");
      }

      // Download the PDF
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `petty-cash-report-${dateStr}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("ส่งออกไฟล์ PDF สำเร็จ");
    } catch (error) {
      console.error("Export PDF error:", error);
      toast.error("ไม่สามารถส่งออกไฟล์ PDF ได้");
    }
    setIsExportingPdf(false);
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleExportExcel}
        disabled={isExportingExcel}
      >
        {isExportingExcel ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <FileSpreadsheet className="h-4 w-4 mr-2" />
        )}
        Excel
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handleExportPdf}
        disabled={isExportingPdf}
      >
        {isExportingPdf ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <FileText className="h-4 w-4 mr-2" />
        )}
        PDF
      </Button>
    </div>
  );
}
