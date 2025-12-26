"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Check, X, Edit2, Loader2, RotateCcw, Pencil } from "lucide-react";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { toast } from "sonner";
import { updateTransactionOverrideAction } from "./actions";
import type { TransactionWithOverride } from "@/lib/transactions-db";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface TransactionTableProps {
  transactions: TransactionWithOverride[];
  onEditManualTransaction?: (tx: TransactionWithOverride) => void;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

// Editable price component for overriding prices
function EditablePrice({
  transactionId,
  totalPrice,
  actualPrice,
  overrideReason,
}: {
  transactionId: number;
  totalPrice: number;
  actualPrice: number | null;
  overrideReason: string | null;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [price, setPrice] = useState(actualPrice?.toString() || totalPrice.toString());
  const [savedActualPrice, setSavedActualPrice] = useState(actualPrice);
  const [isSaving, setIsSaving] = useState(false);

  const effectivePrice = savedActualPrice !== null ? savedActualPrice : totalPrice;
  const hasOverride = savedActualPrice !== null;

  const handleSave = async () => {
    const newPrice = parseFloat(price);
    if (isNaN(newPrice) || newPrice < 0) {
      toast.error("กรุณากรอกจำนวนเงินที่ถูกต้อง");
      return;
    }

    setIsSaving(true);
    const result = await updateTransactionOverrideAction(transactionId, newPrice);
    if (result.error) {
      toast.error(result.error);
    } else {
      setSavedActualPrice(newPrice);
      toast.success("บันทึกยอดจริงแล้ว");
    }
    setIsSaving(false);
    setIsEditing(false);
  };

  const handleRevert = async () => {
    setIsSaving(true);
    const result = await updateTransactionOverrideAction(transactionId, null);
    if (result.error) {
      toast.error(result.error);
    } else {
      setSavedActualPrice(null);
      setPrice(totalPrice.toString());
      toast.success("ยกเลิกการแก้ไขแล้ว");
    }
    setIsSaving(false);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setPrice(savedActualPrice?.toString() || totalPrice.toString());
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-1">
        <Input
          type="number"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="h-8 text-sm w-24 text-right"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
            if (e.key === "Escape") handleCancel();
          }}
        />
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8"
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Check className="h-4 w-4 text-green-600" />
          )}
        </Button>
        {hasOverride && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={handleRevert}
                  disabled={isSaving}
                >
                  <RotateCcw className="h-4 w-4 text-orange-500" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>ยกเลิกการแก้ไข (กลับเป็น {formatCurrency(totalPrice)})</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8"
          onClick={handleCancel}
          disabled={isSaving}
        >
          <X className="h-4 w-4 text-red-600" />
        </Button>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={`flex items-center gap-1 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 rounded px-2 py-1 min-h-[32px] justify-end ${
              hasOverride ? "bg-yellow-50 dark:bg-yellow-900/20" : ""
            }`}
            onClick={() => setIsEditing(true)}
          >
            <span className={`font-medium ${hasOverride ? "text-blue-600 dark:text-blue-400" : ""}`}>
              {formatCurrency(effectivePrice)}
            </span>
            <Edit2 className="h-3 w-3 text-gray-400 ml-1" />
          </div>
        </TooltipTrigger>
        <TooltipContent>
          {hasOverride ? (
            <div className="text-sm">
              <p>ยอดประมาณการ: {formatCurrency(totalPrice)}</p>
              <p className="text-blue-400">ยอดจริง: {formatCurrency(effectivePrice)}</p>
              {overrideReason && <p className="text-gray-400">เหตุผล: {overrideReason}</p>}
            </div>
          ) : (
            <p>คลิกเพื่อแก้ไขยอดจริง</p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function TransactionTable({ transactions, onEditManualTransaction }: TransactionTableProps) {
  if (transactions.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
        ไม่พบรายการที่ตรงกับเงื่อนไข
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[90px]">วันที่</TableHead>
            <TableHead className="w-[100px]">อ้างอิง</TableHead>
            <TableHead>ผู้ขาย</TableHead>
            <TableHead>รายการ</TableHead>
            <TableHead className="w-[120px]">แผนก</TableHead>
            <TableHead className="w-[120px]">การจ่าย</TableHead>
            <TableHead className="text-right w-[120px]">จำนวนเงิน</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((tx) => (
            <TableRow
              key={tx.id}
              className={tx.isManual ? "bg-green-50/50 dark:bg-green-900/10" : ""}
            >
              <TableCell>
                {tx.date ? format(new Date(tx.date), "d/M/yy", { locale: th }) : "-"}
              </TableCell>
              <TableCell className="font-mono text-sm">
                {tx.reference || "-"}
              </TableCell>
              <TableCell className="max-w-[200px] truncate" title={tx.vendor || ""}>
                {tx.vendor || "-"}
              </TableCell>
              <TableCell className="max-w-[200px] truncate" title={tx.productName || ""}>
                {tx.productName || "-"}
                {tx.isManual && (
                  <span className="ml-1 text-xs text-green-600 dark:text-green-400" title="เพิ่มด้วยมือ">
                    ✋
                  </span>
                )}
              </TableCell>
              <TableCell className="text-sm">
                {tx.minorGroup || "-"}
              </TableCell>
              <TableCell className="text-sm">
                {tx.payment || "-"}
              </TableCell>
              <TableCell className="text-right">
                {tx.isManual ? (
                  <span className="font-medium px-2 py-1">
                    {formatCurrency(tx.totalPrice)}
                  </span>
                ) : (
                  <EditablePrice
                    transactionId={tx.id}
                    totalPrice={tx.totalPrice}
                    actualPrice={tx.actualPrice}
                    overrideReason={tx.overrideReason}
                  />
                )}
              </TableCell>
              <TableCell>
                {tx.isManual && onEditManualTransaction && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onEditManualTransaction(tx)}
                    title="แก้ไขรายการ"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
