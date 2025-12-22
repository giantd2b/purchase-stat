import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  getPettyCashAccounts,
  getPettyCashKPIs,
  getPendingTransactions,
  getAllUsersForPettyCash,
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
import { PettyCashClient } from "./PettyCashClient";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("th-TH", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  }).format(date);
}

export default async function PettyCashPage() {
  const session = await auth();

  if (!session) {
    redirect("/api/auth/signin");
  }

  const isAdmin = session.user?.role === "ADMIN";

  const [kpis, accounts, pendingTransactions, allUsers] = await Promise.all([
    getPettyCashKPIs(),
    getPettyCashAccounts(),
    getPendingTransactions(),
    getAllUsersForPettyCash(),
  ]);

  // Users without petty cash accounts
  const usersWithoutAccount = allUsers.filter((u) => !u.pettyCashAccount);

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/" className="text-blue-600 hover:text-blue-800">
                &larr; กลับหน้าหลัก
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">
                Petty Cash Dashboard
              </h1>
            </div>
            <div className="flex items-center gap-3">
              {isAdmin && pendingTransactions.length > 0 && (
                <Link href="/petty-cash/approvals">
                  <Button variant="outline" className="relative">
                    รออนุมัติ
                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {pendingTransactions.length}
                    </span>
                  </Button>
                </Link>
              )}
              <PettyCashClient
                accounts={accounts}
                usersWithoutAccount={usersWithoutAccount}
                isAdmin={isAdmin}
              />
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                ยอดคงเหลือรวม
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(kpis.totalBalance)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                รออนุมัติ
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {kpis.pendingCount} รายการ
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                เบิกวันนี้
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(kpis.todayWithdraw)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                คืนวันนี้
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {formatCurrency(kpis.todayReturn)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                เติมวันนี้
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {formatCurrency(kpis.todayTopup)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Accounts Table */}
        <Card>
          <CardHeader>
            <CardTitle>ผู้ถือ Petty Cash ({accounts.length} คน)</CardTitle>
          </CardHeader>
          <CardContent>
            {accounts.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                ยังไม่มีผู้ถือ Petty Cash
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ชื่อ</TableHead>
                    <TableHead>อีเมล</TableHead>
                    <TableHead className="text-right">ยอดคงเหลือ</TableHead>
                    <TableHead className="text-right">รายการทั้งหมด</TableHead>
                    <TableHead className="text-right">อัปเดตล่าสุด</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accounts.map((account) => (
                    <TableRow key={account.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {account.user.image && (
                            <img
                              src={account.user.image}
                              alt={account.user.name || ""}
                              className="w-8 h-8 rounded-full"
                            />
                          )}
                          {account.user.name || "ไม่ระบุชื่อ"}
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-500">
                        {account.user.email}
                      </TableCell>
                      <TableCell
                        className={`text-right font-semibold ${
                          account.balance >= 0
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {formatCurrency(account.balance)}
                      </TableCell>
                      <TableCell className="text-right text-gray-500">
                        {account._count.transactions}
                      </TableCell>
                      <TableCell className="text-right text-gray-500">
                        {formatDate(account.updatedAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link href={`/petty-cash/${account.userId}`}>
                          <Button variant="ghost" size="sm">
                            ดูรายละเอียด
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Recent Pending Transactions (if any) */}
        {isAdmin && pendingTransactions.length > 0 && (
          <Card className="mt-8">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-orange-600">
                รายการรออนุมัติ ({pendingTransactions.length})
              </CardTitle>
              <Link href="/petty-cash/approvals">
                <Button variant="outline" size="sm">
                  ดูทั้งหมด
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>วันที่</TableHead>
                    <TableHead>ผู้ขอ</TableHead>
                    <TableHead>ประเภท</TableHead>
                    <TableHead>รายละเอียด</TableHead>
                    <TableHead className="text-right">จำนวนเงิน</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingTransactions.slice(0, 5).map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell>{formatDate(tx.createdAt)}</TableCell>
                      <TableCell>{tx.account.user.name || tx.account.user.email}</TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded text-xs ${
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
                      <TableCell className="text-gray-500">
                        {tx.description || "-"}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(tx.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
