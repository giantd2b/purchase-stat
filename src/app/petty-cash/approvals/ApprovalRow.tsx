"use client";

import { useState } from "react";
import { TableCell, TableRow } from "@/components/ui/table";
import { ApprovalButtons } from "./ApprovalButtons";
import { EditTransactionDialog } from "../EditTransactionDialog";
import { Button } from "@/components/ui/button";

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
  account: {
    balance: number;
    user: {
      id: string;
      name: string | null;
      email: string;
      image: string | null;
    };
  };
}

interface Props {
  transaction: Transaction;
  formatCurrency: (amount: number) => string;
  formatDateTime: (date: Date) => string;
}

export function ApprovalRow({ transaction: tx, formatCurrency, formatDateTime }: Props) {
  const [editOpen, setEditOpen] = useState(false);

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
    <>
      <TableRow>
        <TableCell className="text-gray-500">
          {formatDateTime(tx.createdAt)}
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            {tx.account.user.image && (
              <img
                src={tx.account.user.image}
                alt={tx.account.user.name || ""}
                className="w-6 h-6 rounded-full"
              />
            )}
            <span className="font-medium">
              {tx.account.user.name || tx.account.user.email}
            </span>
          </div>
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
            {getTypeLabel(tx.type)}
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
        <TableCell className="text-right font-semibold text-red-600">
          {formatCurrency(tx.amount)}
        </TableCell>
        <TableCell className="text-right text-gray-500">
          {formatCurrency(tx.account.balance)}
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditOpen(true)}
              className="text-blue-600 hover:text-blue-800"
            >
              แก้ไข
            </Button>
            <ApprovalButtons transactionId={tx.id} />
          </div>
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
