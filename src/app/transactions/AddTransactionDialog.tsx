"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  createManualTransactionAction,
  updateManualTransactionAction,
  deleteManualTransactionAction,
} from "./actions";
import type { FilterOptions, TransactionWithOverride } from "@/lib/transactions-db";

interface AddTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filterOptions: FilterOptions;
  editTransaction?: TransactionWithOverride | null;
}

export function AddTransactionDialog({
  open,
  onOpenChange,
  filterOptions,
  editTransaction,
}: AddTransactionDialogProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form state
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [reference, setReference] = useState("");
  const [vendor, setVendor] = useState("");
  const [productName, setProductName] = useState("");
  const [totalPrice, setTotalPrice] = useState("");
  const [payment, setPayment] = useState("");
  const [minorGroup, setMinorGroup] = useState("");
  const [note, setNote] = useState("");

  const isEditing = !!editTransaction;

  // Reset form when opening/closing or when editing
  useEffect(() => {
    if (open && editTransaction) {
      setDate(editTransaction.date ? new Date(editTransaction.date) : new Date());
      setReference(editTransaction.reference || "");
      setVendor(editTransaction.vendor || "");
      setProductName(editTransaction.productName || "");
      setTotalPrice(editTransaction.totalPrice.toString());
      setPayment(editTransaction.payment || "");
      setMinorGroup(editTransaction.minorGroup || "");
      setNote("");
    } else if (open && !editTransaction) {
      setDate(new Date());
      setReference("");
      setVendor("");
      setProductName("");
      setTotalPrice("");
      setPayment("");
      setMinorGroup("");
      setNote("");
    }
  }, [open, editTransaction]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!date) {
      toast.error("กรุณาเลือกวันที่");
      return;
    }

    const price = parseFloat(totalPrice);
    if (isNaN(price) || price <= 0) {
      toast.error("กรุณากรอกจำนวนเงินที่ถูกต้อง");
      return;
    }

    setIsSubmitting(true);

    try {
      if (isEditing && editTransaction) {
        const result = await updateManualTransactionAction(
          Math.abs(editTransaction.id),
          {
            date: format(date, "yyyy-MM-dd"),
            reference: reference || undefined,
            vendor: vendor || undefined,
            productName: productName || undefined,
            totalPrice: price,
            payment: payment || undefined,
            minorGroup: minorGroup || undefined,
            note: note || undefined,
          }
        );

        if (result.error) {
          toast.error(result.error);
        } else {
          toast.success("อัปเดตรายการแล้ว");
          onOpenChange(false);
          router.refresh();
        }
      } else {
        const result = await createManualTransactionAction({
          date: format(date, "yyyy-MM-dd"),
          reference: reference || undefined,
          vendor: vendor || undefined,
          productName: productName || undefined,
          totalPrice: price,
          payment: payment || undefined,
          minorGroup: minorGroup || undefined,
          note: note || undefined,
        });

        if (result.error) {
          toast.error(result.error);
        } else {
          toast.success("เพิ่มรายการแล้ว");
          onOpenChange(false);
          router.refresh();
        }
      }
    } catch {
      toast.error("เกิดข้อผิดพลาด");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!editTransaction) return;

    if (!confirm("ต้องการลบรายการนี้ใช่หรือไม่?")) return;

    setIsDeleting(true);

    try {
      const result = await deleteManualTransactionAction(
        Math.abs(editTransaction.id)
      );

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("ลบรายการแล้ว");
        onOpenChange(false);
        router.refresh();
      }
    } catch {
      toast.error("เกิดข้อผิดพลาด");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "แก้ไขรายการ" : "เพิ่มรายการใหม่"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Date */}
            <div className="space-y-2">
              <Label>วันที่ *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "d MMM yyyy", { locale: th }) : "เลือกวันที่"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="totalPrice">จำนวนเงิน *</Label>
              <Input
                id="totalPrice"
                type="number"
                step="0.01"
                value={totalPrice}
                onChange={(e) => setTotalPrice(e.target.value)}
                placeholder="0.00"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Reference */}
            <div className="space-y-2">
              <Label htmlFor="reference">อ้างอิง</Label>
              <Input
                id="reference"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="เลขที่เอกสาร..."
              />
            </div>

            {/* Payment */}
            <div className="space-y-2">
              <Label>ประเภทการจ่าย</Label>
              <Select value={payment || "__none__"} onValueChange={(v) => setPayment(v === "__none__" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="เลือกประเภท..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">ไม่ระบุ</SelectItem>
                  {filterOptions.payments.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Vendor */}
          <div className="space-y-2">
            <Label htmlFor="vendor">ผู้ขาย/ผู้ให้บริการ</Label>
            <Input
              id="vendor"
              value={vendor}
              onChange={(e) => setVendor(e.target.value)}
              placeholder="ชื่อร้าน/ผู้ขาย..."
            />
          </div>

          {/* Product Name */}
          <div className="space-y-2">
            <Label htmlFor="productName">รายการ</Label>
            <Input
              id="productName"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="รายละเอียดสินค้า/บริการ..."
            />
          </div>

          {/* Department */}
          <div className="space-y-2">
            <Label>แผนก</Label>
            <Select value={minorGroup || "__none__"} onValueChange={(v) => setMinorGroup(v === "__none__" ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder="เลือกแผนก..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">ไม่ระบุ</SelectItem>
                {filterOptions.departments.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Note */}
          <div className="space-y-2">
            <Label htmlFor="note">หมายเหตุ</Label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="หมายเหตุเพิ่มเติม..."
              rows={2}
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            {isEditing && (
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={isSubmitting || isDeleting}
                className="mr-auto"
              >
                {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                ลบรายการ
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting || isDeleting}
            >
              ยกเลิก
            </Button>
            <Button type="submit" disabled={isSubmitting || isDeleting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? "บันทึก" : "เพิ่มรายการ"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
