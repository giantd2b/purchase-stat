"use client";

import { useState, useTransition } from "react";
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
  createWithdrawalAction,
  createReturnAction,
  createTopupAction,
} from "../actions";

interface Account {
  id: string;
  userId: string;
  balance: number;
  user: {
    id: string;
    name: string | null;
    email: string;
  };
}

interface Props {
  account: Account;
  isAdmin: boolean;
}

export function UserDetailClient({ account, isAdmin }: Props) {
  const [openTransaction, setOpenTransaction] = useState(false);
  const [transactionType, setTransactionType] = useState<
    "WITHDRAW" | "RETURN" | "TOPUP"
  >("WITHDRAW");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [reference, setReference] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setAmount("");
    setDescription("");
    setReference("");
    setError(null);
  };

  const handleSubmitTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const formData = new FormData();
    formData.set("accountId", account.id);
    formData.set("amount", amount);
    formData.set("description", description);
    formData.set("reference", reference);

    startTransition(async () => {
      let result;
      if (transactionType === "WITHDRAW") {
        result = await createWithdrawalAction(formData);
      } else if (transactionType === "RETURN") {
        result = await createReturnAction(formData);
      } else {
        result = await createTopupAction(formData);
      }

      if (result.error) {
        setError(result.error);
      } else {
        setOpenTransaction(false);
        resetForm();
      }
    });
  };

  return (
    <Dialog open={openTransaction} onOpenChange={setOpenTransaction}>
      <DialogTrigger asChild>
        <Button>+ บันทึกรายการ</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            บันทึกรายการ - {account.user.name || account.user.email}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmitTransaction} className="space-y-4">
          {/* Transaction Type */}
          <div className="space-y-2">
            <Label>ประเภทรายการ</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={transactionType === "WITHDRAW" ? "default" : "outline"}
                onClick={() => setTransactionType("WITHDRAW")}
                className="flex-1"
              >
                เบิก
              </Button>
              <Button
                type="button"
                variant={transactionType === "RETURN" ? "default" : "outline"}
                onClick={() => setTransactionType("RETURN")}
                className="flex-1"
              >
                คืน
              </Button>
              {isAdmin && (
                <Button
                  type="button"
                  variant={transactionType === "TOPUP" ? "default" : "outline"}
                  onClick={() => setTransactionType("TOPUP")}
                  className="flex-1"
                >
                  เติม
                </Button>
              )}
            </div>
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label>จำนวนเงิน (บาท)</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>รายละเอียด</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="เช่น ค่าวัตถุดิบ, ค่าขนส่ง..."
            />
          </div>

          {/* Reference */}
          <div className="space-y-2">
            <Label>เลขที่เอกสาร</Label>
            <Input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="เช่น INV-001"
            />
          </div>

          {transactionType === "WITHDRAW" && (
            <div className="text-sm text-yellow-600 bg-yellow-50 p-2 rounded">
              รายการเบิกเงินต้องรอ Admin อนุมัติ
            </div>
          )}

          {error && (
            <div className="text-red-500 text-sm bg-red-50 p-2 rounded">
              {error}
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setOpenTransaction(false);
                resetForm();
              }}
            >
              ยกเลิก
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "กำลังบันทึก..." : "บันทึก"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
