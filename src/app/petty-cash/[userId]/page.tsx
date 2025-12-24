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
import { UserDetailClient } from "./UserDetailClient";
import { TransactionTable } from "./TransactionTable";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 2,
  }).format(amount);
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
            <TransactionTable transactions={transactions} />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
