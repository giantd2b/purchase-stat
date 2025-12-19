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
    host: "localhost",
    port: 5432,
    database: "procurement_dashboard",
    user: "procurement",
    password: "procurement123",
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
