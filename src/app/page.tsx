import {
  getKPIsFiltered,
  getDepartmentSpendFiltered,
  getTopVendorsFiltered,
  getTopItemsFiltered,
  getMonthlySpendFiltered,
  getRecentTransactionsFiltered,
  getTotalRecordCount,
  getLastSyncStatus,
} from "@/lib/db";
import Dashboard from "@/components/Dashboard";
import SyncButton from "@/components/SyncButton";
import SyncItemsButton from "@/components/SyncItemsButton";
import { UserNav } from "@/components/UserNav";
import { DashboardDatePicker } from "@/components/DashboardDatePicker";
import { Button } from "@/components/ui/button";
import { RefreshCw, AlertCircle, Database, FileText, Wallet } from "lucide-react";
import { revalidatePath } from "next/cache";
import Link from "next/link";

// Force dynamic rendering to ensure fresh data
export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    start?: string;
    end?: string;
  }>;
}

// Error component for when data fetching fails
function ErrorState({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-8">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 max-w-md text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
          Failed to Load Data
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-4">{message}</p>
        <p className="text-sm text-gray-500 dark:text-gray-500">
          Please ensure the database is running and synced. Run `npm run sync` to sync data from Google Sheets.
        </p>
      </div>
    </div>
  );
}

// Empty state when no data in database
function EmptyState() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-8">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 max-w-md text-center">
        <Database className="h-12 w-12 text-blue-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
          No Data Found
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          The database is empty. Please sync data from Google Sheets first.
        </p>
        <div className="bg-gray-100 dark:bg-gray-700 rounded p-3 text-left">
          <code className="text-sm text-gray-800 dark:text-gray-200">
            npm run sync
          </code>
        </div>
      </div>
    </div>
  );
}

// Server Action to refresh data
async function refreshData() {
  "use server";
  revalidatePath("/");
}

// Main page component - Server Component
export default async function HomePage({ searchParams }: PageProps) {
  const params = await searchParams;

  // Default to Year to Date (January 1 of current year to today)
  const now = new Date();
  const yearStart = `${now.getFullYear()}-01-01`;
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const startStr = params.start || yearStart;
  const endStr = params.end || todayStr;

  const startDate = new Date(startStr);
  startDate.setHours(0, 0, 0, 0);

  const endDate = new Date(endStr + "T23:59:59.999");

  let kpis;
  let departmentData;
  let vendorData;
  let itemData;
  let monthlyData;
  let recentTransactions;
  let totalRecords = 0;
  let lastSync;
  let error: string | null = null;

  try {
    // Fetch all data from database in parallel with date filtering
    [kpis, departmentData, vendorData, itemData, monthlyData, recentTransactions, totalRecords, lastSync] =
      await Promise.all([
        getKPIsFiltered(startDate, endDate),
        getDepartmentSpendFiltered(startDate, endDate),
        getTopVendorsFiltered(startDate, endDate, 10),
        getTopItemsFiltered(startDate, endDate, 10),
        getMonthlySpendFiltered(startDate, endDate),
        getRecentTransactionsFiltered(startDate, endDate, 20),
        getTotalRecordCount(),
        getLastSyncStatus(),
      ]);
  } catch (e) {
    error = e instanceof Error ? e.message : "Unknown error occurred";
    console.error("Error fetching data from database:", e);
  }

  // Handle error state
  if (error) {
    return <ErrorState message={error} />;
  }

  // Handle empty database
  if (totalRecords === 0) {
    return <EmptyState />;
  }

  // Format last sync time
  const lastSyncTime = lastSync?.completedAt
    ? new Intl.DateTimeFormat("th-TH", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(lastSync.completedAt)
    : "Never";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  Procurement Dashboard
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Real-time procurement analytics and insights
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Link href="/daily-report">
                  <Button variant="outline" size="sm">
                    <FileText className="h-4 w-4 mr-2" />
                    Daily Report
                  </Button>
                </Link>
                <Link href="/petty-cash">
                  <Button variant="outline" size="sm">
                    <Wallet className="h-4 w-4 mr-2" />
                    Petty Cash
                  </Button>
                </Link>
                <SyncItemsButton />
                <SyncButton />
                <form action={refreshData}>
                  <Button variant="outline" size="sm" type="submit">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </form>
                <UserNav />
              </div>
            </div>
            {/* Date Picker */}
            <DashboardDatePicker
              initialStart={startStr}
              initialEnd={endStr}
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Dashboard
          kpis={kpis!}
          departmentData={departmentData!}
          vendorData={vendorData!}
          itemData={itemData!}
          monthlyData={monthlyData!}
          recentTransactions={recentTransactions!.map((tx: { date: string; vendor: string; productName: string; totalPrice: number; minorGroup: string }) => ({
            date: tx.date,
            vendor: tx.vendor,
            item: tx.productName,
            totalPrice: tx.totalPrice,
            department: tx.minorGroup,
          }))}
        />
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-center text-sm text-gray-500 dark:text-gray-400">
            {totalRecords.toLocaleString()} total records • Last sync: {lastSyncTime} •{" "}
            <Link href="/daily-report" className="text-blue-500 hover:underline">
              Daily Report
            </Link>
            {" • "}
            <Link href="/petty-cash" className="text-blue-500 hover:underline">
              Petty Cash
            </Link>
            {" • "}
            <Link href="/sync-logs" className="text-blue-500 hover:underline">
              Sync Logs
            </Link>
          </p>
        </div>
      </footer>
    </div>
  );
}
