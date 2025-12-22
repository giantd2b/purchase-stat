import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getPendingTransactions } from "@/lib/petty-cash-db";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ApprovalButtons } from "./ApprovalButtons";

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

export default async function ApprovalsPage() {
  const session = await auth();

  if (!session) {
    redirect("/api/auth/signin");
  }

  if (session.user?.role !== "ADMIN") {
    redirect("/petty-cash");
  }

  const pendingTransactions = await getPendingTransactions();

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/petty-cash"
              className="text-blue-600 hover:text-blue-800"
            >
              &larr; กลับ Petty Cash
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">
              รายการรออนุมัติ
            </h1>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-orange-600">
              รายการรออนุมัติ ({pendingTransactions.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pendingTransactions.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                ไม่มีรายการรออนุมัติ
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>วันที่/เวลา</TableHead>
                    <TableHead>ผู้ขอ</TableHead>
                    <TableHead>ประเภท</TableHead>
                    <TableHead>รายละเอียด</TableHead>
                    <TableHead>เลขที่เอกสาร</TableHead>
                    <TableHead className="text-right">จำนวนเงิน</TableHead>
                    <TableHead className="text-right">ยอดปัจจุบัน</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingTransactions.map((tx) => (
                    <TableRow key={tx.id}>
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
                            tx.type === "WITHDRAW"
                              ? "bg-red-100 text-red-800"
                              : tx.type === "RETURN"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-purple-100 text-purple-800"
                          }`}
                        >
                          {tx.type === "WITHDRAW"
                            ? "เบิก"
                            : tx.type === "RETURN"
                            ? "คืน"
                            : "เติม"}
                        </span>
                      </TableCell>
                      <TableCell className="text-gray-700">
                        {tx.description || "-"}
                      </TableCell>
                      <TableCell className="text-gray-500">
                        {tx.reference || "-"}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-red-600">
                        {formatCurrency(tx.amount)}
                      </TableCell>
                      <TableCell className="text-right text-gray-500">
                        {/* This would need account balance - we'll add it via join */}
                        -
                      </TableCell>
                      <TableCell className="text-right">
                        <ApprovalButtons transactionId={tx.id} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
