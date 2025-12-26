import { prisma } from "./db";

// Types
export interface TransactionOverride {
  id: string;
  transactionId: number;
  actualPrice: number;
  reason: string | null;
  createdBy: string;
  updatedAt: Date;
}

export interface PettyCashReportTransaction {
  id: number;
  date: Date | null;
  reference: string | null;
  vendor: string | null;
  productName: string | null;
  totalPrice: number;        // Original price from Google Sheet (estimate)
  actualPrice: number | null; // Override price (actual)
  overrideReason: string | null;
  note: string | null;
  minorGroup: string | null;
  isManual: boolean;         // true = เพิ่มด้วยมือ, false = จาก Google Sheet
}

export interface DepartmentExpense {
  department: string;
  total: number;
  count: number;
}

export interface DailyBalance {
  id: string;
  date: Date;
  openingBalance: number;
  notes: string | null;
  createdBy: string;
}

export interface DailyPettyCashSummary {
  openingBalance: number;
  todayExpenses: number;
  closingBalance: number;
  transactions: PettyCashReportTransaction[];
  departmentExpenses: DepartmentExpense[];
}

// Helper to get start and end of day
function getDayRange(date: Date): { start: Date; end: Date } {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

// Get petty cash purchases for a specific date (includes both synced and manual)
export async function getPettyCashPurchases(
  date: Date
): Promise<PettyCashReportTransaction[]> {
  const { start, end } = getDayRange(date);
  const dateOnly = new Date(date);
  dateOnly.setHours(0, 0, 0, 0);

  // Fetch synced transactions from Google Sheet
  const syncedTransactions = await prisma.procurementTransaction.findMany({
    where: {
      date: {
        gte: start,
        lte: end,
      },
      payment: "เงินสด-pettycash",
    },
    orderBy: { date: "asc" },
    select: {
      id: true,
      date: true,
      reference: true,
      vendor: true,
      productName: true,
      totalWithVat: true,
      minorGroup: true,
    },
  });

  // Fetch manual transactions
  const manualTransactions = await prisma.manualPettyCashTransaction.findMany({
    where: { date: dateOnly },
    orderBy: { createdAt: "asc" },
  });

  // Get notes and overrides for synced transactions
  const transactionIds = syncedTransactions.map((t) => t.id);
  const [notes, overrides] = await Promise.all([
    prisma.pettyCashTransactionNote.findMany({
      where: { transactionId: { in: transactionIds } },
    }),
    prisma.transactionOverride.findMany({
      where: { transactionId: { in: transactionIds } },
    }),
  ]);

  const notesMap = new Map(notes.map((n) => [n.transactionId, n.note]));
  const overridesMap = new Map(
    overrides.map((o) => [o.transactionId, { actualPrice: o.actualPrice.toNumber(), reason: o.reason }])
  );

  // Map synced transactions
  const syncedMapped: PettyCashReportTransaction[] = syncedTransactions.map((t) => {
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
      note: notesMap.get(t.id) || null,
      minorGroup: t.minorGroup,
      isManual: false,
    };
  });

  // Map manual transactions (use negative IDs to distinguish)
  const manualMapped: PettyCashReportTransaction[] = manualTransactions.map((t) => ({
    id: -t.id,  // Negative ID to distinguish from synced
    date: t.date,
    reference: t.reference,
    vendor: t.vendor,
    productName: t.productName,
    totalPrice: t.totalPrice.toNumber(),
    actualPrice: null,  // Manual transactions don't have overrides
    overrideReason: null,
    note: t.note,
    minorGroup: t.minorGroup,
    isManual: true,
  }));

  // Combine and sort by date
  return [...syncedMapped, ...manualMapped].sort((a, b) => {
    if (!a.date || !b.date) return 0;
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });
}

// Get daily opening balance
export async function getDailyBalance(date: Date): Promise<DailyBalance | null> {
  const dateOnly = new Date(date);
  dateOnly.setHours(0, 0, 0, 0);

  const balance = await prisma.dailyPettyCashBalance.findUnique({
    where: { date: dateOnly },
  });

  if (!balance) return null;

  return {
    id: balance.id,
    date: balance.date,
    openingBalance: balance.openingBalance.toNumber(),
    notes: balance.notes,
    createdBy: balance.createdBy,
  };
}

// Create or update daily opening balance
export async function upsertDailyBalance(
  date: Date,
  openingBalance: number,
  userId: string,
  notes?: string
): Promise<DailyBalance> {
  const dateOnly = new Date(date);
  dateOnly.setHours(0, 0, 0, 0);

  const balance = await prisma.dailyPettyCashBalance.upsert({
    where: { date: dateOnly },
    update: {
      openingBalance,
      notes,
    },
    create: {
      date: dateOnly,
      openingBalance,
      notes,
      createdBy: userId,
    },
  });

  return {
    id: balance.id,
    date: balance.date,
    openingBalance: balance.openingBalance.toNumber(),
    notes: balance.notes,
    createdBy: balance.createdBy,
  };
}

// Get or update transaction note
export async function getTransactionNote(
  transactionId: number
): Promise<string | null> {
  const note = await prisma.pettyCashTransactionNote.findUnique({
    where: { transactionId },
  });
  return note?.note || null;
}

// Create or update transaction note
export async function upsertTransactionNote(
  transactionId: number,
  note: string,
  userId: string
): Promise<void> {
  await prisma.pettyCashTransactionNote.upsert({
    where: { transactionId },
    update: { note },
    create: {
      transactionId,
      note,
      createdBy: userId,
    },
  });
}

// Delete transaction note
export async function deleteTransactionNote(
  transactionId: number
): Promise<void> {
  await prisma.pettyCashTransactionNote.deleteMany({
    where: { transactionId },
  });
}

// Helper to get effective price (actualPrice if overridden, otherwise totalPrice)
function getEffectivePrice(t: PettyCashReportTransaction): number {
  return t.actualPrice !== null ? t.actualPrice : t.totalPrice;
}

// Get complete daily summary
export async function getDailySummary(date: Date): Promise<DailyPettyCashSummary> {
  const [transactions, dailyBalance] = await Promise.all([
    getPettyCashPurchases(date),
    getDailyBalance(date),
  ]);

  const openingBalance = dailyBalance?.openingBalance || 0;
  // Use actualPrice if available, otherwise use totalPrice
  const todayExpenses = transactions.reduce((sum, t) => sum + getEffectivePrice(t), 0);
  const closingBalance = openingBalance - todayExpenses;

  // Calculate department expenses (using effective prices)
  const deptMap = new Map<string, { total: number; count: number }>();
  for (const t of transactions) {
    const dept = t.minorGroup || "ไม่ระบุแผนก";
    const current = deptMap.get(dept) || { total: 0, count: 0 };
    deptMap.set(dept, {
      total: current.total + getEffectivePrice(t),
      count: current.count + 1,
    });
  }

  const departmentExpenses: DepartmentExpense[] = Array.from(deptMap.entries())
    .map(([department, data]) => ({
      department,
      total: data.total,
      count: data.count,
    }))
    .sort((a, b) => b.total - a.total); // Sort by total descending

  return {
    openingBalance,
    todayExpenses,
    closingBalance,
    transactions,
    departmentExpenses,
  };
}

// Get list of dates that have petty cash transactions (for date navigation)
export async function getDatesWithTransactions(): Promise<Date[]> {
  const results = await prisma.procurementTransaction.findMany({
    where: {
      payment: "เงินสด-pettycash",
      date: { not: null },
    },
    select: { date: true },
    distinct: ["date"],
    orderBy: { date: "desc" },
    take: 30, // Last 30 days with transactions
  });

  return results
    .filter((r) => r.date !== null)
    .map((r) => r.date as Date);
}

// ============================================
// Transaction Override Functions
// ============================================

// Get transaction override
export async function getTransactionOverride(
  transactionId: number
): Promise<TransactionOverride | null> {
  const override = await prisma.transactionOverride.findUnique({
    where: { transactionId },
  });

  if (!override) return null;

  return {
    id: override.id,
    transactionId: override.transactionId,
    actualPrice: override.actualPrice.toNumber(),
    reason: override.reason,
    createdBy: override.createdBy,
    updatedAt: override.updatedAt,
  };
}

// Create or update transaction override
export async function upsertTransactionOverride(
  transactionId: number,
  actualPrice: number,
  userId: string,
  reason?: string
): Promise<TransactionOverride> {
  const override = await prisma.transactionOverride.upsert({
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

  return {
    id: override.id,
    transactionId: override.transactionId,
    actualPrice: override.actualPrice.toNumber(),
    reason: override.reason,
    createdBy: override.createdBy,
    updatedAt: override.updatedAt,
  };
}

// Delete transaction override (revert to original price)
export async function deleteTransactionOverride(
  transactionId: number
): Promise<void> {
  await prisma.transactionOverride.deleteMany({
    where: { transactionId },
  });
}

// ============================================
// Manual Transaction Functions
// ============================================

export interface ManualTransactionInput {
  date: Date;
  reference?: string;
  vendor?: string;
  productName?: string;
  totalPrice: number;
  minorGroup?: string;
  note?: string;
}

// Create manual transaction
export async function createManualTransaction(
  data: ManualTransactionInput,
  userId: string
): Promise<number> {
  const dateOnly = new Date(data.date);
  dateOnly.setHours(0, 0, 0, 0);

  const result = await prisma.manualPettyCashTransaction.create({
    data: {
      date: dateOnly,
      reference: data.reference || null,
      vendor: data.vendor || null,
      productName: data.productName || null,
      totalPrice: data.totalPrice,
      minorGroup: data.minorGroup || null,
      note: data.note || null,
      createdBy: userId,
    },
  });

  return result.id;
}

// Update manual transaction
export async function updateManualTransaction(
  id: number,
  data: Partial<ManualTransactionInput>,
  userId: string
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
  if (data.minorGroup !== undefined) updateData.minorGroup = data.minorGroup || null;
  if (data.note !== undefined) updateData.note = data.note || null;

  await prisma.manualPettyCashTransaction.update({
    where: { id },
    data: updateData,
  });
}

// Delete manual transaction
export async function deleteManualTransaction(id: number): Promise<void> {
  await prisma.manualPettyCashTransaction.delete({
    where: { id },
  });
}

// Get departments list for dropdown
export async function getDepartments(): Promise<string[]> {
  const results = await prisma.procurementTransaction.findMany({
    where: { minorGroup: { not: null } },
    distinct: ["minorGroup"],
    select: { minorGroup: true },
    orderBy: { minorGroup: "asc" },
  });

  return results
    .map((r) => r.minorGroup)
    .filter((d): d is string => d !== null);
}
