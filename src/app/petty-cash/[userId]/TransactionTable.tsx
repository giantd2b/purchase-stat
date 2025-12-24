"use client";

import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TransactionRow } from "../TransactionRow";

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
  transactions: Transaction[];
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat("th-TH", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function TransactionTable({ transactions }: Props) {
  if (transactions.length === 0) {
    return <p className="text-gray-500 text-center py-8">ยังไม่มีรายการ</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>วันที่/เวลา</TableHead>
          <TableHead>ประเภท</TableHead>
          <TableHead>รายละเอียด</TableHead>
          <TableHead>เลขที่เอกสาร</TableHead>
          <TableHead>ไฟล์แนบ</TableHead>
          <TableHead className="text-right">จำนวนเงิน</TableHead>
          <TableHead>สถานะ</TableHead>
          <TableHead></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {transactions.map((tx) => (
          <TransactionRow
            key={tx.id}
            transaction={tx}
            formatCurrency={formatCurrency}
            formatDateTime={formatDateTime}
          />
        ))}
      </TableBody>
    </Table>
  );
}
