import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/db";
import {
  getTransactions,
  getFilterOptions,
  upsertTransactionOverride,
  deleteTransactionOverride,
  createManualTransaction,
  updateManualTransaction,
  deleteManualTransaction,
  getManualTransaction,
  type TransactionFilters,
} from "@/lib/transactions-db";

// ============================================
// Mock Data
// ============================================

// Mock Decimal-like object for Prisma
const mockDecimal = (value: number) => ({
  toNumber: () => value,
  toString: () => value.toString(),
});

const mockProcurementTransaction = {
  id: 1,
  date: new Date("2025-12-26"),
  reference: "REF-001",
  vendor: "Test Vendor",
  productName: "Test Product",
  totalWithVat: mockDecimal(1000),
  payment: "เงินสด",
  minorGroup: "Kitchen",
};

const mockManualTransaction = {
  id: 1,
  date: new Date("2025-12-26"),
  reference: "MANUAL-001",
  vendor: "Manual Vendor",
  productName: "Manual Product",
  totalPrice: mockDecimal(500),
  payment: "โอน",
  minorGroup: "HR",
  note: "Test note",
  createdBy: "user-1",
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockOverride = {
  id: 1,
  transactionId: 1,
  actualPrice: mockDecimal(950),
  reason: "Price correction",
  createdBy: "user-1",
  createdAt: new Date(),
  updatedAt: new Date(),
};

// Reset mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
});

// ============================================
// getTransactions Tests
// ============================================

describe("getTransactions", () => {
  it("should return paginated transactions with filters", async () => {
    vi.mocked(prisma.procurementTransaction.findMany).mockResolvedValue([
      mockProcurementTransaction,
    ]);
    vi.mocked(prisma.procurementTransaction.count).mockResolvedValue(1);
    vi.mocked(prisma.transactionOverride.findMany).mockResolvedValue([]);
    vi.mocked(prisma.manualTransaction.findMany).mockResolvedValue([]);

    const filters: TransactionFilters = {
      startDate: new Date("2025-12-01"),
      endDate: new Date("2025-12-31"),
    };

    const result = await getTransactions(filters, 1, 50);

    expect(prisma.procurementTransaction.findMany).toHaveBeenCalled();
    expect(result.transactions).toHaveLength(1);
    expect(result.pagination.page).toBe(1);
    expect(result.pagination.limit).toBe(50);
    expect(result.pagination.total).toBe(1);
  });

  it("should filter by vendor", async () => {
    vi.mocked(prisma.procurementTransaction.findMany).mockResolvedValue([
      mockProcurementTransaction,
    ]);
    vi.mocked(prisma.procurementTransaction.count).mockResolvedValue(1);
    vi.mocked(prisma.transactionOverride.findMany).mockResolvedValue([]);
    vi.mocked(prisma.manualTransaction.findMany).mockResolvedValue([]);

    const filters: TransactionFilters = {
      vendor: "Test Vendor",
    };

    await getTransactions(filters, 1, 50);

    expect(prisma.procurementTransaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          vendor: { contains: "Test Vendor", mode: "insensitive" },
        }),
      })
    );
  });

  it("should filter by payment type", async () => {
    vi.mocked(prisma.procurementTransaction.findMany).mockResolvedValue([]);
    vi.mocked(prisma.procurementTransaction.count).mockResolvedValue(0);
    vi.mocked(prisma.transactionOverride.findMany).mockResolvedValue([]);
    vi.mocked(prisma.manualTransaction.findMany).mockResolvedValue([]);

    const filters: TransactionFilters = {
      payment: "เงินสด",
    };

    await getTransactions(filters, 1, 50);

    expect(prisma.procurementTransaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          payment: "เงินสด",
        }),
      })
    );
  });

  it("should filter by department (minorGroup)", async () => {
    vi.mocked(prisma.procurementTransaction.findMany).mockResolvedValue([]);
    vi.mocked(prisma.procurementTransaction.count).mockResolvedValue(0);
    vi.mocked(prisma.transactionOverride.findMany).mockResolvedValue([]);
    vi.mocked(prisma.manualTransaction.findMany).mockResolvedValue([]);

    const filters: TransactionFilters = {
      minorGroup: "Kitchen",
    };

    await getTransactions(filters, 1, 50);

    expect(prisma.procurementTransaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          minorGroup: "Kitchen",
        }),
      })
    );
  });

  it("should search in reference, productName, and vendor", async () => {
    vi.mocked(prisma.procurementTransaction.findMany).mockResolvedValue([]);
    vi.mocked(prisma.procurementTransaction.count).mockResolvedValue(0);
    vi.mocked(prisma.transactionOverride.findMany).mockResolvedValue([]);
    vi.mocked(prisma.manualTransaction.findMany).mockResolvedValue([]);

    const filters: TransactionFilters = {
      search: "test",
    };

    await getTransactions(filters, 1, 50);

    expect(prisma.procurementTransaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [
            { reference: { contains: "test", mode: "insensitive" } },
            { productName: { contains: "test", mode: "insensitive" } },
            { vendor: { contains: "test", mode: "insensitive" } },
          ],
        }),
      })
    );
  });

  it("should include overrides for transactions", async () => {
    vi.mocked(prisma.procurementTransaction.findMany).mockResolvedValue([
      mockProcurementTransaction,
    ]);
    vi.mocked(prisma.procurementTransaction.count).mockResolvedValue(1);
    vi.mocked(prisma.transactionOverride.findMany).mockResolvedValue([
      mockOverride,
    ]);
    vi.mocked(prisma.manualTransaction.findMany).mockResolvedValue([]);

    const result = await getTransactions({}, 1, 50);

    expect(result.transactions[0].actualPrice).toBe(950);
    expect(result.transactions[0].overrideReason).toBe("Price correction");
  });

  it("should combine synced and manual transactions", async () => {
    vi.mocked(prisma.procurementTransaction.findMany).mockResolvedValue([
      mockProcurementTransaction,
    ]);
    vi.mocked(prisma.procurementTransaction.count).mockResolvedValue(1);
    vi.mocked(prisma.transactionOverride.findMany).mockResolvedValue([]);
    vi.mocked(prisma.manualTransaction.findMany).mockResolvedValue([
      mockManualTransaction,
    ]);

    const result = await getTransactions({}, 1, 50);

    // Should have 2 transactions (1 synced + 1 manual)
    expect(result.transactions).toHaveLength(2);

    // Manual transaction should have negative ID
    const manualTx = result.transactions.find((t) => t.isManual);
    expect(manualTx).toBeDefined();
    expect(manualTx!.id).toBeLessThan(0);
  });

  it("should sort by vendor name ascending, then date descending", async () => {
    vi.mocked(prisma.procurementTransaction.findMany).mockResolvedValue([]);
    vi.mocked(prisma.procurementTransaction.count).mockResolvedValue(0);
    vi.mocked(prisma.transactionOverride.findMany).mockResolvedValue([]);
    vi.mocked(prisma.manualTransaction.findMany).mockResolvedValue([]);

    await getTransactions({}, 1, 50);

    expect(prisma.procurementTransaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ vendor: "asc" }, { date: "desc" }],
      })
    );
  });

  it("should calculate page amount correctly", async () => {
    vi.mocked(prisma.procurementTransaction.findMany).mockResolvedValue([
      mockProcurementTransaction,
    ]);
    vi.mocked(prisma.procurementTransaction.count).mockResolvedValue(1);
    vi.mocked(prisma.transactionOverride.findMany).mockResolvedValue([]);
    vi.mocked(prisma.manualTransaction.findMany).mockResolvedValue([
      mockManualTransaction,
    ]);

    const result = await getTransactions({}, 1, 50);

    // 1000 + 500 = 1500
    expect(result.stats.pageAmount).toBe(1500);
  });

  it("should use actualPrice for page amount when override exists", async () => {
    vi.mocked(prisma.procurementTransaction.findMany).mockResolvedValue([
      mockProcurementTransaction,
    ]);
    vi.mocked(prisma.procurementTransaction.count).mockResolvedValue(1);
    vi.mocked(prisma.transactionOverride.findMany).mockResolvedValue([
      mockOverride,
    ]);
    vi.mocked(prisma.manualTransaction.findMany).mockResolvedValue([]);

    const result = await getTransactions({}, 1, 50);

    // Should use actualPrice (950) instead of totalWithVat (1000)
    expect(result.stats.pageAmount).toBe(950);
  });
});

// ============================================
// getFilterOptions Tests
// ============================================

describe("getFilterOptions", () => {
  it("should return distinct vendors, payments, and departments", async () => {
    vi.mocked(prisma.procurementTransaction.findMany)
      .mockResolvedValueOnce([{ vendor: "Vendor A" }, { vendor: "Vendor B" }] as never[])
      .mockResolvedValueOnce([{ payment: "เงินสด" }, { payment: "โอน" }] as never[])
      .mockResolvedValueOnce([{ minorGroup: "Kitchen" }, { minorGroup: "HR" }] as never[]);

    const result = await getFilterOptions();

    expect(result.vendors).toEqual(["Vendor A", "Vendor B"]);
    expect(result.payments).toEqual(["เงินสด", "โอน"]);
    expect(result.departments).toEqual(["Kitchen", "HR"]);
  });

  it("should filter out null values", async () => {
    vi.mocked(prisma.procurementTransaction.findMany)
      .mockResolvedValueOnce([{ vendor: "Vendor A" }, { vendor: null }] as never[])
      .mockResolvedValueOnce([{ payment: null }] as never[])
      .mockResolvedValueOnce([{ minorGroup: "Kitchen" }] as never[]);

    const result = await getFilterOptions();

    expect(result.vendors).toEqual(["Vendor A"]);
    expect(result.payments).toEqual([]);
    expect(result.departments).toEqual(["Kitchen"]);
  });
});

// ============================================
// Transaction Override Tests
// ============================================

describe("upsertTransactionOverride", () => {
  it("should create or update transaction override", async () => {
    vi.mocked(prisma.transactionOverride.upsert).mockResolvedValue(mockOverride);

    await upsertTransactionOverride(1, 950, "user-1", "Price correction");

    expect(prisma.transactionOverride.upsert).toHaveBeenCalledWith({
      where: { transactionId: 1 },
      update: {
        actualPrice: 950,
        reason: "Price correction",
      },
      create: {
        transactionId: 1,
        actualPrice: 950,
        reason: "Price correction",
        createdBy: "user-1",
      },
    });
  });

  it("should handle null reason", async () => {
    vi.mocked(prisma.transactionOverride.upsert).mockResolvedValue(mockOverride);

    await upsertTransactionOverride(1, 950, "user-1");

    expect(prisma.transactionOverride.upsert).toHaveBeenCalledWith({
      where: { transactionId: 1 },
      update: {
        actualPrice: 950,
        reason: null,
      },
      create: {
        transactionId: 1,
        actualPrice: 950,
        reason: null,
        createdBy: "user-1",
      },
    });
  });
});

describe("deleteTransactionOverride", () => {
  it("should delete transaction override", async () => {
    vi.mocked(prisma.transactionOverride.deleteMany).mockResolvedValue({ count: 1 });

    await deleteTransactionOverride(1);

    expect(prisma.transactionOverride.deleteMany).toHaveBeenCalledWith({
      where: { transactionId: 1 },
    });
  });
});

// ============================================
// Manual Transaction CRUD Tests
// ============================================

describe("createManualTransaction", () => {
  it("should create a new manual transaction", async () => {
    vi.mocked(prisma.manualTransaction.create).mockResolvedValue(mockManualTransaction);

    const input = {
      date: new Date("2025-12-26"),
      reference: "MANUAL-001",
      vendor: "Manual Vendor",
      productName: "Manual Product",
      totalPrice: 500,
      payment: "โอน",
      minorGroup: "HR",
      note: "Test note",
    };

    const result = await createManualTransaction(input, "user-1");

    expect(prisma.manualTransaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        reference: "MANUAL-001",
        vendor: "Manual Vendor",
        productName: "Manual Product",
        totalPrice: 500,
        payment: "โอน",
        minorGroup: "HR",
        note: "Test note",
        createdBy: "user-1",
      }),
    });
    expect(result).toBe(1);
  });

  it("should handle optional fields as null", async () => {
    vi.mocked(prisma.manualTransaction.create).mockResolvedValue({
      ...mockManualTransaction,
      reference: null,
      note: null,
    });

    const input = {
      date: new Date("2025-12-26"),
      totalPrice: 500,
    };

    await createManualTransaction(input, "user-1");

    expect(prisma.manualTransaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        reference: null,
        vendor: null,
        productName: null,
        payment: null,
        minorGroup: null,
        note: null,
      }),
    });
  });
});

describe("updateManualTransaction", () => {
  it("should update manual transaction with provided fields", async () => {
    vi.mocked(prisma.manualTransaction.update).mockResolvedValue(mockManualTransaction);

    await updateManualTransaction(1, {
      vendor: "Updated Vendor",
      totalPrice: 600,
    });

    expect(prisma.manualTransaction.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: expect.objectContaining({
        vendor: "Updated Vendor",
        totalPrice: 600,
      }),
    });
  });

  it("should update date with normalized time", async () => {
    vi.mocked(prisma.manualTransaction.update).mockResolvedValue(mockManualTransaction);

    await updateManualTransaction(1, {
      date: new Date("2025-12-27T15:30:00"),
    });

    // Should normalize time to 00:00:00
    expect(prisma.manualTransaction.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: expect.objectContaining({
        date: expect.any(Date),
      }),
    });
  });
});

describe("deleteManualTransaction", () => {
  it("should delete manual transaction by id", async () => {
    vi.mocked(prisma.manualTransaction.delete).mockResolvedValue(mockManualTransaction);

    await deleteManualTransaction(1);

    expect(prisma.manualTransaction.delete).toHaveBeenCalledWith({
      where: { id: 1 },
    });
  });
});

describe("getManualTransaction", () => {
  it("should return manual transaction by id", async () => {
    vi.mocked(prisma.manualTransaction.findUnique).mockResolvedValue(mockManualTransaction);

    const result = await getManualTransaction(1);

    expect(prisma.manualTransaction.findUnique).toHaveBeenCalledWith({
      where: { id: 1 },
    });
    expect(result).toEqual(mockManualTransaction);
  });

  it("should return null for non-existent transaction", async () => {
    vi.mocked(prisma.manualTransaction.findUnique).mockResolvedValue(null);

    const result = await getManualTransaction(999);

    expect(result).toBeNull();
  });
});
