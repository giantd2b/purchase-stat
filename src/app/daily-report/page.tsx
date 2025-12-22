import {
  getReportKPIsFiltered,
  getSpendByVendorFiltered,
  getSpendByPaymentFiltered,
  getSpendByItemFiltered,
  getSpendByDepartmentFiltered,
  getSpendByReferenceFiltered,
  getFilterOptions,
  type ReportKPIs,
  type VendorSpend,
  type PaymentSpend,
  type ItemSpend,
  type DepartmentSpend,
  type ReferenceSpend,
  type FilterOptions,
} from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertCircle, ArrowLeft, DollarSign, Users, ShoppingCart, Building2 } from "lucide-react";
import Link from "next/link";
import { DailyReportClient } from "@/components/DailyReportClient";
import { UserNav } from "@/components/UserNav";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    start?: string;
    end?: string;
    vendor?: string;
    paymentType?: string;
    department?: string;
    item?: string;
    reference?: string;
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

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("th-TH").format(value);
}

function formatPercent(value: number, total: number): string {
  if (total === 0) return "0%";
  return `${((value / total) * 100).toFixed(1)}%`;
}

export default async function DailyReportPage({ searchParams }: PageProps) {
  const params = await searchParams;

  // Default to today if no dates provided
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const startStr = params.start || todayStr;
  const endStr = params.end || todayStr;

  const startDate = new Date(startStr);
  startDate.setHours(0, 0, 0, 0);

  const endDate = new Date(endStr + "T23:59:59.999");

  // Extract filters from params
  const filters = {
    vendor: params.vendor,
    paymentType: params.paymentType,
    department: params.department,
    item: params.item,
    reference: params.reference,
  };

  let kpis: ReportKPIs | null = null;
  let vendorData: VendorSpend[] = [];
  let paymentData: PaymentSpend[] = [];
  let itemData: ItemSpend[] = [];
  let departmentData: DepartmentSpend[] = [];
  let referenceData: ReferenceSpend[] = [];
  let filterOptions: FilterOptions = { vendors: [], paymentTypes: [], departments: [], items: [], references: [] };
  let error: string | null = null;

  try {
    [kpis, vendorData, paymentData, itemData, departmentData, referenceData, filterOptions] = await Promise.all([
      getReportKPIsFiltered(startDate, endDate, filters),
      getSpendByVendorFiltered(startDate, endDate, filters),
      getSpendByPaymentFiltered(startDate, endDate, filters),
      getSpendByItemFiltered(startDate, endDate, filters),
      getSpendByDepartmentFiltered(startDate, endDate, filters),
      getSpendByReferenceFiltered(startDate, endDate, filters),
      getFilterOptions(startDate, endDate),
    ]);
  } catch (e) {
    error = e instanceof Error ? e.message : "Unknown error occurred";
    console.error("Error fetching report data:", e);
  }

  if (error) {
    return <ErrorState message={error} />;
  }

  const totalSpend = kpis?.totalSpend || 0;
  const hasActiveFilters = filters.vendor || filters.paymentType || filters.department || filters.item || filters.reference;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col gap-4">
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
                    Daily Report
                  </h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    สรุปยอดรายวัน
                    {hasActiveFilters && (
                      <span className="ml-2 text-blue-500">(Filtered)</span>
                    )}
                  </p>
                </div>
              </div>
              <UserNav />
            </div>
            {/* Date Picker and Filters */}
            <DailyReportClient
              initialStart={startStr}
              initialEnd={endStr}
              filterOptions={filterOptions}
              initialFilters={filters}
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Spend</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalSpend)}</div>
              <p className="text-xs text-muted-foreground">ยอดซื้อรวม</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Transactions</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(kpis?.transactionCount || 0)}</div>
              <p className="text-xs text-muted-foreground">จำนวนรายการ</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Vendors</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(kpis?.uniqueVendors || 0)}</div>
              <p className="text-xs text-muted-foreground">ผู้ขาย/ผู้ให้บริการ</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Top Department</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold truncate">{kpis?.topDepartment || "N/A"}</div>
              <p className="text-xs text-muted-foreground">แผนกที่มียอดสูงสุด</p>
            </CardContent>
          </Card>
        </div>

        {/* Summary Tables - 2x2 Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* By Vendor */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">By Vendor (ยอดตาม Vendor)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-80 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vendor</TableHead>
                      <TableHead className="text-right">Spend</TableHead>
                      <TableHead className="text-right">Count</TableHead>
                      <TableHead className="text-right">%</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vendorData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                          No data
                        </TableCell>
                      </TableRow>
                    ) : (
                      vendorData.map((v, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium truncate max-w-[200px]" title={v.vendor}>
                            {v.vendor}
                          </TableCell>
                          <TableCell className="text-right">{formatCurrency(v.spend)}</TableCell>
                          <TableCell className="text-right">{formatNumber(v.count)}</TableCell>
                          <TableCell className="text-right">{formatPercent(v.spend, totalSpend)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* By Payment Type */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">By Payment Type (ยอดตามประเภทชำระ)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-80 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Payment Type</TableHead>
                      <TableHead className="text-right">Spend</TableHead>
                      <TableHead className="text-right">Count</TableHead>
                      <TableHead className="text-right">%</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paymentData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                          No data
                        </TableCell>
                      </TableRow>
                    ) : (
                      paymentData.map((p, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">{p.paymentType}</TableCell>
                          <TableCell className="text-right">{formatCurrency(p.spend)}</TableCell>
                          <TableCell className="text-right">{formatNumber(p.count)}</TableCell>
                          <TableCell className="text-right">{formatPercent(p.spend, totalSpend)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* By Item */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">By Item (ยอดตามสินค้า)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-80 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-right">Spend</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Count</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {itemData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                          No data
                        </TableCell>
                      </TableRow>
                    ) : (
                      itemData.map((item, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium truncate max-w-[200px]" title={item.item}>
                            {item.item}
                          </TableCell>
                          <TableCell className="text-right">{formatCurrency(item.spend)}</TableCell>
                          <TableCell className="text-right">{formatNumber(item.quantity)}</TableCell>
                          <TableCell className="text-right">{formatNumber(item.count)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* By Department */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">By Department (ยอดตามแผนก)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-80 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Department</TableHead>
                      <TableHead className="text-right">Spend</TableHead>
                      <TableHead className="text-right">Count</TableHead>
                      <TableHead className="text-right">%</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {departmentData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                          No data
                        </TableCell>
                      </TableRow>
                    ) : (
                      departmentData.map((d, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium truncate max-w-[200px]" title={d.department}>
                            {d.department}
                          </TableCell>
                          <TableCell className="text-right">{formatCurrency(d.spend)}</TableCell>
                          <TableCell className="text-right">{formatNumber(d.count)}</TableCell>
                          <TableCell className="text-right">{formatPercent(d.spend, totalSpend)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* By Reference */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">By Reference (ยอดตามเอกสารอ้างอิง)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-80 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Reference</TableHead>
                      <TableHead className="text-right">Spend</TableHead>
                      <TableHead className="text-right">Count</TableHead>
                      <TableHead className="text-right">%</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {referenceData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                          No data
                        </TableCell>
                      </TableRow>
                    ) : (
                      referenceData.map((r, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium truncate max-w-[200px]" title={r.reference}>
                            {r.reference}
                          </TableCell>
                          <TableCell className="text-right">{formatCurrency(r.spend)}</TableCell>
                          <TableCell className="text-right">{formatNumber(r.count)}</TableCell>
                          <TableCell className="text-right">{formatPercent(r.spend, totalSpend)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-center text-sm text-gray-500 dark:text-gray-400">
            <Link href="/" className="text-blue-500 hover:underline">
              Back to Dashboard
            </Link>
          </p>
        </div>
      </footer>
    </div>
  );
}
