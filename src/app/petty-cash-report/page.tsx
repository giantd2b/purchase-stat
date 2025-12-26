import { getDailySummary, getDailyBalance, getDepartments } from "@/lib/petty-cash-report-db";
import { Button } from "@/components/ui/button";
import { AlertCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { PettyCashReportClient } from "./PettyCashReportClient";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    date?: string;
  }>;
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-8">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 max-w-md text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
          Failed to Load Report
        </h2>
        <p className="text-gray-600 dark:text-gray-400">{message}</p>
        <Link href="/" className="mt-4 inline-block">
          <Button variant="outline">Back to Dashboard</Button>
        </Link>
      </div>
    </div>
  );
}

function getTodayString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export default async function PettyCashReportPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const dateStr = params.date || getTodayString();
  const date = new Date(dateStr);

  let summary;
  let dailyBalance;
  let departments: string[] = [];
  let error: string | null = null;

  try {
    [summary, dailyBalance, departments] = await Promise.all([
      getDailySummary(date),
      getDailyBalance(date),
      getDepartments(),
    ]);
  } catch (e) {
    error = e instanceof Error ? e.message : "Unknown error occurred";
    console.error("Error fetching petty cash report:", e);
  }

  if (error) {
    return <ErrorState message={error} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  รายงานเงินสดย่อยประจำวัน
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Petty Cash Daily Report
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PettyCashReportClient
          initialDate={dateStr}
          summary={summary!}
          dailyBalance={dailyBalance}
          departments={departments}
        />
      </main>
    </div>
  );
}
