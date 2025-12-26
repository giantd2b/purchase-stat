import { getTransactions, getFilterOptions } from "@/lib/transactions-db";
import { Button } from "@/components/ui/button";
import { AlertCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { TransactionsClient } from "./TransactionsClient";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    page?: string;
    startDate?: string;
    endDate?: string;
    vendor?: string;
    payment?: string;
    minorGroup?: string;
    search?: string;
  }>;
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-8">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 max-w-md text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
          Failed to Load Transactions
        </h2>
        <p className="text-gray-600 dark:text-gray-400">{message}</p>
        <Link href="/" className="mt-4 inline-block">
          <Button variant="outline">Back to Dashboard</Button>
        </Link>
      </div>
    </div>
  );
}

// Get default date range (current date - Thailand timezone)
function getDefaultDates() {
  const now = new Date();
  const bangkokTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
  const today = `${bangkokTime.getFullYear()}-${String(bangkokTime.getMonth() + 1).padStart(2, "0")}-${String(bangkokTime.getDate()).padStart(2, "0")}`;

  return {
    startDate: today,
    endDate: today,
  };
}

export default async function TransactionsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const defaultDates = getDefaultDates();

  const page = parseInt(params.page || "1", 10);
  const startDate = params.startDate || defaultDates.startDate;
  const endDate = params.endDate || defaultDates.endDate;

  const filters = {
    startDate: new Date(startDate),
    endDate: new Date(endDate),
    vendor: params.vendor,
    payment: params.payment,
    minorGroup: params.minorGroup,
    search: params.search,
  };

  let data;
  let filterOptions;
  let error: string | null = null;

  try {
    [data, filterOptions] = await Promise.all([
      getTransactions(filters, page, 50),
      getFilterOptions(),
    ]);
  } catch (e) {
    error = e instanceof Error ? e.message : "Unknown error occurred";
    console.error("Error fetching transactions:", e);
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
                  จัดการรายการซื้อ
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Transaction Management
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <TransactionsClient
          data={data!}
          filterOptions={filterOptions!}
          currentFilters={{
            startDate,
            endDate,
            vendor: params.vendor,
            payment: params.payment,
            minorGroup: params.minorGroup,
            search: params.search,
          }}
        />
      </main>
    </div>
  );
}
