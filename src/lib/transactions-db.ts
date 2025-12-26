import { prisma } from "./db";

// Types
export interface TransactionFilters {
  startDate?: Date;
  endDate?: Date;
  vendor?: string;
  payment?: string;
  minorGroup?: string;
  search?: string;
}

export interface TransactionWithOverride {
  id: number;
  date: Date | null;
  reference: string | null;
  vendor: string | null;
  productName: string | null;
  totalPrice: number;
  actualPrice: number | null;
  overrideReason: string | null;
  payment: string | null;
  minorGroup: string | null;
  isManual: boolean;
}

export interface TransactionStats {
  totalCount: number;
  totalAmount: number;
  filteredCount: number;
  filteredAmount: number;
}

export interface PaginatedTransactions {
  transactions: TransactionWithOverride[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  stats: {
    pageAmount: number;
  };
}

export interface FilterOptions {
  vendors: string[];
  payments: string[];
  departments: string[];
}

// Helper to get date range
function getDateRange(startDate?: Date, endDate?: Date): { start: Date; end: Date } | null {
  if (!startDate && !endDate) return null;

  const start = startDate || new Date("2020-01-01");
  const end = endDate || new Date();

  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

// Build where clause for filters
function buildWhereClause(filters: TransactionFilters) {
  const where: Record<string, unknown> = {};

  const dateRange = getDateRange(filters.startDate, filters.endDate);
  if (dateRange) {
    where.date = {
      gte: dateRange.start,
      lte: dateRange.end,
    };
  }

  if (filters.vendor) {
    where.vendor = { contains: filters.vendor, mode: "insensitive" };
  }

  if (filters.payment) {
    where.payment = filters.payment;
  }

  if (filters.minorGroup) {
    where.minorGroup = filters.minorGroup;
  }

  if (filters.search) {
    where.OR = [
      { reference: { contains: filters.search, mode: "insensitive" } },
      { productName: { contains: filters.search, mode: "insensitive" } },
      { vendor: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  return where;
}

// Get paginated transactions
export async function getTransactions(
  filters: TransactionFilters,
  page: number = 1,
  limit: number = 50
): Promise<PaginatedTransactions> {
  const where = buildWhereClause(filters);
  const skip = (page - 1) * limit;

  // Get synced transactions from Google Sheet (sorted by vendor, then date)
  const [syncedTransactions, totalCount] = await Promise.all([
    prisma.procurementTransaction.findMany({
      where,
      orderBy: [
        { vendor: "asc" },
        { date: "desc" },
      ],
      skip,
      take: limit,
      select: {
        id: true,
        date: true,
        reference: true,
        vendor: true,
        productName: true,
        totalWithVat: true,
        payment: true,
        minorGroup: true,
      },
    }),
    prisma.procurementTransaction.count({ where }),
  ]);

  // Get overrides for these transactions
  const transactionIds = syncedTransactions.map((t) => t.id);
  const overrides = await prisma.transactionOverride.findMany({
    where: { transactionId: { in: transactionIds } },
  });

  const overridesMap = new Map(
    overrides.map((o) => [
      o.transactionId,
      { actualPrice: o.actualPrice.toNumber(), reason: o.reason },
    ])
  );

  // Get manual transactions for the same page (sorted by vendor, then date)
  const manualWhere = buildManualWhereClause(filters);
  const manualTransactions = await prisma.manualTransaction.findMany({
    where: manualWhere,
    orderBy: [
      { vendor: "asc" },
      { date: "desc" },
    ],
    skip,
    take: limit,
  });

  // Map synced transactions
  const mappedSynced: TransactionWithOverride[] = syncedTransactions.map((t) => {
    const override = overridesMap.get(t.id);
    return {
      id: t.id,
      date: t.date,
      reference: t.reference,
      vendor: t.vendor,
      productName: t.productName,
      totalPrice: t.totalWithVat?.toNumber() || 0,
      actualPrice: override?.actualPrice || null,
      overrideReason: override?.reason || null,
      payment: t.payment,
      minorGroup: t.minorGroup,
      isManual: false,
    };
  });

  // Map manual transactions (use negative IDs to distinguish)
  const mappedManual: TransactionWithOverride[] = manualTransactions.map((t) => ({
    id: -t.id,
    date: t.date,
    reference: t.reference,
    vendor: t.vendor,
    productName: t.productName,
    totalPrice: t.totalPrice.toNumber(),
    actualPrice: null,
    overrideReason: null,
    payment: t.payment,
    minorGroup: t.minorGroup,
    isManual: true,
  }));

  // Combine and sort by vendor (asc), then date (desc)
  const allTransactions = [...mappedSynced, ...mappedManual].sort((a, b) => {
    // First sort by vendor name (ascending)
    const vendorA = (a.vendor || "").toLowerCase();
    const vendorB = (b.vendor || "").toLowerCase();
    if (vendorA !== vendorB) {
      return vendorA.localeCompare(vendorB, "th");
    }
    // Then sort by date (descending)
    if (!a.date || !b.date) return 0;
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  // Calculate page amount
  const pageAmount = allTransactions.reduce((sum, t) => {
    return sum + (t.actualPrice !== null ? t.actualPrice : t.totalPrice);
  }, 0);

  const totalPages = Math.ceil(totalCount / limit);

  return {
    transactions: allTransactions,
    pagination: {
      page,
      limit,
      total: totalCount,
      totalPages,
    },
    stats: {
      pageAmount,
    },
  };
}

// Build where clause for manual transactions
function buildManualWhereClause(filters: TransactionFilters) {
  const where: Record<string, unknown> = {};

  const dateRange = getDateRange(filters.startDate, filters.endDate);
  if (dateRange) {
    where.date = {
      gte: dateRange.start,
      lte: dateRange.end,
    };
  }

  if (filters.vendor) {
    where.vendor = { contains: filters.vendor, mode: "insensitive" };
  }

  if (filters.payment) {
    where.payment = filters.payment;
  }

  if (filters.minorGroup) {
    where.minorGroup = filters.minorGroup;
  }

  if (filters.search) {
    where.OR = [
      { reference: { contains: filters.search, mode: "insensitive" } },
      { productName: { contains: filters.search, mode: "insensitive" } },
      { vendor: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  return where;
}

// Get filter options (distinct values)
export async function getFilterOptions(): Promise<FilterOptions> {
  const [vendors, payments, departments] = await Promise.all([
    prisma.procurementTransaction.findMany({
      where: { vendor: { not: null } },
      distinct: ["vendor"],
      select: { vendor: true },
      orderBy: { vendor: "asc" },
      take: 100, // Limit for performance
    }),
    prisma.procurementTransaction.findMany({
      where: { payment: { not: null } },
      distinct: ["payment"],
      select: { payment: true },
      orderBy: { payment: "asc" },
    }),
    prisma.procurementTransaction.findMany({
      where: { minorGroup: { not: null } },
      distinct: ["minorGroup"],
      select: { minorGroup: true },
      orderBy: { minorGroup: "asc" },
    }),
  ]);

  return {
    vendors: vendors.map((v) => v.vendor).filter((v): v is string => v !== null),
    payments: payments.map((p) => p.payment).filter((p): p is string => p !== null),
    departments: departments.map((d) => d.minorGroup).filter((d): d is string => d !== null),
  };
}

// ============================================
// Override Functions (reuse from petty-cash-report-db)
// ============================================

export async function upsertTransactionOverride(
  transactionId: number,
  actualPrice: number,
  userId: string,
  reason?: string
) {
  return prisma.transactionOverride.upsert({
    where: { transactionId },
    update: {
      actualPrice,
      reason: reason || null,
    },
    create: {
      transactionId,
      actualPrice,
      reason: reason || null,
      createdBy: userId,
    },
  });
}

export async function deleteTransactionOverride(transactionId: number) {
  return prisma.transactionOverride.deleteMany({
    where: { transactionId },
  });
}

// ============================================
// Manual Transaction CRUD
// ============================================

export interface ManualTransactionInput {
  date: Date;
  reference?: string;
  vendor?: string;
  productName?: string;
  totalPrice: number;
  payment?: string;
  minorGroup?: string;
  note?: string;
}

export async function createManualTransaction(
  data: ManualTransactionInput,
  userId: string
): Promise<number> {
  const dateOnly = new Date(data.date);
  dateOnly.setHours(0, 0, 0, 0);

  const result = await prisma.manualTransaction.create({
    data: {
      date: dateOnly,
      reference: data.reference || null,
      vendor: data.vendor || null,
      productName: data.productName || null,
      totalPrice: data.totalPrice,
      payment: data.payment || null,
      minorGroup: data.minorGroup || null,
      note: data.note || null,
      createdBy: userId,
    },
  });

  return result.id;
}

export async function updateManualTransaction(
  id: number,
  data: Partial<ManualTransactionInput>
): Promise<void> {
  const updateData: Record<string, unknown> = {};

  if (data.date !== undefined) {
    const dateOnly = new Date(data.date);
    dateOnly.setHours(0, 0, 0, 0);
    updateData.date = dateOnly;
  }
  if (data.reference !== undefined) updateData.reference = data.reference || null;
  if (data.vendor !== undefined) updateData.vendor = data.vendor || null;
  if (data.productName !== undefined) updateData.productName = data.productName || null;
  if (data.totalPrice !== undefined) updateData.totalPrice = data.totalPrice;
  if (data.payment !== undefined) updateData.payment = data.payment || null;
  if (data.minorGroup !== undefined) updateData.minorGroup = data.minorGroup || null;
  if (data.note !== undefined) updateData.note = data.note || null;

  await prisma.manualTransaction.update({
    where: { id },
    data: updateData,
  });
}

export async function deleteManualTransaction(id: number): Promise<void> {
  await prisma.manualTransaction.delete({
    where: { id },
  });
}

export async function getManualTransaction(id: number) {
  return prisma.manualTransaction.findUnique({
    where: { id },
  });
}
