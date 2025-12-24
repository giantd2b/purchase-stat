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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  InventoryKPIs,
  StockItemWithDetails,
  StockBatchWithItem,
  StockTransactionWithDetails,
} from "@/lib/inventory-db";
import { receiveItemsAction, withdrawItemsAction } from "./actions";

interface AllItem {
  id: string;
  name: string;
  unit: string | null;
  type: string | null;
  category: string | null;
  supplier1: string | null;
  supplier2: string | null;
  stockItem: {
    id: string;
    currentQuantity: number;
  } | null;
}

interface Props {
  kpis: InventoryKPIs;
  stockItems: StockItemWithDetails[];
  expiringBatches: StockBatchWithItem[];
  pendingTransactions: StockTransactionWithDetails[];
  allItems: AllItem[];
  isAdmin: boolean;
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

function formatDate(date: Date | null): string {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function InventoryClient({
  kpis,
  stockItems,
  expiringBatches,
  pendingTransactions,
  allItems,
  isAdmin,
}: Props) {
  const [receiveDialogOpen, setReceiveDialogOpen] = useState(false);
  const [withdrawDialogOpen, setWithdrawDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Receive form state
  const [receiveItems, setReceiveItems] = useState<
    Array<{
      itemId: string;
      quantity: string;
      unitCost: string;
      batchNumber: string;
      expiryDate: string;
    }>
  >([{ itemId: "", quantity: "", unitCost: "", batchNumber: "", expiryDate: "" }]);

  // Withdraw form state
  const [withdrawItems, setWithdrawItems] = useState<
    Array<{
      stockItemId: string;
      quantity: string;
      purpose: string;
    }>
  >([{ stockItemId: "", quantity: "", purpose: "" }]);

  const handleReceiveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validItems = receiveItems.filter(
      (item) => item.itemId && parseFloat(item.quantity) > 0
    );

    if (validItems.length === 0) {
      setError("กรุณาเพิ่มรายการสินค้าอย่างน้อย 1 รายการ");
      return;
    }

    startTransition(async () => {
      const result = await receiveItemsAction({
        items: validItems.map((item) => ({
          itemId: item.itemId,
          quantity: parseFloat(item.quantity),
          unitCost: parseFloat(item.unitCost) || 0,
          batchNumber: item.batchNumber || undefined,
          expiryDate: item.expiryDate || undefined,
        })),
      });

      if (result.error) {
        setError(result.error);
      } else {
        setReceiveDialogOpen(false);
        setReceiveItems([
          { itemId: "", quantity: "", unitCost: "", batchNumber: "", expiryDate: "" },
        ]);
      }
    });
  };

  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validItems = withdrawItems.filter(
      (item) => item.stockItemId && parseFloat(item.quantity) > 0
    );

    if (validItems.length === 0) {
      setError("กรุณาเพิ่มรายการสินค้าอย่างน้อย 1 รายการ");
      return;
    }

    startTransition(async () => {
      const result = await withdrawItemsAction({
        items: validItems.map((item) => ({
          stockItemId: item.stockItemId,
          quantity: parseFloat(item.quantity),
          purpose: item.purpose || undefined,
        })),
      });

      if (result.error) {
        setError(result.error);
      } else {
        setWithdrawDialogOpen(false);
        setWithdrawItems([{ stockItemId: "", quantity: "", purpose: "" }]);
      }
    });
  };

  const addReceiveItem = () => {
    setReceiveItems([
      ...receiveItems,
      { itemId: "", quantity: "", unitCost: "", batchNumber: "", expiryDate: "" },
    ]);
  };

  const removeReceiveItem = (index: number) => {
    if (receiveItems.length > 1) {
      setReceiveItems(receiveItems.filter((_, i) => i !== index));
    }
  };

  const addWithdrawItem = () => {
    setWithdrawItems([
      ...withdrawItems,
      { stockItemId: "", quantity: "", purpose: "" },
    ]);
  };

  const removeWithdrawItem = (index: number) => {
    if (withdrawItems.length > 1) {
      setWithdrawItems(withdrawItems.filter((_, i) => i !== index));
    }
  };

  const filteredStockItems = stockItems.filter(
    (item) =>
      item.item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.item.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                คลังสินค้า (Inventory)
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                จัดการสต๊อกสินค้า นำเข้า-เบิกจ่าย
              </p>
            </div>
            <div className="flex gap-2">
              <Dialog open={receiveDialogOpen} onOpenChange={setReceiveDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-green-600 hover:bg-green-700">
                    + นำเข้าสินค้า
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>นำเข้าสินค้า (Receive)</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleReceiveSubmit} className="space-y-4">
                    {error && (
                      <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
                        {error}
                      </div>
                    )}

                    {receiveItems.map((item, index) => (
                      <div
                        key={index}
                        className="border rounded-lg p-4 space-y-3 relative"
                      >
                        {receiveItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeReceiveItem(index)}
                            className="absolute top-2 right-2 text-red-500 hover:text-red-700"
                          >
                            ✕
                          </button>
                        )}

                        <div className="grid grid-cols-2 gap-3">
                          <div className="col-span-2">
                            <Label>สินค้า</Label>
                            <Select
                              value={item.itemId}
                              onValueChange={(value) => {
                                const newItems = [...receiveItems];
                                newItems[index].itemId = value;
                                setReceiveItems(newItems);
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="เลือกสินค้า" />
                              </SelectTrigger>
                              <SelectContent>
                                {allItems.map((i) => (
                                  <SelectItem key={i.id} value={i.id}>
                                    {i.id} - {i.name} ({i.unit || "-"})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label>จำนวน</Label>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={item.quantity}
                              onChange={(e) => {
                                const newItems = [...receiveItems];
                                newItems[index].quantity = e.target.value;
                                setReceiveItems(newItems);
                              }}
                              placeholder="0"
                            />
                          </div>

                          <div>
                            <Label>ราคาต่อหน่วย</Label>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={item.unitCost}
                              onChange={(e) => {
                                const newItems = [...receiveItems];
                                newItems[index].unitCost = e.target.value;
                                setReceiveItems(newItems);
                              }}
                              placeholder="0.00"
                            />
                          </div>

                          <div>
                            <Label>เลข Batch (ถ้ามี)</Label>
                            <Input
                              value={item.batchNumber}
                              onChange={(e) => {
                                const newItems = [...receiveItems];
                                newItems[index].batchNumber = e.target.value;
                                setReceiveItems(newItems);
                              }}
                              placeholder="เช่น LOT-001"
                            />
                          </div>

                          <div>
                            <Label>วันหมดอายุ (ถ้ามี)</Label>
                            <Input
                              type="date"
                              value={item.expiryDate}
                              onChange={(e) => {
                                const newItems = [...receiveItems];
                                newItems[index].expiryDate = e.target.value;
                                setReceiveItems(newItems);
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}

                    <Button
                      type="button"
                      variant="outline"
                      onClick={addReceiveItem}
                      className="w-full"
                    >
                      + เพิ่มรายการ
                    </Button>

                    <Button
                      type="submit"
                      disabled={isPending}
                      className="w-full bg-green-600 hover:bg-green-700"
                    >
                      {isPending ? "กำลังบันทึก..." : "บันทึกการนำเข้า"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>

              <Dialog
                open={withdrawDialogOpen}
                onOpenChange={setWithdrawDialogOpen}
              >
                <DialogTrigger asChild>
                  <Button variant="outline" className="border-red-300 text-red-600">
                    - เบิกจ่ายสินค้า
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>เบิกจ่ายสินค้า (Withdraw)</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleWithdrawSubmit} className="space-y-4">
                    {error && (
                      <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
                        {error}
                      </div>
                    )}

                    {withdrawItems.map((item, index) => (
                      <div
                        key={index}
                        className="border rounded-lg p-4 space-y-3 relative"
                      >
                        {withdrawItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeWithdrawItem(index)}
                            className="absolute top-2 right-2 text-red-500 hover:text-red-700"
                          >
                            ✕
                          </button>
                        )}

                        <div className="grid grid-cols-2 gap-3">
                          <div className="col-span-2">
                            <Label>สินค้า (เฉพาะที่มีสต๊อก)</Label>
                            <Select
                              value={item.stockItemId}
                              onValueChange={(value) => {
                                const newItems = [...withdrawItems];
                                newItems[index].stockItemId = value;
                                setWithdrawItems(newItems);
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="เลือกสินค้า" />
                              </SelectTrigger>
                              <SelectContent>
                                {stockItems
                                  .filter((si) => si.currentQuantity > 0)
                                  .map((si) => (
                                    <SelectItem key={si.id} value={si.id}>
                                      {si.item.id} - {si.item.name} (คงเหลือ:{" "}
                                      {formatNumber(si.currentQuantity)}{" "}
                                      {si.item.unit || ""})
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label>จำนวนที่เบิก</Label>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={item.quantity}
                              onChange={(e) => {
                                const newItems = [...withdrawItems];
                                newItems[index].quantity = e.target.value;
                                setWithdrawItems(newItems);
                              }}
                              placeholder="0"
                            />
                          </div>

                          <div>
                            <Label>วัตถุประสงค์</Label>
                            <Input
                              value={item.purpose}
                              onChange={(e) => {
                                const newItems = [...withdrawItems];
                                newItems[index].purpose = e.target.value;
                                setWithdrawItems(newItems);
                              }}
                              placeholder="เช่น ใช้ในการผลิต"
                            />
                          </div>
                        </div>
                      </div>
                    ))}

                    <Button
                      type="button"
                      variant="outline"
                      onClick={addWithdrawItem}
                      className="w-full"
                    >
                      + เพิ่มรายการ
                    </Button>

                    <Button
                      type="submit"
                      disabled={isPending}
                      className="w-full bg-red-600 hover:bg-red-700"
                    >
                      {isPending ? "กำลังบันทึก..." : "บันทึกการเบิกจ่าย"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-blue-600">
                {formatNumber(kpis.totalItems)}
              </div>
              <p className="text-xs text-gray-500">รายการสินค้า</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(kpis.totalValue)}
              </div>
              <p className="text-xs text-gray-500">มูลค่าสต๊อก (บาท)</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-red-600">
                {formatNumber(kpis.lowStockCount)}
              </div>
              <p className="text-xs text-gray-500">สินค้าใกล้หมด</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-orange-600">
                {formatNumber(kpis.expiringSoonCount)}
              </div>
              <p className="text-xs text-gray-500">ใกล้หมดอายุ</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-purple-600">
                {formatNumber(kpis.pendingTransactionCount)}
              </div>
              <p className="text-xs text-gray-500">รออนุมัติ</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-600">
                +{formatNumber(kpis.todayReceived)}
              </div>
              <p className="text-xs text-gray-500">นำเข้าวันนี้</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-red-600">
                -{formatNumber(kpis.todayWithdrawn)}
              </div>
              <p className="text-xs text-gray-500">เบิกจ่ายวันนี้</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Link href="/inventory/transactions">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="pt-6 text-center">
                <div className="text-3xl mb-2">📋</div>
                <p className="font-medium">ประวัติทั้งหมด</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/inventory/items">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="pt-6 text-center">
                <div className="text-3xl mb-2">📦</div>
                <p className="font-medium">จัดการสินค้า</p>
              </CardContent>
            </Card>
          </Link>

          {isAdmin && (
            <Link href="/inventory/approvals">
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="pt-6 text-center">
                  <div className="text-3xl mb-2">✅</div>
                  <p className="font-medium">รออนุมัติ</p>
                  {kpis.pendingTransactionCount > 0 && (
                    <Badge variant="destructive" className="ml-2">
                      {kpis.pendingTransactionCount}
                    </Badge>
                  )}
                </CardContent>
              </Card>
            </Link>
          )}

          <Link href="/">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="pt-6 text-center">
                <div className="text-3xl mb-2">🏠</div>
                <p className="font-medium">หน้าหลัก</p>
              </CardContent>
            </Card>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Stock Items Table */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>สินค้าในสต๊อก</CardTitle>
                <Input
                  placeholder="ค้นหา..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-48"
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="max-h-96 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>รหัส</TableHead>
                      <TableHead>ชื่อสินค้า</TableHead>
                      <TableHead className="text-right">คงเหลือ</TableHead>
                      <TableHead className="text-right">ต้นทุน</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStockItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-gray-500">
                          ไม่มีสินค้าในสต๊อก
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredStockItems.slice(0, 20).map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-mono text-sm">
                            {item.item.id}
                          </TableCell>
                          <TableCell>
                            <div>{item.item.name}</div>
                            <div className="text-xs text-gray-500">
                              {item.item.unit}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <span
                              className={
                                item.minQuantity &&
                                item.currentQuantity <= item.minQuantity
                                  ? "text-red-600 font-bold"
                                  : ""
                              }
                            >
                              {formatNumber(item.currentQuantity)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            {item.averageCost
                              ? formatCurrency(item.averageCost)
                              : "-"}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              {filteredStockItems.length > 20 && (
                <div className="mt-4 text-center">
                  <Link href="/inventory/items">
                    <Button variant="outline" size="sm">
                      ดูทั้งหมด ({filteredStockItems.length} รายการ)
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Expiring Batches */}
          <Card>
            <CardHeader>
              <CardTitle className="text-orange-600">
                สินค้าใกล้หมดอายุ (30 วัน)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-96 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>สินค้า</TableHead>
                      <TableHead>Batch</TableHead>
                      <TableHead className="text-right">คงเหลือ</TableHead>
                      <TableHead>หมดอายุ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expiringBatches.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-gray-500">
                          ไม่มีสินค้าใกล้หมดอายุ
                        </TableCell>
                      </TableRow>
                    ) : (
                      expiringBatches.map((batch) => {
                        const daysLeft = batch.expiryDate
                          ? Math.ceil(
                              (new Date(batch.expiryDate).getTime() -
                                new Date().getTime()) /
                                (1000 * 60 * 60 * 24)
                            )
                          : null;

                        return (
                          <TableRow key={batch.id}>
                            <TableCell>
                              <div className="font-medium">
                                {batch.stockItem.item.name}
                              </div>
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                              {batch.batchNumber || "-"}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatNumber(batch.currentQuantity)}{" "}
                              {batch.stockItem.item.unit}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span>{formatDate(batch.expiryDate)}</span>
                                {daysLeft !== null && daysLeft <= 7 && (
                                  <Badge variant="destructive">
                                    {daysLeft <= 0
                                      ? "หมดอายุแล้ว"
                                      : `${daysLeft} วัน`}
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pending Transactions (Admin only) */}
        {isAdmin && pendingTransactions.length > 0 && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="text-purple-600">
                รายการรออนุมัติ
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>เลขที่</TableHead>
                    <TableHead>ประเภท</TableHead>
                    <TableHead>ผู้ขอ</TableHead>
                    <TableHead>รายการ</TableHead>
                    <TableHead>วันที่</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingTransactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="font-mono">
                        {tx.transactionNumber}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            tx.type === "WITHDRAW" ? "destructive" : "default"
                          }
                        >
                          {tx.type === "WITHDRAW"
                            ? "เบิกจ่าย"
                            : tx.type === "ADJUST_IN"
                            ? "ปรับเพิ่ม"
                            : tx.type === "ADJUST_OUT"
                            ? "ปรับลด"
                            : tx.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {tx.requestedByUser.name || tx.requestedByUser.email}
                      </TableCell>
                      <TableCell>
                        {tx.items.length} รายการ
                      </TableCell>
                      <TableCell>{formatDate(tx.transactionDate)}</TableCell>
                      <TableCell>
                        <Link href="/inventory/approvals">
                          <Button size="sm" variant="outline">
                            ดูรายละเอียด
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
