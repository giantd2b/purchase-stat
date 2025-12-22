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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createWithdrawalAction,
  createReturnAction,
  createTopupAction,
  createAccountAction,
  transferAction,
  createBulkWithdrawalAction,
} from "./actions";

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

interface UserWithoutAccount {
  id: string;
  name: string | null;
  email: string;
}

interface Props {
  accounts: Account[];
  usersWithoutAccount: UserWithoutAccount[];
  isAdmin: boolean;
}

export function PettyCashClient({
  accounts,
  usersWithoutAccount,
  isAdmin,
}: Props) {
  const [openTransaction, setOpenTransaction] = useState(false);
  const [openNewAccount, setOpenNewAccount] = useState(false);
  const [openTransfer, setOpenTransfer] = useState(false);
  const [transactionType, setTransactionType] = useState<
    "WITHDRAW" | "RETURN" | "TOPUP"
  >("WITHDRAW");
  const [selectedAccount, setSelectedAccount] = useState<string>("");
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [fromAccount, setFromAccount] = useState<string>("");
  const [toAccount, setToAccount] = useState<string>("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [reference, setReference] = useState("");
  const [initialBalance, setInitialBalance] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploadedFile, setUploadedFile] = useState<{ url: string; name: string } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<{
    items: Array<{
      amount: number;
      description: string | null;
      reference: string | null;
      selected: boolean;
    }>;
    totalAmount: number | null;
    documentType: string | null;
    confidence: string;
  } | null>(null);
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
    setScanResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleScanImage = async () => {
    if (!uploadedFile?.url) return;

    setIsScanning(true);
    setError(null);

    try {
      const response = await fetch("/api/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: uploadedFile.url }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Scan failed");
      }

      // Add selected: true to all items by default
      const itemsWithSelection = (result.data.items || []).map((item: { amount: number; description: string | null; reference: string | null }) => ({
        ...item,
        selected: true,
      }));

      setScanResult({
        items: itemsWithSelection,
        totalAmount: result.data.totalAmount,
        documentType: result.data.documentType,
        confidence: result.data.confidence,
      });

      // If only one item, auto-fill form fields
      if (itemsWithSelection.length === 1) {
        const item = itemsWithSelection[0];
        if (item.amount) {
          setAmount(item.amount.toString());
        }
        if (item.description && !description) {
          setDescription(item.description);
        }
        if (item.reference && !reference) {
          setReference(item.reference);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to scan image");
    } finally {
      setIsScanning(false);
    }
  };

  const toggleItemSelection = (index: number) => {
    if (!scanResult) return;
    const newItems = [...scanResult.items];
    newItems[index] = { ...newItems[index], selected: !newItems[index].selected };
    setScanResult({ ...scanResult, items: newItems });
  };

  const handleBulkSubmit = async () => {
    if (!scanResult || !selectedAccount || transactionType !== "WITHDRAW") return;

    const selectedItems = scanResult.items.filter(item => item.selected);
    if (selectedItems.length === 0) {
      setError("กรุณาเลือกอย่างน้อย 1 รายการ");
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await createBulkWithdrawalAction(
        selectedAccount,
        selectedItems.map(item => ({
          amount: item.amount,
          description: item.description || undefined,
          reference: item.reference || undefined,
        })),
        uploadedFile?.url,
        uploadedFile?.name
      );

      if (result.error) {
        setError(result.error);
      } else {
        setOpenTransaction(false);
        resetForm();
      }
    });
  };

  const resetForm = () => {
    setSelectedAccount("");
    setAmount("");
    setDescription("");
    setReference("");
    setError(null);
    setScanResult(null);
    clearFile();
  };

  const resetTransferForm = () => {
    setFromAccount("");
    setToAccount("");
    setAmount("");
    setDescription("");
    setError(null);
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const formData = new FormData();
    formData.set("fromAccountId", fromAccount);
    formData.set("toAccountId", toAccount);
    formData.set("amount", amount);
    formData.set("description", description);

    startTransition(async () => {
      const result = await transferAction(formData);

      if (result.error) {
        setError(result.error);
      } else {
        setOpenTransfer(false);
        resetTransferForm();
      }
    });
  };

  const handleSubmitTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const formData = new FormData();
    formData.set("accountId", selectedAccount);
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

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await createAccountAction(
        selectedUser,
        parseFloat(initialBalance) || 0
      );

      if (result.error) {
        setError(result.error);
      } else {
        setOpenNewAccount(false);
        setSelectedUser("");
        setInitialBalance("");
      }
    });
  };

  return (
    <div className="flex gap-2">
      {/* New Transaction Button */}
      <Dialog open={openTransaction} onOpenChange={setOpenTransaction}>
        <DialogTrigger asChild>
          <Button disabled={accounts.length === 0}>+ บันทึกรายการ</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>บันทึกรายการ Petty Cash</DialogTitle>
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

            {/* Account Select */}
            <div className="space-y-2">
              <Label>บัญชี</Label>
              <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                <SelectTrigger>
                  <SelectValue placeholder="เลือกบัญชี" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.user.name || account.user.email} (฿
                      {account.balance.toLocaleString()})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                <div className="space-y-2">
                  <p className="text-sm text-green-600">
                    อัปโหลดสำเร็จ: {uploadedFile.name}
                  </p>
                  {/* Scan Button */}
                  {!uploadedFile.name.toLowerCase().endsWith('.pdf') && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleScanImage}
                      disabled={isScanning}
                      className="w-full"
                    >
                      {isScanning ? "กำลังสแกน..." : "🔍 สแกนจำนวนเงินจากรูป"}
                    </Button>
                  )}
                </div>
              )}
              {scanResult && scanResult.items.length > 0 && (
                <div className="text-sm bg-blue-50 p-3 rounded border border-blue-200 space-y-2">
                  <div className="flex justify-between items-center">
                    <p className="font-medium text-blue-800">
                      ผลการสแกน ({scanResult.items.length} รายการ)
                    </p>
                    <span className="text-xs">
                      {scanResult.confidence === 'high' ? '🟢' : scanResult.confidence === 'medium' ? '🟡' : '🔴'}
                    </span>
                  </div>
                  {scanResult.documentType && (
                    <p className="text-xs text-gray-600">📄 {scanResult.documentType}</p>
                  )}
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {scanResult.items.map((item, index) => (
                      <label
                        key={index}
                        className={`flex items-center gap-2 p-2 rounded cursor-pointer ${
                          item.selected ? 'bg-blue-100' : 'bg-gray-100'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={item.selected}
                          onChange={() => toggleItemSelection(index)}
                          className="rounded"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">
                            {item.description || 'ไม่ระบุรายละเอียด'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {item.reference && `#${item.reference} • `}
                            ฿{item.amount.toLocaleString()}
                          </p>
                        </div>
                        <span className="font-semibold text-blue-700">
                          ฿{item.amount.toLocaleString()}
                        </span>
                      </label>
                    ))}
                  </div>
                  {scanResult.totalAmount && (
                    <p className="text-right font-medium border-t pt-2">
                      รวม: ฿{scanResult.totalAmount.toLocaleString()}
                    </p>
                  )}
                  {scanResult.items.length > 1 && transactionType === "WITHDRAW" && selectedAccount && (
                    <Button
                      type="button"
                      onClick={handleBulkSubmit}
                      disabled={isPending || scanResult.items.filter(i => i.selected).length === 0}
                      className="w-full bg-green-600 hover:bg-green-700"
                    >
                      {isPending ? "กำลังบันทึก..." : `บันทึก ${scanResult.items.filter(i => i.selected).length} รายการที่เลือก`}
                    </Button>
                  )}
                </div>
              )}
              <p className="text-xs text-gray-500">
                รองรับ: รูปภาพ (JPG, PNG, GIF) หรือ PDF (ไม่เกิน 10MB)
              </p>
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
                onClick={() => {
                  setOpenTransaction(false);
                  resetForm();
                }}
              >
                ยกเลิก
              </Button>
              <Button type="submit" disabled={isPending || isUploading || !selectedAccount}>
                {isPending ? "กำลังบันทึก..." : isUploading ? "กำลังอัปโหลด..." : "บันทึก"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* New Account Button (Admin Only) */}
      {isAdmin && usersWithoutAccount.length > 0 && (
        <Dialog open={openNewAccount} onOpenChange={setOpenNewAccount}>
          <DialogTrigger asChild>
            <Button variant="outline">+ เพิ่มผู้ถือ</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>เพิ่มผู้ถือ Petty Cash</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateAccount} className="space-y-4">
              {/* User Select */}
              <div className="space-y-2">
                <Label>เลือกผู้ใช้</Label>
                <Select value={selectedUser} onValueChange={setSelectedUser}>
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกผู้ใช้" />
                  </SelectTrigger>
                  <SelectContent>
                    {usersWithoutAccount.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name || user.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Initial Balance */}
              <div className="space-y-2">
                <Label>ยอดเริ่มต้น (บาท)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={initialBalance}
                  onChange={(e) => setInitialBalance(e.target.value)}
                  placeholder="0.00"
                />
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
                  onClick={() => {
                    setOpenNewAccount(false);
                    setSelectedUser("");
                    setInitialBalance("");
                  }}
                >
                  ยกเลิก
                </Button>
                <Button type="submit" disabled={isPending || !selectedUser}>
                  {isPending ? "กำลังสร้าง..." : "สร้างบัญชี"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Transfer Button (Admin Only) */}
      {isAdmin && accounts.length >= 2 && (
        <Dialog open={openTransfer} onOpenChange={setOpenTransfer}>
          <DialogTrigger asChild>
            <Button variant="outline">โอนเงิน</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>โอนเงินระหว่างบัญชี</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleTransfer} className="space-y-4">
              {/* From Account */}
              <div className="space-y-2">
                <Label>จากบัญชี</Label>
                <Select value={fromAccount} onValueChange={setFromAccount}>
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกบัญชีต้นทาง" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.user.name || account.user.email} (฿
                        {account.balance.toLocaleString()})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* To Account */}
              <div className="space-y-2">
                <Label>ไปยังบัญชี</Label>
                <Select value={toAccount} onValueChange={setToAccount}>
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกบัญชีปลายทาง" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts
                      .filter((a) => a.id !== fromAccount)
                      .map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.user.name || account.user.email} (฿
                          {account.balance.toLocaleString()})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
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
                <Label>รายละเอียด (ไม่บังคับ)</Label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="เช่น โยกเงินสำรอง..."
                />
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
                  onClick={() => {
                    setOpenTransfer(false);
                    resetTransferForm();
                  }}
                >
                  ยกเลิก
                </Button>
                <Button
                  type="submit"
                  disabled={isPending || !fromAccount || !toAccount || fromAccount === toAccount}
                >
                  {isPending ? "กำลังโอน..." : "โอนเงิน"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
