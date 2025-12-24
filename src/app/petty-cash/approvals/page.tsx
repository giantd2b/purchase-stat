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
import { ApprovalTable } from "./ApprovalTable";

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
            <ApprovalTable transactions={pendingTransactions} />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
