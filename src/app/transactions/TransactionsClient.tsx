"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, Search, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { format, parse } from "date-fns";
import { th } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { TransactionTable } from "./TransactionTable";
import { AddTransactionDialog } from "./AddTransactionDialog";
import type { PaginatedTransactions, FilterOptions, TransactionWithOverride } from "@/lib/transactions-db";

interface TransactionsClientProps {
  data: PaginatedTransactions;
  filterOptions: FilterOptions;
  currentFilters: {
    startDate: string;
    endDate: string;
    vendor?: string;
    payment?: string;
    minorGroup?: string;
    search?: string;
  };
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function TransactionsClient({
  data,
  filterOptions,
  currentFilters,
}: TransactionsClientProps) {
  const router = useRouter();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<TransactionWithOverride | null>(null);

  // Filter states
  const [startDate, setStartDate] = useState<Date | undefined>(
    currentFilters.startDate ? parse(currentFilters.startDate, "yyyy-MM-dd", new Date()) : undefined
  );
  const [endDate, setEndDate] = useState<Date | undefined>(
    currentFilters.endDate ? parse(currentFilters.endDate, "yyyy-MM-dd", new Date()) : undefined
  );
  const [vendor, setVendor] = useState(currentFilters.vendor || "");
  const [payment, setPayment] = useState(currentFilters.payment || "");
  const [minorGroup, setMinorGroup] = useState(currentFilters.minorGroup || "");
  const [search, setSearch] = useState(currentFilters.search || "");

  // Build URL with filters
  const buildUrl = (page: number = 1) => {
    const params = new URLSearchParams();
    params.set("page", page.toString());
    if (startDate) params.set("startDate", format(startDate, "yyyy-MM-dd"));
    if (endDate) params.set("endDate", format(endDate, "yyyy-MM-dd"));
    if (vendor) params.set("vendor", vendor);
    if (payment) params.set("payment", payment);
    if (minorGroup) params.set("minorGroup", minorGroup);
    if (search) params.set("search", search);
    return `/transactions?${params.toString()}`;
  };

  // Apply filters
  const handleApplyFilters = () => {
    router.push(buildUrl(1));
  };

  // Clear filters
  const handleClearFilters = () => {
    setVendor("");
    setPayment("");
    setMinorGroup("");
    setSearch("");
    const params = new URLSearchParams();
    params.set("page", "1");
    if (startDate) params.set("startDate", format(startDate, "yyyy-MM-dd"));
    if (endDate) params.set("endDate", format(endDate, "yyyy-MM-dd"));
    router.push(`/transactions?${params.toString()}`);
  };

  // Pagination
  const handlePageChange = (newPage: number) => {
    router.push(buildUrl(newPage));
  };

  const { page, total, totalPages } = data.pagination;
  const startItem = (page - 1) * data.pagination.limit + 1;
  const endItem = Math.min(page * data.pagination.limit, total);

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">ตัวกรอง</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {/* Date Range */}
            <div className="space-y-2">
              <Label>วันที่เริ่มต้น</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "d MMM yyyy", { locale: th }) : "เลือกวันที่"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>วันที่สิ้นสุด</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "d MMM yyyy", { locale: th }) : "เลือกวันที่"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Vendor */}
            <div className="space-y-2">
              <Label>ร้านค้า/ผู้ขาย</Label>
              <Select value={vendor || "__all__"} onValueChange={(v) => setVendor(v === "__all__" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="ทั้งหมด" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">ทั้งหมด</SelectItem>
                  {filterOptions.vendors.map((v) => (
                    <SelectItem key={v} value={v}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Payment Type */}
            <div className="space-y-2">
              <Label>ประเภทการจ่าย</Label>
              <Select value={payment || "__all__"} onValueChange={(v) => setPayment(v === "__all__" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="ทั้งหมด" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">ทั้งหมด</SelectItem>
                  {filterOptions.payments.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Department */}
            <div className="space-y-2">
              <Label>แผนก</Label>
              <Select value={minorGroup || "__all__"} onValueChange={(v) => setMinorGroup(v === "__all__" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="ทั้งหมด" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">ทั้งหมด</SelectItem>
                  {filterOptions.departments.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Search */}
            <div className="space-y-2 lg:col-span-2 xl:col-span-4">
              <Label>ค้นหา</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="ค้นหาตาม อ้างอิง, รายการ..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleApplyFilters();
                  }}
                  className="flex-1"
                />
                <Button onClick={handleApplyFilters}>
                  <Search className="mr-2 h-4 w-4" />
                  กรอง
                </Button>
                <Button variant="outline" onClick={handleClearFilters}>
                  ล้าง
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Header */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500 dark:text-gray-400">
          แสดง {startItem} - {endItem} จาก {total.toLocaleString()} รายการ
          {data.stats.pageAmount > 0 && (
            <span className="ml-4 font-medium text-gray-900 dark:text-gray-100">
              รวมหน้านี้: {formatCurrency(data.stats.pageAmount)} บาท
            </span>
          )}
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          เพิ่มรายการ
        </Button>
      </div>

      {/* Transaction Table */}
      <Card>
        <CardContent className="p-0">
          <TransactionTable
            transactions={data.transactions}
            onEditManualTransaction={(tx) => {
              setEditingTransaction(tx);
              setIsAddDialogOpen(true);
            }}
          />
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(page - 1)}
            disabled={page <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
            ก่อนหน้า
          </Button>

          <div className="flex items-center gap-1">
            {/* First page */}
            {page > 3 && (
              <>
                <Button
                  variant={page === 1 ? "default" : "outline"}
                  size="sm"
                  onClick={() => handlePageChange(1)}
                >
                  1
                </Button>
                {page > 4 && <span className="px-2">...</span>}
              </>
            )}

            {/* Pages around current */}
            {Array.from({ length: 5 }, (_, i) => page - 2 + i)
              .filter((p) => p >= 1 && p <= totalPages)
              .map((p) => (
                <Button
                  key={p}
                  variant={p === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => handlePageChange(p)}
                >
                  {p}
                </Button>
              ))}

            {/* Last page */}
            {page < totalPages - 2 && (
              <>
                {page < totalPages - 3 && <span className="px-2">...</span>}
                <Button
                  variant={page === totalPages ? "default" : "outline"}
                  size="sm"
                  onClick={() => handlePageChange(totalPages)}
                >
                  {totalPages}
                </Button>
              </>
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(page + 1)}
            disabled={page >= totalPages}
          >
            ถัดไป
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Add/Edit Transaction Dialog */}
      <AddTransactionDialog
        open={isAddDialogOpen}
        onOpenChange={(open) => {
          setIsAddDialogOpen(open);
          if (!open) setEditingTransaction(null);
        }}
        filterOptions={filterOptions}
        editTransaction={editingTransaction}
      />
    </div>
  );
}
