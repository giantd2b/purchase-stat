import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

// Prevent multiple instances of Prisma Client in development
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: Pool | undefined;
};

function createPrismaClient() {
  const pool = globalForPrisma.pool ?? new Pool({
    connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
    ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined,
  });
  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.pool = pool;
  }
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// Types for dashboard data
export interface KPIData {
  totalSpend: number;
  totalTransactions: number;
  uniqueVendors: number;
  uniqueDepartments: number;
  topDepartment: { name: string; spend: number };
  topVendor: { name: string; spend: number };
  averageTransactionValue: number;
}

export interface DepartmentSpend {
  department: string;
  spend: number;
  count: number;
}

export interface VendorSpend {
  vendor: string;
  spend: number;
  count: number;
}

export interface MonthlySpend {
  month: string;
  spend: number;
  count: number;
}

export interface RecentTransaction {
  id: number;
  date: string;
  vendor: string;
  productName: string;
  totalPrice: number;
  minorGroup: string;
}

// Daily Report Types
export interface ReportKPIs {
  totalSpend: number;
  transactionCount: number;
  uniqueVendors: number;
  topDepartment: string;
}

export interface PaymentSpend {
  paymentType: string;
  spend: number;
  count: number;
}

export interface ItemSpend {
  item: string;
  spend: number;
  quantity: number;
  count: number;
}

export interface ReferenceSpend {
  reference: string;
  spend: number;
  count: number;
}

/**
 * Get KPI data from database
 */
export async function getKPIs(): Promise<KPIData> {
  // Total spend and count
  const totals = await prisma.procurementTransaction.aggregate({
    _sum: { totalPrice: true },
    _count: true,
  });

  // Unique vendors
  const vendors = await prisma.procurementTransaction.findMany({
    where: { vendor: { not: null } },
    distinct: ["vendor"],
    select: { vendor: true },
  });

  // Unique departments (minorGroup)
  const departments = await prisma.procurementTransaction.findMany({
    where: { minorGroup: { not: null } },
    distinct: ["minorGroup"],
    select: { minorGroup: true },
  });

  // Top vendor by spend
  const topVendorResult = await prisma.procurementTransaction.groupBy({
    by: ["vendor"],
    where: { vendor: { not: null } },
    _sum: { totalPrice: true },
    orderBy: { _sum: { totalPrice: "desc" } },
    take: 1,
  });

  // Top department by spend
  const topDeptResult = await prisma.procurementTransaction.groupBy({
    by: ["minorGroup"],
    where: { minorGroup: { not: null } },
    _sum: { totalPrice: true },
    orderBy: { _sum: { totalPrice: "desc" } },
    take: 1,
  });

  const totalSpend = totals._sum.totalPrice?.toNumber() || 0;
  const totalTransactions = totals._count;

  return {
    totalSpend,
    totalTransactions,
    uniqueVendors: vendors.length,
    uniqueDepartments: departments.length,
    topDepartment: {
      name: topDeptResult[0]?.minorGroup || "N/A",
      spend: topDeptResult[0]?._sum.totalPrice?.toNumber() || 0,
    },
    topVendor: {
      name: topVendorResult[0]?.vendor || "N/A",
      spend: topVendorResult[0]?._sum.totalPrice?.toNumber() || 0,
    },
    averageTransactionValue: totalTransactions > 0 ? totalSpend / totalTransactions : 0,
  };
}

/**
 * Get KPIs filtered by date range
 */
export async function getKPIsFiltered(startDate: Date, endDate: Date): Promise<KPIData> {
  const dateFilter = { date: { gte: startDate, lte: endDate } };

  // Total spend and count
  const totals = await prisma.procurementTransaction.aggregate({
    where: dateFilter,
    _sum: { totalPrice: true },
    _count: true,
  });

  // Unique vendors
  const vendors = await prisma.procurementTransaction.findMany({
    where: { ...dateFilter, vendor: { not: null } },
    distinct: ["vendor"],
    select: { vendor: true },
  });

  // Unique departments (minorGroup)
  const departments = await prisma.procurementTransaction.findMany({
    where: { ...dateFilter, minorGroup: { not: null } },
    distinct: ["minorGroup"],
    select: { minorGroup: true },
  });

  // Top vendor by spend
  const topVendorResult = await prisma.procurementTransaction.groupBy({
    by: ["vendor"],
    where: { ...dateFilter, vendor: { not: null } },
    _sum: { totalPrice: true },
    orderBy: { _sum: { totalPrice: "desc" } },
    take: 1,
  });

  // Top department by spend
  const topDeptResult = await prisma.procurementTransaction.groupBy({
    by: ["minorGroup"],
    where: { ...dateFilter, minorGroup: { not: null } },
    _sum: { totalPrice: true },
    orderBy: { _sum: { totalPrice: "desc" } },
    take: 1,
  });

  const totalSpend = totals._sum.totalPrice?.toNumber() || 0;
  const totalTransactions = totals._count;

  return {
    totalSpend,
    totalTransactions,
    uniqueVendors: vendors.length,
    uniqueDepartments: departments.length,
    topDepartment: {
      name: topDeptResult[0]?.minorGroup || "N/A",
      spend: topDeptResult[0]?._sum.totalPrice?.toNumber() || 0,
    },
    topVendor: {
      name: topVendorResult[0]?.vendor || "N/A",
      spend: topVendorResult[0]?._sum.totalPrice?.toNumber() || 0,
    },
    averageTransactionValue: totalTransactions > 0 ? totalSpend / totalTransactions : 0,
  };
}

/**
 * Get spending by department
 */
export async function getDepartmentSpend(): Promise<DepartmentSpend[]> {
  const results = await prisma.procurementTransaction.groupBy({
    by: ["minorGroup"],
    _sum: { totalPrice: true },
    _count: true,
    orderBy: { _sum: { totalPrice: "desc" } },
  });

  return results.map((r) => ({
    department: r.minorGroup || "Uncategorized",
    spend: r._sum.totalPrice?.toNumber() || 0,
    count: r._count,
  }));
}

/**
 * Get spending by department filtered by date range
 */
export async function getDepartmentSpendFiltered(startDate: Date, endDate: Date): Promise<DepartmentSpend[]> {
  const results = await prisma.procurementTransaction.groupBy({
    by: ["minorGroup"],
    where: { date: { gte: startDate, lte: endDate } },
    _sum: { totalPrice: true },
    _count: true,
    orderBy: { _sum: { totalPrice: "desc" } },
  });

  return results.map((r) => ({
    department: r.minorGroup || "Uncategorized",
    spend: r._sum.totalPrice?.toNumber() || 0,
    count: r._count,
  }));
}

/**
 * Get top vendors by spend
 */
export async function getTopVendors(limit: number = 10): Promise<VendorSpend[]> {
  const results = await prisma.procurementTransaction.groupBy({
    by: ["vendor"],
    where: { vendor: { not: null } },
    _sum: { totalPrice: true },
    _count: true,
    orderBy: { _sum: { totalPrice: "desc" } },
    take: limit,
  });

  return results.map((r) => ({
    vendor: r.vendor || "Unknown",
    spend: r._sum.totalPrice?.toNumber() || 0,
    count: r._count,
  }));
}

/**
 * Get top vendors by spend filtered by date range
 */
export async function getTopVendorsFiltered(startDate: Date, endDate: Date, limit: number = 10): Promise<VendorSpend[]> {
  const results = await prisma.procurementTransaction.groupBy({
    by: ["vendor"],
    where: { vendor: { not: null }, date: { gte: startDate, lte: endDate } },
    _sum: { totalPrice: true },
    _count: true,
    orderBy: { _sum: { totalPrice: "desc" } },
    take: limit,
  });

  return results.map((r) => ({
    vendor: r.vendor || "Unknown",
    spend: r._sum.totalPrice?.toNumber() || 0,
    count: r._count,
  }));
}

/**
 * Get top items by spend
 */
export async function getTopItems(limit: number = 10): Promise<ItemSpend[]> {
  const results = await prisma.procurementTransaction.groupBy({
    by: ["productName"],
    where: { productName: { not: null } },
    _sum: { totalPrice: true, quantity: true },
    _count: true,
    orderBy: { _sum: { totalPrice: "desc" } },
    take: limit,
  });

  return results.map((r) => ({
    item: r.productName || "Unknown",
    spend: r._sum.totalPrice?.toNumber() || 0,
    quantity: r._sum.quantity?.toNumber() || 0,
    count: r._count,
  }));
}

/**
 * Get top items by spend filtered by date range
 */
export async function getTopItemsFiltered(startDate: Date, endDate: Date, limit: number = 10): Promise<ItemSpend[]> {
  const results = await prisma.procurementTransaction.groupBy({
    by: ["productName"],
    where: { productName: { not: null }, date: { gte: startDate, lte: endDate } },
    _sum: { totalPrice: true, quantity: true },
    _count: true,
    orderBy: { _sum: { totalPrice: "desc" } },
    take: limit,
  });

  return results.map((r) => ({
    item: r.productName || "Unknown",
    spend: r._sum.totalPrice?.toNumber() || 0,
    quantity: r._sum.quantity?.toNumber() || 0,
    count: r._count,
  }));
}

/**
 * Get monthly spending trend
 */
export async function getMonthlySpend(): Promise<MonthlySpend[]> {
  // Get all transactions with dates
  const transactions = await prisma.procurementTransaction.findMany({
    where: { date: { not: null } },
    select: {
      date: true,
      totalPrice: true,
    },
  });

  // Group by month
  const monthlyMap = new Map<string, { spend: number; count: number }>();

  for (const tx of transactions) {
    if (!tx.date) continue;

    const month = `${tx.date.getFullYear()}-${String(tx.date.getMonth() + 1).padStart(2, "0")}`;

    const existing = monthlyMap.get(month) || { spend: 0, count: 0 };
    monthlyMap.set(month, {
      spend: existing.spend + (tx.totalPrice?.toNumber() || 0),
      count: existing.count + 1,
    });
  }

  // Convert to array and sort
  return Array.from(monthlyMap.entries())
    .map(([month, data]) => ({
      month,
      spend: data.spend,
      count: data.count,
    }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

/**
 * Get monthly spending trend filtered by date range
 */
export async function getMonthlySpendFiltered(startDate: Date, endDate: Date): Promise<MonthlySpend[]> {
  const transactions = await prisma.procurementTransaction.findMany({
    where: { date: { gte: startDate, lte: endDate } },
    select: {
      date: true,
      totalPrice: true,
    },
  });

  const monthlyMap = new Map<string, { spend: number; count: number }>();

  for (const tx of transactions) {
    if (!tx.date) continue;

    const month = `${tx.date.getFullYear()}-${String(tx.date.getMonth() + 1).padStart(2, "0")}`;

    const existing = monthlyMap.get(month) || { spend: 0, count: 0 };
    monthlyMap.set(month, {
      spend: existing.spend + (tx.totalPrice?.toNumber() || 0),
      count: existing.count + 1,
    });
  }

  return Array.from(monthlyMap.entries())
    .map(([month, data]) => ({
      month,
      spend: data.spend,
      count: data.count,
    }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

/**
 * Get recent transactions
 */
export async function getRecentTransactions(limit: number = 20): Promise<RecentTransaction[]> {
  const results = await prisma.procurementTransaction.findMany({
    where: { date: { not: null } },
    orderBy: { date: "desc" },
    take: limit,
    select: {
      id: true,
      date: true,
      vendor: true,
      productName: true,
      totalPrice: true,
      minorGroup: true,
    },
  });

  return results.map((r) => ({
    id: r.id,
    date: r.date ? r.date.toISOString().split("T")[0] : "",
    vendor: r.vendor || "Unknown",
    productName: r.productName || "N/A",
    totalPrice: r.totalPrice?.toNumber() || 0,
    minorGroup: r.minorGroup || "Uncategorized",
  }));
}

/**
 * Get recent transactions filtered by date range
 */
export async function getRecentTransactionsFiltered(startDate: Date, endDate: Date, limit: number = 20): Promise<RecentTransaction[]> {
  const results = await prisma.procurementTransaction.findMany({
    where: { date: { gte: startDate, lte: endDate } },
    orderBy: { date: "desc" },
    take: limit,
    select: {
      id: true,
      date: true,
      vendor: true,
      productName: true,
      totalPrice: true,
      minorGroup: true,
    },
  });

  return results.map((r) => ({
    id: r.id,
    date: r.date ? r.date.toISOString().split("T")[0] : "",
    vendor: r.vendor || "Unknown",
    productName: r.productName || "N/A",
    totalPrice: r.totalPrice?.toNumber() || 0,
    minorGroup: r.minorGroup || "Uncategorized",
  }));
}

/**
 * Get sync status
 */
export async function getLastSyncStatus() {
  return prisma.syncLog.findFirst({
    orderBy: { startedAt: "desc" },
  });
}

/**
 * Get total record count
 */
export async function getTotalRecordCount(): Promise<number> {
  return prisma.procurementTransaction.count();
}

// ============================================
// Daily Report Functions
// ============================================

/**
 * Get KPIs for date range
 */
export async function getReportKPIs(startDate: Date, endDate: Date): Promise<ReportKPIs> {
  const [totals, vendors, topDept] = await Promise.all([
    prisma.procurementTransaction.aggregate({
      where: { date: { gte: startDate, lte: endDate } },
      _sum: { totalPrice: true },
      _count: true,
    }),
    prisma.procurementTransaction.findMany({
      where: { date: { gte: startDate, lte: endDate }, vendor: { not: null } },
      distinct: ["vendor"],
      select: { vendor: true },
    }),
    prisma.procurementTransaction.groupBy({
      by: ["minorGroup"],
      where: { date: { gte: startDate, lte: endDate }, minorGroup: { not: null } },
      _sum: { totalPrice: true },
      orderBy: { _sum: { totalPrice: "desc" } },
      take: 1,
    }),
  ]);

  return {
    totalSpend: totals._sum.totalPrice?.toNumber() || 0,
    transactionCount: totals._count,
    uniqueVendors: vendors.length,
    topDepartment: topDept[0]?.minorGroup || "N/A",
  };
}

/**
 * Get spending by vendor for date range
 */
export async function getSpendByVendor(startDate: Date, endDate: Date): Promise<VendorSpend[]> {
  const results = await prisma.procurementTransaction.groupBy({
    by: ["vendor"],
    where: { date: { gte: startDate, lte: endDate }, vendor: { not: null } },
    _sum: { totalPrice: true },
    _count: true,
    orderBy: { _sum: { totalPrice: "desc" } },
  });

  return results.map((r) => ({
    vendor: r.vendor || "Unknown",
    spend: r._sum.totalPrice?.toNumber() || 0,
    count: r._count,
  }));
}

/**
 * Get spending by payment type for date range
 */
export async function getSpendByPayment(startDate: Date, endDate: Date): Promise<PaymentSpend[]> {
  const results = await prisma.procurementTransaction.groupBy({
    by: ["payment"],
    where: { date: { gte: startDate, lte: endDate }, payment: { not: null } },
    _sum: { totalPrice: true },
    _count: true,
    orderBy: { _sum: { totalPrice: "desc" } },
  });

  return results.map((r) => ({
    paymentType: r.payment || "Unknown",
    spend: r._sum.totalPrice?.toNumber() || 0,
    count: r._count,
  }));
}

/**
 * Get spending by item for date range
 */
export async function getSpendByItem(startDate: Date, endDate: Date): Promise<ItemSpend[]> {
  const results = await prisma.procurementTransaction.groupBy({
    by: ["productName"],
    where: { date: { gte: startDate, lte: endDate }, productName: { not: null } },
    _sum: { totalPrice: true, quantity: true },
    _count: true,
    orderBy: { _sum: { totalPrice: "desc" } },
  });

  return results.map((r) => ({
    item: r.productName || "Unknown",
    spend: r._sum.totalPrice?.toNumber() || 0,
    quantity: r._sum.quantity?.toNumber() || 0,
    count: r._count,
  }));
}

/**
 * Get spending by department for date range
 */
export async function getSpendByDepartment(startDate: Date, endDate: Date): Promise<DepartmentSpend[]> {
  const results = await prisma.procurementTransaction.groupBy({
    by: ["minorGroup"],
    where: { date: { gte: startDate, lte: endDate }, minorGroup: { not: null } },
    _sum: { totalPrice: true },
    _count: true,
    orderBy: { _sum: { totalPrice: "desc" } },
  });

  return results.map((r) => ({
    department: r.minorGroup || "Uncategorized",
    spend: r._sum.totalPrice?.toNumber() || 0,
    count: r._count,
  }));
}

// ============================================
// Filter Options Functions
// ============================================

export interface FilterOptions {
  vendors: string[];
  paymentTypes: string[];
  departments: string[];
  items: string[];
  references: string[];
}

/**
 * Get all filter options for the date range
 */
export async function getFilterOptions(startDate: Date, endDate: Date): Promise<FilterOptions> {
  const [vendors, payments, departments, items, references] = await Promise.all([
    prisma.procurementTransaction.findMany({
      where: { date: { gte: startDate, lte: endDate }, vendor: { not: null } },
      distinct: ["vendor"],
      select: { vendor: true },
      orderBy: { vendor: "asc" },
    }),
    prisma.procurementTransaction.findMany({
      where: { date: { gte: startDate, lte: endDate }, payment: { not: null } },
      distinct: ["payment"],
      select: { payment: true },
      orderBy: { payment: "asc" },
    }),
    prisma.procurementTransaction.findMany({
      where: { date: { gte: startDate, lte: endDate }, minorGroup: { not: null } },
      distinct: ["minorGroup"],
      select: { minorGroup: true },
      orderBy: { minorGroup: "asc" },
    }),
    prisma.procurementTransaction.findMany({
      where: { date: { gte: startDate, lte: endDate }, productName: { not: null } },
      distinct: ["productName"],
      select: { productName: true },
      orderBy: { productName: "asc" },
    }),
    prisma.procurementTransaction.findMany({
      where: { date: { gte: startDate, lte: endDate }, reference: { not: null } },
      distinct: ["reference"],
      select: { reference: true },
      orderBy: { reference: "asc" },
    }),
  ]);

  return {
    vendors: vendors.map((v) => v.vendor!).filter(Boolean),
    paymentTypes: payments.map((p) => p.payment!).filter(Boolean),
    departments: departments.map((d) => d.minorGroup!).filter(Boolean),
    items: items.map((i) => i.productName!).filter(Boolean),
    references: references.map((r) => r.reference!).filter(Boolean),
  };
}

// ============================================
// Filtered Report Functions
// ============================================

export interface ReportFilters {
  vendor?: string;
  paymentType?: string;
  department?: string;
  item?: string;
  reference?: string;
}

/**
 * Get KPIs for date range with filters
 */
export async function getReportKPIsFiltered(
  startDate: Date,
  endDate: Date,
  filters: ReportFilters
): Promise<ReportKPIs> {
  const where = {
    date: { gte: startDate, lte: endDate },
    ...(filters.vendor && { vendor: filters.vendor }),
    ...(filters.paymentType && { payment: filters.paymentType }),
    ...(filters.department && { minorGroup: filters.department }),
    ...(filters.item && { productName: filters.item }),
    ...(filters.reference && { reference: filters.reference }),
  };

  const [totals, vendors, topDept] = await Promise.all([
    prisma.procurementTransaction.aggregate({
      where,
      _sum: { totalPrice: true },
      _count: true,
    }),
    prisma.procurementTransaction.findMany({
      where: { ...where, vendor: { not: null } },
      distinct: ["vendor"],
      select: { vendor: true },
    }),
    prisma.procurementTransaction.groupBy({
      by: ["minorGroup"],
      where: { ...where, minorGroup: { not: null } },
      _sum: { totalPrice: true },
      orderBy: { _sum: { totalPrice: "desc" } },
      take: 1,
    }),
  ]);

  return {
    totalSpend: totals._sum.totalPrice?.toNumber() || 0,
    transactionCount: totals._count,
    uniqueVendors: vendors.length,
    topDepartment: topDept[0]?.minorGroup || "N/A",
  };
}

/**
 * Get spending by vendor for date range with filters
 */
export async function getSpendByVendorFiltered(
  startDate: Date,
  endDate: Date,
  filters: ReportFilters
): Promise<VendorSpend[]> {
  const where = {
    date: { gte: startDate, lte: endDate },
    vendor: { not: null },
    ...(filters.vendor && { vendor: filters.vendor }),
    ...(filters.paymentType && { payment: filters.paymentType }),
    ...(filters.department && { minorGroup: filters.department }),
    ...(filters.item && { productName: filters.item }),
    ...(filters.reference && { reference: filters.reference }),
  };

  const results = await prisma.procurementTransaction.groupBy({
    by: ["vendor"],
    where,
    _sum: { totalPrice: true },
    _count: true,
    orderBy: { _sum: { totalPrice: "desc" } },
  });

  return results.map((r) => ({
    vendor: r.vendor || "Unknown",
    spend: r._sum.totalPrice?.toNumber() || 0,
    count: r._count,
  }));
}

/**
 * Get spending by payment type for date range with filters
 */
export async function getSpendByPaymentFiltered(
  startDate: Date,
  endDate: Date,
  filters: ReportFilters
): Promise<PaymentSpend[]> {
  const where = {
    date: { gte: startDate, lte: endDate },
    payment: { not: null },
    ...(filters.vendor && { vendor: filters.vendor }),
    ...(filters.paymentType && { payment: filters.paymentType }),
    ...(filters.department && { minorGroup: filters.department }),
    ...(filters.item && { productName: filters.item }),
    ...(filters.reference && { reference: filters.reference }),
  };

  const results = await prisma.procurementTransaction.groupBy({
    by: ["payment"],
    where,
    _sum: { totalPrice: true },
    _count: true,
    orderBy: { _sum: { totalPrice: "desc" } },
  });

  return results.map((r) => ({
    paymentType: r.payment || "Unknown",
    spend: r._sum.totalPrice?.toNumber() || 0,
    count: r._count,
  }));
}

/**
 * Get spending by item for date range with filters
 */
export async function getSpendByItemFiltered(
  startDate: Date,
  endDate: Date,
  filters: ReportFilters
): Promise<ItemSpend[]> {
  const where = {
    date: { gte: startDate, lte: endDate },
    productName: { not: null },
    ...(filters.vendor && { vendor: filters.vendor }),
    ...(filters.paymentType && { payment: filters.paymentType }),
    ...(filters.department && { minorGroup: filters.department }),
    ...(filters.item && { productName: filters.item }),
    ...(filters.reference && { reference: filters.reference }),
  };

  const results = await prisma.procurementTransaction.groupBy({
    by: ["productName"],
    where,
    _sum: { totalPrice: true, quantity: true },
    _count: true,
    orderBy: { _sum: { totalPrice: "desc" } },
  });

  return results.map((r) => ({
    item: r.productName || "Unknown",
    spend: r._sum.totalPrice?.toNumber() || 0,
    quantity: r._sum.quantity?.toNumber() || 0,
    count: r._count,
  }));
}

/**
 * Get spending by department for date range with filters
 */
export async function getSpendByDepartmentFiltered(
  startDate: Date,
  endDate: Date,
  filters: ReportFilters
): Promise<DepartmentSpend[]> {
  const where = {
    date: { gte: startDate, lte: endDate },
    minorGroup: { not: null },
    ...(filters.vendor && { vendor: filters.vendor }),
    ...(filters.paymentType && { payment: filters.paymentType }),
    ...(filters.department && { minorGroup: filters.department }),
    ...(filters.item && { productName: filters.item }),
    ...(filters.reference && { reference: filters.reference }),
  };

  const results = await prisma.procurementTransaction.groupBy({
    by: ["minorGroup"],
    where,
    _sum: { totalPrice: true },
    _count: true,
    orderBy: { _sum: { totalPrice: "desc" } },
  });

  return results.map((r) => ({
    department: r.minorGroup || "Uncategorized",
    spend: r._sum.totalPrice?.toNumber() || 0,
    count: r._count,
  }));
}

/**
 * Get spending by reference for date range with filters
 */
export async function getSpendByReferenceFiltered(
  startDate: Date,
  endDate: Date,
  filters: ReportFilters
): Promise<ReferenceSpend[]> {
  const where = {
    date: { gte: startDate, lte: endDate },
    reference: { not: null },
    ...(filters.vendor && { vendor: filters.vendor }),
    ...(filters.paymentType && { payment: filters.paymentType }),
    ...(filters.department && { minorGroup: filters.department }),
    ...(filters.item && { productName: filters.item }),
  };

  const results = await prisma.procurementTransaction.groupBy({
    by: ["reference"],
    where,
    _sum: { totalPrice: true },
    _count: true,
    orderBy: { _sum: { totalPrice: "desc" } },
  });

  return results.map((r) => ({
    reference: r.reference || "Unknown",
    spend: r._sum.totalPrice?.toNumber() || 0,
    count: r._count,
  }));
}
