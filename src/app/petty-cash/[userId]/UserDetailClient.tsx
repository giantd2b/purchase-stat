"use client";

import { useState, useTransition, useRef } from "react";
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
  const [file, setFile] = useState<File | null>(null);
  const [uploadedFile, setUploadedFile] = useState<{ url: string; name: string } | null>(null);
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

  const resetForm = () => {
    setAmount("");
    setDescription("");
    setReference("");
    setError(null);
    clearFile();
  };

  const handleSubmitTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const formData = new FormData();
    formData.set("accountId", account.id);
    formData.set("amount", amount);
    formData.set("description", description);
    formData.set("reference", reference);
    if (uploadedFile) {
      formData.set("attachmentUrl", uploadedFile.url);
      formData.set("attachmentName", uploadedFile.name);
    }

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

          {/* File Attachment */}
          <div className="space-y-2">
            <Label>แนบไฟล์ (ไม่บังคับ)</Label>
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
                อัปโหลดสำเร็จ: {uploadedFile.name}
              </p>
            )}
            <p className="text-xs text-gray-500">
              รองรับ: รูปภาพ (JPG, PNG, GIF) หรือ PDF (ไม่เกิน 10MB)
            </p>
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
            <Button type="submit" disabled={isPending || isUploading}>
              {isPending ? "กำลังบันทึก..." : isUploading ? "กำลังอัปโหลด..." : "บันทึก"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
