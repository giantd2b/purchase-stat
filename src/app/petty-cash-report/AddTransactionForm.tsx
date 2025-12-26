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
import { Loader2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  createManualTransactionAction,
  updateManualTransactionAction,
  deleteManualTransactionAction,
} from "./actions";

interface AddTransactionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: Date;
  departments: string[];
  editTransaction?: {
    id: number;
    reference?: string | null;
    vendor?: string | null;
    productName?: string | null;
    totalPrice: number;
    minorGroup?: string | null;
    note?: string | null;
  } | null;
}

export function AddTransactionForm({
  open,
  onOpenChange,
  date,
  departments,
  editTransaction,
}: AddTransactionFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form state
  const [reference, setReference] = useState("");
  const [vendor, setVendor] = useState("");
  const [productName, setProductName] = useState("");
  const [totalPrice, setTotalPrice] = useState("");
  const [minorGroup, setMinorGroup] = useState("");
  const [note, setNote] = useState("");

  const isEditing = !!editTransaction;

  // Reset form when opening/closing or when editing a transaction
  useEffect(() => {
    if (open && editTransaction) {
      setReference(editTransaction.reference || "");
      setVendor(editTransaction.vendor || "");
      setProductName(editTransaction.productName || "");
      setTotalPrice(editTransaction.totalPrice.toString());
      setMinorGroup(editTransaction.minorGroup || "");
      setNote(editTransaction.note || "");
    } else if (open && !editTransaction) {
      setReference("");
      setVendor("");
      setProductName("");
      setTotalPrice("");
      setMinorGroup("");
      setNote("");
    }
  }, [open, editTransaction]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const price = parseFloat(totalPrice);
    if (isNaN(price) || price <= 0) {
      toast.error("กรุณากรอกจำนวนเงินที่ถูกต้อง");
      return;
    }

    setIsSubmitting(true);

    try {
      if (isEditing && editTransaction) {
        // Update existing transaction (use absolute value since we use negative IDs for manual)
        const result = await updateManualTransactionAction(
          Math.abs(editTransaction.id),
          {
            reference: reference || undefined,
            vendor: vendor || undefined,
            productName: productName || undefined,
            totalPrice: price,
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
        // Create new transaction
        const result = await createManualTransactionAction({
          date: format(date, "yyyy-MM-dd"),
          reference: reference || undefined,
          vendor: vendor || undefined,
          productName: productName || undefined,
          totalPrice: price,
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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "แก้ไขรายการ" : "เพิ่มรายการใหม่"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="reference">อ้างอิง</Label>
              <Input
                id="reference"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="เลขที่เอกสาร..."
              />
            </div>

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

          <div className="space-y-2">
            <Label htmlFor="vendor">ผู้ขาย/ผู้ให้บริการ</Label>
            <Input
              id="vendor"
              value={vendor}
              onChange={(e) => setVendor(e.target.value)}
              placeholder="ชื่อร้าน/ผู้ขาย..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="productName">รายการ</Label>
            <Input
              id="productName"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="รายละเอียดสินค้า/บริการ..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="minorGroup">แผนก ({departments.length} รายการ)</Label>
            <Select value={minorGroup || "__none__"} onValueChange={(v) => setMinorGroup(v === "__none__" ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder="เลือกแผนก..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">ไม่ระบุ</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept} value={dept}>
                    {dept}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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
