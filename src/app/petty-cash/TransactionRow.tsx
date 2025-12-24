"use client";

import { useState } from "react";
import { TableCell, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { EditTransactionDialog } from "./EditTransactionDialog";

interface Transaction {
  id: string;
  type: string;
  amount: number;
  description: string | null;
  reference: string | null;
  status: string;
  attachmentUrl: string | null;
  attachmentName: string | null;
  createdAt: Date;
  rejectReason: string | null;
}

interface Props {
  transaction: Transaction;
  formatCurrency: (amount: number) => string;
  formatDateTime: (date: Date) => string;
}

export function TransactionRow({ transaction: tx, formatCurrency, formatDateTime }: Props) {
  const [editOpen, setEditOpen] = useState(false);

  const canEdit = tx.status === "PENDING" || tx.status === "APPROVED";

  return (
    <>
      <TableRow>
        <TableCell className="text-gray-500">
          {formatDateTime(tx.createdAt)}
        </TableCell>
        <TableCell>
          <span
            className={`px-2 py-1 rounded text-xs font-medium ${
              tx.type === "WITHDRAW" || tx.type === "TRANSFER_OUT"
                ? "bg-red-100 text-red-800"
                : tx.type === "RETURN"
                ? "bg-blue-100 text-blue-800"
                : tx.type === "TRANSFER_IN"
                ? "bg-green-100 text-green-800"
                : "bg-purple-100 text-purple-800"
            }`}
          >
            {tx.type === "WITHDRAW"
              ? "เบิก"
              : tx.type === "RETURN"
              ? "คืน"
              : tx.type === "TOPUP"
              ? "เติม"
              : tx.type === "TRANSFER_OUT"
              ? "โอนออก"
              : "รับโอน"}
          </span>
        </TableCell>
        <TableCell className="text-gray-700">
          {tx.description || "-"}
        </TableCell>
        <TableCell className="text-gray-500">
          {tx.reference || "-"}
        </TableCell>
        <TableCell>
          {tx.attachmentUrl ? (
            <a
              href={tx.attachmentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline text-sm"
            >
              {tx.attachmentName || "ดูไฟล์"}
            </a>
          ) : (
            <span className="text-gray-400">-</span>
          )}
        </TableCell>
        <TableCell
          className={`text-right font-semibold ${
            tx.type === "WITHDRAW" || tx.type === "TRANSFER_OUT"
              ? "text-red-600"
              : "text-green-600"
          }`}
        >
          {tx.type === "WITHDRAW" || tx.type === "TRANSFER_OUT" ? "-" : "+"}
          {formatCurrency(tx.amount)}
        </TableCell>
        <TableCell>
          <span
            className={`px-2 py-1 rounded text-xs ${
              tx.status === "APPROVED"
                ? "bg-green-100 text-green-800"
                : tx.status === "PENDING"
                ? "bg-yellow-100 text-yellow-800"
                : "bg-red-100 text-red-800"
            }`}
          >
            {tx.status === "APPROVED"
              ? "อนุมัติ"
              : tx.status === "PENDING"
              ? "รออนุมัติ"
              : "ปฏิเสธ"}
          </span>
          {tx.status === "REJECTED" && tx.rejectReason && (
            <span className="block text-xs text-gray-500 mt-1">
              {tx.rejectReason}
            </span>
          )}
        </TableCell>
        <TableCell>
          {canEdit && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditOpen(true)}
              className="text-blue-600 hover:text-blue-800"
            >
              แก้ไข
            </Button>
          )}
        </TableCell>
      </TableRow>

      <EditTransactionDialog
        transaction={tx}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </>
  );
}
