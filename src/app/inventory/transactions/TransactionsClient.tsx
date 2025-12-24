"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { StockTransactionWithDetails } from "@/lib/inventory-db";

interface Props {
  transactions: StockTransactionWithDetails[];
}

function formatNumber(num: number): string {
  return num.toLocaleString("th-TH", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function formatCurrency(num: number): string {
  return num.toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getTransactionTypeLabel(type: string): string {
  switch (type) {
    case "RECEIVE":
      return "นำเข้า";
    case "WITHDRAW":
      return "เบิกจ่าย";
    case "ADJUST_IN":
      return "ปรับเพิ่ม";
    case "ADJUST_OUT":
      return "ปรับลด";
    case "TRANSFER_OUT":
      return "โอนออก";
    case "TRANSFER_IN":
      return "รับโอน";
    case "RETURN":
      return "คืน";
    default:
      return type;
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case "PENDING":
      return "รออนุมัติ";
    case "APPROVED":
      return "อนุมัติแล้ว";
    case "REJECTED":
      return "ปฏิเสธ";
    default:
      return status;
  }
}

function getTypeBadge(type: string) {
  const label = getTransactionTypeLabel(type);
  if (type === "WITHDRAW" || type === "ADJUST_OUT" || type === "TRANSFER_OUT") {
    return <Badge variant="destructive">{label}</Badge>;
  }
  if (type === "RECEIVE" || type === "ADJUST_IN" || type === "TRANSFER_IN" || type === "RETURN") {
    return <Badge className="bg-green-600">{label}</Badge>;
  }
  return <Badge>{label}</Badge>;
}

function getStatusBadge(status: string) {
  const label = getStatusLabel(status);
  switch (status) {
    case "PENDING":
      return <Badge variant="outline" className="border-yellow-500 text-yellow-600">{label}</Badge>;
    case "APPROVED":
      return <Badge variant="outline" className="border-green-500 text-green-600">{label}</Badge>;
    case "REJECTED":
      return <Badge variant="outline" className="border-red-500 text-red-600">{label}</Badge>;
    default:
      return <Badge variant="outline">{label}</Badge>;
  }
}

export default function TransactionsClient({ transactions }: Props) {
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [expandedTx, setExpandedTx] = useState<string | null>(null);

  const filteredTransactions = transactions.filter((tx) => {
    if (typeFilter !== "all" && tx.type !== typeFilter) return false;
    if (statusFilter !== "all" && tx.status !== statusFilter) return false;
    return true;
  });

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                ประวัติรายการ
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                ดูประวัตินำเข้า-เบิกจ่ายสินค้าทั้งหมด
              </p>
            </div>
            <Link href="/inventory">
              <Button variant="outline">กลับหน้าคลังสินค้า</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex gap-4 flex-wrap">
              <div className="w-48">
                <label className="text-sm text-gray-500 mb-1 block">ประเภท</label>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">ทั้งหมด</SelectItem>
                    <SelectItem value="RECEIVE">นำเข้า</SelectItem>
                    <SelectItem value="WITHDRAW">เบิกจ่าย</SelectItem>
                    <SelectItem value="ADJUST_IN">ปรับเพิ่ม</SelectItem>
                    <SelectItem value="ADJUST_OUT">ปรับลด</SelectItem>
                    <SelectItem value="TRANSFER_OUT">โอนออก</SelectItem>
                    <SelectItem value="TRANSFER_IN">รับโอน</SelectItem>
                    <SelectItem value="RETURN">คืน</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="w-48">
                <label className="text-sm text-gray-500 mb-1 block">สถานะ</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">ทั้งหมด</SelectItem>
                    <SelectItem value="PENDING">รออนุมัติ</SelectItem>
                    <SelectItem value="APPROVED">อนุมัติแล้ว</SelectItem>
                    <SelectItem value="REJECTED">ปฏิเสธ</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1 text-right self-end">
                <span className="text-sm text-gray-500">
                  แสดง {filteredTransactions.length} รายการ
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Transactions Table */}
        <Card>
          <CardHeader>
            <CardTitle>รายการทั้งหมด</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredTransactions.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                ไม่พบรายการ
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>เลขที่</TableHead>
                    <TableHead>ประเภท</TableHead>
                    <TableHead>สถานะ</TableHead>
                    <TableHead>ผู้ขอ</TableHead>
                    <TableHead className="text-right">รายการ</TableHead>
                    <TableHead className="text-right">มูลค่า</TableHead>
                    <TableHead>วันที่</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.map((tx) => (
                    <>
                      <TableRow key={tx.id}>
                        <TableCell className="font-mono text-sm">
                          {tx.transactionNumber}
                        </TableCell>
                        <TableCell>{getTypeBadge(tx.type)}</TableCell>
                        <TableCell>{getStatusBadge(tx.status)}</TableCell>
                        <TableCell>
                          {tx.requestedByUser.name || tx.requestedByUser.email}
                        </TableCell>
                        <TableCell className="text-right">
                          {tx.items.length}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(tx.totalValue)}
                        </TableCell>
                        <TableCell>{formatDate(tx.transactionDate)}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setExpandedTx(expandedTx === tx.id ? null : tx.id)
                            }
                          >
                            {expandedTx === tx.id ? "▲" : "▼"}
                          </Button>
                        </TableCell>
                      </TableRow>
                      {expandedTx === tx.id && (
                        <TableRow>
                          <TableCell colSpan={8} className="bg-gray-50">
                            <div className="p-4">
                              {tx.description && (
                                <p className="text-sm text-gray-600 mb-3">
                                  <strong>หมายเหตุ:</strong> {tx.description}
                                </p>
                              )}
                              {tx.rejectReason && (
                                <p className="text-sm text-red-600 mb-3">
                                  <strong>เหตุผลปฏิเสธ:</strong>{" "}
                                  {tx.rejectReason}
                                </p>
                              )}
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>รหัส</TableHead>
                                    <TableHead>ชื่อสินค้า</TableHead>
                                    <TableHead className="text-right">
                                      จำนวน
                                    </TableHead>
                                    <TableHead className="text-right">
                                      ราคา/หน่วย
                                    </TableHead>
                                    <TableHead className="text-right">
                                      รวม
                                    </TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {tx.items.map((item) => (
                                    <TableRow key={item.id}>
                                      <TableCell className="font-mono text-sm">
                                        {item.stockItem.item.id}
                                      </TableCell>
                                      <TableCell>
                                        {item.stockItem.item.name}
                                      </TableCell>
                                      <TableCell className="text-right">
                                        {formatNumber(item.quantity)}{" "}
                                        {item.stockItem.item.unit}
                                      </TableCell>
                                      <TableCell className="text-right">
                                        {item.unitCost
                                          ? formatCurrency(item.unitCost)
                                          : "-"}
                                      </TableCell>
                                      <TableCell className="text-right">
                                        {item.totalCost
                                          ? formatCurrency(item.totalCost)
                                          : "-"}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
