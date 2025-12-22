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
  approveTransactionAction,
  rejectTransactionAction,
} from "../actions";

interface Props {
  transactionId: string;
}

export function ApprovalButtons({ transactionId }: Props) {
  const [openReject, setOpenReject] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleApprove = () => {
    setError(null);
    startTransition(async () => {
      const result = await approveTransactionAction(transactionId);
      if (result.error) {
        setError(result.error);
      }
    });
  };

  const handleReject = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await rejectTransactionAction(
        transactionId,
        rejectReason || undefined
      );
      if (result.error) {
        setError(result.error);
      } else {
        setOpenReject(false);
        setRejectReason("");
      }
    });
  };

  return (
    <div className="flex gap-2 justify-end">
      {error && (
        <span className="text-red-500 text-xs">{error}</span>
      )}

      <Button
        size="sm"
        variant="default"
        className="bg-green-600 hover:bg-green-700"
        onClick={handleApprove}
        disabled={isPending}
      >
        {isPending ? "..." : "อนุมัติ"}
      </Button>

      <Dialog open={openReject} onOpenChange={setOpenReject}>
        <DialogTrigger asChild>
          <Button
            size="sm"
            variant="destructive"
            disabled={isPending}
          >
            ปฏิเสธ
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ปฏิเสธรายการ</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleReject} className="space-y-4">
            <div className="space-y-2">
              <Label>เหตุผล (ไม่บังคับ)</Label>
              <Input
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="ระบุเหตุผลที่ปฏิเสธ..."
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setOpenReject(false);
                  setRejectReason("");
                }}
              >
                ยกเลิก
              </Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={isPending}
              >
                {isPending ? "กำลังดำเนินการ..." : "ยืนยันปฏิเสธ"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
