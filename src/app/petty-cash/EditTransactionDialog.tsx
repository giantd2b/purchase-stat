"use client";

import { useState, useTransition, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { editTransactionAction } from "./actions";

interface Transaction {
  id: string;
  type: string;
  amount: number;
  description: string | null;
  reference: string | null;
  status: string;
  attachmentUrl: string | null;
  attachmentName: string | null;
}

interface Props {
  transaction: Transaction;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditTransactionDialog({ transaction, open, onOpenChange }: Props) {
  const [amount, setAmount] = useState(transaction.amount.toString());
  const [description, setDescription] = useState(transaction.description || "");
  const [reference, setReference] = useState(transaction.reference || "");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploadedFile, setUploadedFile] = useState<{ url: string; name: string } | null>(
    transaction.attachmentUrl
      ? { url: transaction.attachmentUrl, name: transaction.attachmentName || "ไฟล์แนบ" }
      : null
  );
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Upload failed");
      }

      setUploadedFile({ url: result.url, name: result.name });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload file");
      setFile(null);
    } finally {
      setIsUploading(false);
    }
  };

  const clearFile = () => {
    setFile(null);
    setUploadedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await editTransactionAction({
        transactionId: transaction.id,
        amount: parseFloat(amount),
        description: description || undefined,
        reference: reference || undefined,
        attachmentUrl: uploadedFile?.url,
        attachmentName: uploadedFile?.name,
      });

      if (result.error) {
        setError(result.error);
      } else {
        onOpenChange(false);
      }
    });
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "WITHDRAW":
        return "เบิก";
      case "RETURN":
        return "คืน";
      case "TOPUP":
        return "เติม";
      case "TRANSFER_OUT":
        return "โอนออก";
      case "TRANSFER_IN":
        return "รับโอน";
      default:
        return type;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            แก้ไขรายการ {getTypeLabel(transaction.type)}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Status Warning */}
          {transaction.status === "APPROVED" && (
            <div className="text-sm text-orange-600 bg-orange-50 p-2 rounded border border-orange-200">
              ⚠️ รายการนี้อนุมัติแล้ว การแก้ไขจะต้องขออนุมัติใหม่
            </div>
          )}

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

          {/* File Attachment */}
          <div className="space-y-2">
            <Label>ไฟล์แนบ</Label>
            <div className="flex items-center gap-2">
              <Input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf"
                onChange={handleFileChange}
                disabled={isUploading}
                className="flex-1"
              />
              {uploadedFile && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={clearFile}
                  className="text-red-500 hover:text-red-700"
                >
                  X
                </Button>
              )}
            </div>
            {isUploading && (
              <p className="text-sm text-blue-500">กำลังอัปโหลด...</p>
            )}
            {uploadedFile && (
              <p className="text-sm text-green-600">
                ไฟล์แนบ: {uploadedFile.name}
              </p>
            )}
          </div>

          {error && (
            <div className="text-red-500 text-sm bg-red-50 p-2 rounded">
              {error}
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              ยกเลิก
            </Button>
            <Button type="submit" disabled={isPending || isUploading}>
              {isPending ? "กำลังบันทึก..." : "บันทึก"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
