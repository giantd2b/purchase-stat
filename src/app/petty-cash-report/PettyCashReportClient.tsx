"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, Save, Loader2, Plus } from "lucide-react";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { updateDailyBalanceAction } from "./actions";
import { TransactionTable } from "./TransactionTable";
import { ExportButtons } from "./ExportButtons";
import { AddTransactionForm } from "./AddTransactionForm";
import type {
  DailyPettyCashSummary,
  DailyBalance,
  PettyCashReportTransaction,
} from "@/lib/petty-cash-report-db";

interface PettyCashReportClientProps {
  initialDate: string;
  summary: DailyPettyCashSummary;
  dailyBalance: DailyBalance | null;
  departments: string[];
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function PettyCashReportClient({
  initialDate,
  summary,
  dailyBalance,
  departments,
}: PettyCashReportClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [date, setDate] = useState<Date>(new Date(initialDate));
  const [openingBalance, setOpeningBalance] = useState<string>(
    dailyBalance?.openingBalance.toString() || ""
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<PettyCashReportTransaction | null>(null);

  // Calculate closing balance based on current input
  const currentOpeningBalance = parseFloat(openingBalance) || 0;
  const closingBalance = currentOpeningBalance - summary.todayExpenses;

  const handleDateSelect = (newDate: Date | undefined) => {
    if (newDate) {
      setDate(newDate);
      const dateStr = format(newDate, "yyyy-MM-dd");
      startTransition(() => {
        router.push(`/petty-cash-report?date=${dateStr}`);
      });
    }
  };

  const handleSaveBalance = async () => {
    const balance = parseFloat(openingBalance);
    if (isNaN(balance)) {
      toast.error("กรุณากรอกยอดเงินสดยกมาที่ถูกต้อง");
      return;
    }

    setIsSaving(true);
    const formData = new FormData();
    formData.set("date", format(date, "yyyy-MM-dd"));
    formData.set("openingBalance", balance.toString());

    const result = await updateDailyBalanceAction(formData);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("บันทึกยอดเงินสดยกมาแล้ว");
    }
    setIsSaving(false);
  };

  return (
    <div className="space-y-6">
      {/* Date Picker */}
      <div className="flex items-center justify-between">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-[280px] justify-start text-left font-normal",
                !date && "text-muted-foreground"
              )}
              disabled={isPending}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {date ? (
                format(date, "EEEE d MMMM yyyy", { locale: th })
              ) : (
                <span>เลือกวันที่</span>
              )}
              {isPending && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={date}
              onSelect={handleDateSelect}
              initialFocus
            />
          </PopoverContent>
        </Popover>

        <ExportButtons date={date} summary={summary} openingBalance={currentOpeningBalance} />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Opening Balance - Editable */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">
              เงินสดยกมา
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Input
                  type="number"
                  value={openingBalance}
                  onChange={(e) => setOpeningBalance(e.target.value)}
                  placeholder="0.00"
                  className="text-xl font-bold pr-12"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                  บาท
                </span>
              </div>
              <Button
                size="icon"
                onClick={handleSaveBalance}
                disabled={isSaving}
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
              </Button>
            </div>
            {dailyBalance && (
              <p className="text-xs text-gray-400 mt-2">
                บันทึกล่าสุด: {format(new Date(dailyBalance.date), "d/M/yy")}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Today's Expenses - Read Only */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">
              รายจ่ายวันนี้
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {formatCurrency(summary.todayExpenses)} บาท
            </div>
            <p className="text-xs text-gray-400 mt-2">
              {summary.transactions.length} รายการ
            </p>
          </CardContent>
        </Card>

        {/* Closing Balance - Calculated */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">
              เงินสดคงเหลือ
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={cn(
                "text-2xl font-bold",
                closingBalance >= 0
                  ? "text-green-600 dark:text-green-400"
                  : "text-red-600 dark:text-red-400"
              )}
            >
              {formatCurrency(closingBalance)} บาท
            </div>
            <p className="text-xs text-gray-400 mt-2">
              = ยกมา - รายจ่าย
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Department Expenses */}
      {summary.departmentExpenses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>รายจ่ายตามแผนก</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {summary.departmentExpenses.map((dept) => (
                <div
                  key={dept.department}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-100">
                      {dept.department}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {dept.count} รายการ
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-red-600 dark:text-red-400">
                      {formatCurrency(dept.total)}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {summary.todayExpenses > 0
                        ? `${((dept.total / summary.todayExpenses) * 100).toFixed(1)}%`
                        : "0%"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transaction Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>รายการจ่ายเงินสดย่อย</CardTitle>
          <Button onClick={() => setIsAddFormOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            เพิ่มรายการ
          </Button>
        </CardHeader>
        <CardContent>
          <TransactionTable
            transactions={summary.transactions}
            onEditManualTransaction={(tx) => {
              setEditingTransaction(tx);
              setIsAddFormOpen(true);
            }}
          />
        </CardContent>
      </Card>

      {/* Add/Edit Transaction Dialog */}
      <AddTransactionForm
        open={isAddFormOpen}
        onOpenChange={(open) => {
          setIsAddFormOpen(open);
          if (!open) setEditingTransaction(null);
        }}
        date={date}
        departments={departments}
        editTransaction={editingTransaction}
      />
    </div>
  );
}
