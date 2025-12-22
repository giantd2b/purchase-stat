import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import {
  getPettyCashAccountByUserId,
  getTransactions,
} from "@/lib/petty-cash-db";
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
import { Button } from "@/components/ui/button";
import { UserDetailClient } from "./UserDetailClient";

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

interface Props {
  params: Promise<{ userId: string }>;
}

export default async function PettyCashUserPage({ params }: Props) {
  const session = await auth();
  const resolvedParams = await params;

  if (!session) {
    redirect("/api/auth/signin");
  }

  const account = await getPettyCashAccountByUserId(resolvedParams.userId);

  if (!account) {
    notFound();
  }

  const transactions = await getTransactions(account.id, undefined, 100);

  const isAdmin = session.user?.role === "ADMIN";

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/petty-cash"
                className="text-blue-600 hover:text-blue-800"
              >
                &larr; กลับ Petty Cash
              </Link>
              <div className="flex items-center gap-3">
                {account.user.image && (
                  <img
                    src={account.user.image}
                    alt={account.user.name || ""}
                    className="w-10 h-10 rounded-full"
                  />
                )}
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {account.user.name || "ไม่ระบุชื่อ"}
                  </h1>
                  <p className="text-sm text-gray-500">{account.user.email}</p>
                </div>
              </div>
            </div>
            <UserDetailClient account={account} isAdmin={isAdmin} />
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Balance Card */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-lg">ยอดคงเหลือ</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-4xl font-bold ${
                account.balance >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {formatCurrency(account.balance)}
            </div>
          </CardContent>
        </Card>

        {/* Transaction History */}
        <Card>
          <CardHeader>
            <CardTitle>ประวัติรายการ ({transactions.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <p className="text-gray-500 text-center py-8">ยังไม่มีรายการ</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>วันที่/เวลา</TableHead>
                    <TableHead>ประเภท</TableHead>
                    <TableHead>รายละเอียด</TableHead>
                    <TableHead>เลขที่เอกสาร</TableHead>
                    <TableHead className="text-right">จำนวนเงิน</TableHead>
                    <TableHead>สถานะ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="text-gray-500">
                        {formatDateTime(tx.createdAt)}
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
                      <TableCell
                        className={`text-right font-semibold ${
                          tx.type === "WITHDRAW"
                            ? "text-red-600"
                            : "text-green-600"
                        }`}
                      >
                        {tx.type === "WITHDRAW" ? "-" : "+"}
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
