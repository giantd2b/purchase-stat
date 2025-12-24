"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  approveTransactionAction,
  rejectTransactionAction,
} from "../actions";

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

function getTransactionTypeBadge(type: string) {
  const label = getTransactionTypeLabel(type);

  if (type === "WITHDRAW" || type === "ADJUST_OUT" || type === "TRANSFER_OUT") {
    return <Badge variant="destructive">{label}</Badge>;
  }
  if (type === "RECEIVE" || type === "ADJUST_IN" || type === "TRANSFER_IN") {
    return <Badge className="bg-green-600">{label}</Badge>;
  }
  return <Badge>{label}</Badge>;
}

export default function ApprovalClient({ transactions }: Props) {
  const [isPending, startTransition] = useTransition();
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedTxId, setSelectedTxId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [expandedTx, setExpandedTx] = useState<string | null>(null);

  const handleApprove = (transactionId: string) => {
    startTransition(async () => {
      const result = await approveTransactionAction(transactionId);
      if (result.error) {
        setError(result.error);
      }
    });
  };

  const openRejectDialog = (transactionId: string) => {
    setSelectedTxId(transactionId);
    setRejectReason("");
    setRejectDialogOpen(true);
  };

  const handleReject = () => {
    if (!selectedTxId) return;

    startTransition(async () => {
      const result = await rejectTransactionAction(selectedTxId, rejectReason);
      if (result.error) {
        setError(result.error);
      } else {
        setRejectDialogOpen(false);
        setSelectedTxId(null);
        setRejectReason("");
      }
    });
  };

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                รายการรออนุมัติ
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                อนุมัติหรือปฏิเสธรายการเบิกจ่าย/ปรับยอด
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
        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-md mb-6">
            {error}
          </div>
        )}

        {transactions.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <div className="text-5xl mb-4">✅</div>
              <p className="text-gray-500">ไม่มีรายการรออนุมัติ</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {transactions.map((tx) => (
              <Card key={tx.id}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg font-mono">
                        {tx.transactionNumber}
                      </CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        {getTransactionTypeBadge(tx.type)}
                        <span className="text-sm text-gray-500">
                          {formatDate(tx.transactionDate)}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                        disabled={isPending}
                        onClick={() => handleApprove(tx.id)}
                      >
                        {isPending ? "..." : "อนุมัติ"}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={isPending}
                        onClick={() => openRejectDialog(tx.id)}
                      >
                        ปฏิเสธ
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                    <div>
                      <span className="text-gray-500">ผู้ขอ:</span>{" "}
                      <span className="font-medium">
                        {tx.requestedByUser.name || tx.requestedByUser.email}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">จำนวนรายการ:</span>{" "}
                      <span className="font-medium">{tx.items.length}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">มูลค่า:</span>{" "}
                      <span className="font-medium">
                        {formatCurrency(tx.totalValue)} บาท
                      </span>
                    </div>
                    {tx.description && (
                      <div>
                        <span className="text-gray-500">หมายเหตุ:</span>{" "}
                        <span className="font-medium">{tx.description}</span>
                      </div>
                    )}
                  </div>

                  {/* Expandable items */}
                  <div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setExpandedTx(expandedTx === tx.id ? null : tx.id)
                      }
                    >
                      {expandedTx === tx.id ? "ซ่อนรายการ" : "ดูรายการสินค้า"}
                    </Button>

                    {expandedTx === tx.id && (
                      <Table className="mt-2">
                        <TableHeader>
                          <TableRow>
                            <TableHead>รหัส</TableHead>
                            <TableHead>ชื่อสินค้า</TableHead>
                            <TableHead className="text-right">จำนวน</TableHead>
                            <TableHead className="text-right">ราคา/หน่วย</TableHead>
                            <TableHead className="text-right">รวม</TableHead>
                            <TableHead>วัตถุประสงค์</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {tx.items.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell className="font-mono text-sm">
                                {item.stockItem.item.id}
                              </TableCell>
                              <TableCell>{item.stockItem.item.name}</TableCell>
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
                              <TableCell className="text-gray-500">
                                {item.purpose || "-"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ปฏิเสธรายการ</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>เหตุผลในการปฏิเสธ (ไม่บังคับ)</Label>
              <Input
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="ระบุเหตุผล..."
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setRejectDialogOpen(false)}
              >
                ยกเลิก
              </Button>
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={isPending}
              >
                {isPending ? "กำลังบันทึก..." : "ยืนยันปฏิเสธ"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
