"use client";

import { useState, useMemo, Fragment } from "react";
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
import { Check, X, Edit2, Loader2, RotateCcw, Pencil, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { toast } from "sonner";
import { updateTransactionNoteAction, updateTransactionOverrideAction } from "./actions";
import type { PettyCashReportTransaction } from "@/lib/petty-cash-report-db";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface TransactionTableProps {
  transactions: PettyCashReportTransaction[];
  onEditManualTransaction?: (tx: PettyCashReportTransaction) => void;
}

interface GroupedTransactions {
  department: string;
  transactions: PettyCashReportTransaction[];
  total: number;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function EditableNote({
  transactionId,
  initialNote,
}: {
  transactionId: number;
  initialNote: string | null;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [note, setNote] = useState(initialNote || "");
  const [savedNote, setSavedNote] = useState(initialNote || "");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    const result = await updateTransactionNoteAction(transactionId, note);
    if (result.error) {
      toast.error(result.error);
    } else {
      setSavedNote(note);
      toast.success("บันทึกหมายเหตุแล้ว");
    }
    setIsSaving(false);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setNote(savedNote);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-1">
        <Input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="h-8 text-sm"
          placeholder="หมายเหตุ..."
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
    <div
      className="flex items-center gap-1 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 rounded px-2 py-1 min-h-[32px]"
      onClick={() => setIsEditing(true)}
    >
      <span className={savedNote ? "text-gray-900 dark:text-gray-100" : "text-gray-400"}>
        {savedNote || "คลิกเพื่อเพิ่มหมายเหตุ"}
      </span>
      <Edit2 className="h-3 w-3 text-gray-400 ml-1" />
    </div>
  );
}

// Editable price component for overriding estimated prices
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

// Helper to get effective price
function getEffectivePrice(tx: PettyCashReportTransaction): number {
  return tx.actualPrice !== null ? tx.actualPrice : tx.totalPrice;
}

export function TransactionTable({ transactions, onEditManualTransaction }: TransactionTableProps) {
  // Group transactions by department (using effective prices)
  const groupedData = useMemo(() => {
    const groups = new Map<string, PettyCashReportTransaction[]>();

    for (const tx of transactions) {
      const dept = tx.minorGroup || "ไม่ระบุแผนก";
      const existing = groups.get(dept) || [];
      groups.set(dept, [...existing, tx]);
    }

    const result: GroupedTransactions[] = Array.from(groups.entries()).map(
      ([department, txs]) => ({
        department,
        transactions: txs,
        total: txs.reduce((sum, t) => sum + getEffectivePrice(t), 0),
      })
    );

    // Sort by total descending
    return result.sort((a, b) => b.total - a.total);
  }, [transactions]);

  const totalExpenses = transactions.reduce((sum, t) => sum + getEffectivePrice(t), 0);

  if (transactions.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
        ไม่มีรายการจ่ายเงินสดย่อยในวันนี้
      </div>
    );
  }

  let runningIndex = 0;

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[60px]">ลำดับ</TableHead>
            <TableHead className="w-[90px]">วันที่</TableHead>
            <TableHead className="w-[100px]">อ้างอิง</TableHead>
            <TableHead>ผู้ขาย</TableHead>
            <TableHead>รายการ</TableHead>
            <TableHead className="text-right w-[100px]">จำนวนเงิน</TableHead>
            <TableHead className="w-[180px]">หมายเหตุ</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {groupedData.map((group) => (
            <Fragment key={group.department}>
              {/* Department Header */}
              <TableRow
                className="bg-blue-50 dark:bg-blue-900/30"
              >
                <TableCell
                  colSpan={8}
                  className="font-semibold text-blue-800 dark:text-blue-200"
                >
                  📁 {group.department} ({group.transactions.length} รายการ)
                </TableCell>
              </TableRow>

              {/* Department Transactions */}
              {group.transactions.map((tx) => {
                runningIndex++;
                return (
                  <TableRow key={tx.id} className={tx.isManual ? "bg-green-50/50 dark:bg-green-900/10" : ""}>
                    <TableCell className="text-gray-500">
                      {runningIndex}
                      {tx.isManual && (
                        <span className="ml-1 text-xs text-green-600 dark:text-green-400" title="เพิ่มด้วยมือ">
                          ✋
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {tx.date
                        ? format(new Date(tx.date), "d/M/yy", { locale: th })
                        : "-"}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {tx.reference || "-"}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate" title={tx.vendor || ""}>
                      {tx.vendor || "-"}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate" title={tx.productName || ""}>
                      {tx.productName || "-"}
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
                      {tx.isManual ? (
                        <span className="text-gray-600 dark:text-gray-400 text-sm">
                          {tx.note || "-"}
                        </span>
                      ) : (
                        <EditableNote transactionId={tx.id} initialNote={tx.note} />
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
                );
              })}

              {/* Department Subtotal */}
              <TableRow className="bg-gray-100 dark:bg-gray-800">
                <TableCell colSpan={5} className="text-right font-medium">
                  รวม {group.department}
                </TableCell>
                <TableCell className="text-right font-bold text-orange-600 dark:text-orange-400">
                  {formatCurrency(group.total)}
                </TableCell>
                <TableCell colSpan={2}></TableCell>
              </TableRow>
            </Fragment>
          ))}

          {/* Grand Total Row */}
          <TableRow className="bg-gray-200 dark:bg-gray-700 font-bold">
            <TableCell colSpan={5} className="text-right text-lg">
              รวมทั้งสิ้น
            </TableCell>
            <TableCell className="text-right text-lg text-red-600 dark:text-red-400">
              {formatCurrency(totalExpenses)}
            </TableCell>
            <TableCell colSpan={2}></TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}
