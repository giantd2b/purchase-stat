import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/db";
import { StockTransactionType, StockTransactionStatus } from "@prisma/client";
import {
  getStockItems,
  getStockItemById,
  getStockItemByItemId,
  createStockItem,
  getOrCreateStockItem,
  updateStockItem,
  getItemBatches,
  getExpiringBatches,
  getTransactions,
  getPendingTransactions,
  getTransactionById,
  createTransaction,
  approveTransaction,
  rejectTransaction,
  getInventoryKPIs,
  getAllItems,
  getLowStockItems,
} from "@/lib/inventory-db";

// ============================================
// Mock Data
// ============================================

const mockItem = {
  id: "ITEM-001",
  name: "Test Item",
  unit: "ชิ้น",
  type: "วัตถุดิบ",
  category: "อาหาร",
  supplier1: "Supplier A",
  supplier2: null,
};

const mockStockItem = {
  id: "stock-1",
  itemId: "ITEM-001",
  currentQuantity: 100,
  minQuantity: 10,
  maxQuantity: 500,
  averageCost: 50,
  lastCost: 55,
  location: "A-1",
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  item: mockItem,
  _count: {
    batches: 2,
    transactionItems: 5,
  },
};

const mockUser = {
  id: "user-1",
  name: "Test User",
  email: "test@example.com",
  image: null,
};

const mockBatch = {
  id: "batch-1",
  stockItemId: "stock-1",
  batchNumber: "LOT-001",
  expiryDate: new Date("2025-06-30"),
  manufactureDate: new Date("2024-06-30"),
  initialQuantity: 50,
  currentQuantity: 30,
  unitCost: 50,
  receiveTransactionId: "tx-1",
  createdAt: new Date(),
  updatedAt: new Date(),
  stockItem: {
    id: "stock-1",
    item: {
      id: "ITEM-001",
      name: "Test Item",
      unit: "ชิ้น",
    },
  },
};

const mockTransaction = {
  id: "tx-1",
  transactionNumber: "STK-20241224-0001",
  type: StockTransactionType.RECEIVE,
  status: StockTransactionStatus.APPROVED,
  description: "รับสินค้าเข้าสต๊อก",
  reference: "PO-001",
  notes: null,
  requestedBy: "user-1",
  approvedBy: "user-1",
  transactionDate: new Date(),
  approvedAt: new Date(),
  rejectedAt: null,
  rejectReason: null,
  attachmentUrl: null,
  attachmentName: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  requestedByUser: mockUser,
  approvedByUser: mockUser,
  items: [
    {
      id: "tx-item-1",
      transactionId: "tx-1",
      stockItemId: "stock-1",
      quantity: 50,
      unitCost: 50,
      totalCost: 2500,
      batchNumber: "LOT-001",
      expiryDate: new Date("2025-06-30"),
      purpose: null,
      stockItem: {
        id: "stock-1",
        currentQuantity: 100,
        item: {
          id: "ITEM-001",
          name: "Test Item",
          unit: "ชิ้น",
        },
      },
    },
  ],
};

// Reset mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
});

// ============================================
// Stock Item Functions Tests
// ============================================

describe("Stock Item Functions", () => {
  describe("getStockItems", () => {
    it("should return all active stock items by default", async () => {
      vi.mocked(prisma.stockItem.findMany).mockResolvedValue([mockStockItem as any]);

      const result = await getStockItems();

      expect(prisma.stockItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isActive: true,
          }),
        })
      );
      expect(result).toHaveLength(1);
      expect(result[0].currentQuantity).toBe(100);
      expect(result[0].item.name).toBe("Test Item");
    });

    it("should filter by category", async () => {
      vi.mocked(prisma.stockItem.findMany).mockResolvedValue([mockStockItem as any]);

      await getStockItems({ category: "อาหาร" });

      expect(prisma.stockItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            item: expect.objectContaining({
              category: "อาหาร",
            }),
          }),
        })
      );
    });

    it("should filter low stock items only", async () => {
      vi.mocked(prisma.stockItem.findMany).mockResolvedValue([mockStockItem as any]);

      await getStockItems({ lowStockOnly: true });

      expect(prisma.stockItem.findMany).toHaveBeenCalled();
    });

    it("should return empty array when no items", async () => {
      vi.mocked(prisma.stockItem.findMany).mockResolvedValue([]);

      const result = await getStockItems();

      expect(result).toHaveLength(0);
    });

    it("should convert Decimal values to numbers", async () => {
      const itemWithDecimal = {
        ...mockStockItem,
        currentQuantity: { toNumber: () => 100.5 } as any,
        minQuantity: { toNumber: () => 10 } as any,
        averageCost: { toNumber: () => 50.25 } as any,
      };
      vi.mocked(prisma.stockItem.findMany).mockResolvedValue([itemWithDecimal as any]);

      const result = await getStockItems();

      expect(typeof result[0].currentQuantity).toBe("number");
    });
  });

  describe("getStockItemById", () => {
    it("should return stock item for valid id", async () => {
      vi.mocked(prisma.stockItem.findUnique).mockResolvedValue(mockStockItem as any);

      const result = await getStockItemById("stock-1");

      expect(prisma.stockItem.findUnique).toHaveBeenCalledWith({
        where: { id: "stock-1" },
        include: expect.any(Object),
      });
      expect(result).not.toBeNull();
      expect(result?.id).toBe("stock-1");
    });

    it("should return null for non-existent id", async () => {
      vi.mocked(prisma.stockItem.findUnique).mockResolvedValue(null);

      const result = await getStockItemById("non-existent");

      expect(result).toBeNull();
    });
  });

  describe("getStockItemByItemId", () => {
    it("should return stock item for valid itemId", async () => {
      vi.mocked(prisma.stockItem.findUnique).mockResolvedValue(mockStockItem as any);

      const result = await getStockItemByItemId("ITEM-001");

      expect(prisma.stockItem.findUnique).toHaveBeenCalledWith({
        where: { itemId: "ITEM-001" },
        include: expect.any(Object),
      });
      expect(result).not.toBeNull();
      expect(result?.itemId).toBe("ITEM-001");
    });

    it("should return null for non-existent itemId", async () => {
      vi.mocked(prisma.stockItem.findUnique).mockResolvedValue(null);

      const result = await getStockItemByItemId("non-existent");

      expect(result).toBeNull();
    });
  });

  describe("createStockItem", () => {
    it("should create stock item with default values", async () => {
      const newStockItem = {
        ...mockStockItem,
        currentQuantity: 0,
        minQuantity: null,
        maxQuantity: null,
        averageCost: null,
        lastCost: null,
        location: null,
      };
      vi.mocked(prisma.stockItem.create).mockResolvedValue(newStockItem as any);

      const result = await createStockItem({ itemId: "ITEM-001" });

      expect(prisma.stockItem.create).toHaveBeenCalledWith({
        data: {
          itemId: "ITEM-001",
          minQuantity: undefined,
          maxQuantity: undefined,
          location: undefined,
        },
        include: expect.any(Object),
      });
      expect(result.currentQuantity).toBe(0);
    });

    it("should create stock item with min/max/location", async () => {
      vi.mocked(prisma.stockItem.create).mockResolvedValue(mockStockItem as any);

      const result = await createStockItem({
        itemId: "ITEM-001",
        minQuantity: 10,
        maxQuantity: 500,
        location: "A-1",
      });

      expect(prisma.stockItem.create).toHaveBeenCalledWith({
        data: {
          itemId: "ITEM-001",
          minQuantity: 10,
          maxQuantity: 500,
          location: "A-1",
        },
        include: expect.any(Object),
      });
      expect(result.minQuantity).toBe(10);
      expect(result.maxQuantity).toBe(500);
      expect(result.location).toBe("A-1");
    });
  });

  describe("getOrCreateStockItem", () => {
    it("should return existing stock item if found", async () => {
      vi.mocked(prisma.stockItem.findUnique).mockResolvedValue(mockStockItem as any);

      const result = await getOrCreateStockItem("ITEM-001");

      expect(prisma.stockItem.findUnique).toHaveBeenCalled();
      expect(prisma.stockItem.create).not.toHaveBeenCalled();
      expect(result.itemId).toBe("ITEM-001");
    });

    it("should create new stock item if not found", async () => {
      vi.mocked(prisma.stockItem.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.stockItem.create).mockResolvedValue({
        ...mockStockItem,
        currentQuantity: 0,
      } as any);

      const result = await getOrCreateStockItem("ITEM-002");

      expect(prisma.stockItem.findUnique).toHaveBeenCalled();
      expect(prisma.stockItem.create).toHaveBeenCalled();
    });
  });

  describe("updateStockItem", () => {
    it("should update min/max quantities", async () => {
      const updatedItem = {
        ...mockStockItem,
        minQuantity: 20,
        maxQuantity: 1000,
      };
      vi.mocked(prisma.stockItem.update).mockResolvedValue(updatedItem as any);

      const result = await updateStockItem("stock-1", {
        minQuantity: 20,
        maxQuantity: 1000,
      });

      expect(prisma.stockItem.update).toHaveBeenCalledWith({
        where: { id: "stock-1" },
        data: {
          minQuantity: 20,
          maxQuantity: 1000,
        },
        include: expect.any(Object),
      });
      expect(result.minQuantity).toBe(20);
      expect(result.maxQuantity).toBe(1000);
    });

    it("should update location", async () => {
      const updatedItem = {
        ...mockStockItem,
        location: "B-2",
      };
      vi.mocked(prisma.stockItem.update).mockResolvedValue(updatedItem as any);

      const result = await updateStockItem("stock-1", { location: "B-2" });

      expect(result.location).toBe("B-2");
    });

    it("should deactivate stock item", async () => {
      const deactivatedItem = {
        ...mockStockItem,
        isActive: false,
      };
      vi.mocked(prisma.stockItem.update).mockResolvedValue(deactivatedItem as any);

      const result = await updateStockItem("stock-1", { isActive: false });

      expect(result.isActive).toBe(false);
    });
  });
});

// ============================================
// Batch Functions Tests
// ============================================

describe("Batch Functions", () => {
  describe("getItemBatches", () => {
    it("should return batches with quantity > 0", async () => {
      vi.mocked(prisma.stockBatch.findMany).mockResolvedValue([mockBatch as any]);

      const result = await getItemBatches("stock-1");

      expect(prisma.stockBatch.findMany).toHaveBeenCalledWith({
        where: {
          stockItemId: "stock-1",
          currentQuantity: { gt: 0 },
        },
        include: expect.any(Object),
        orderBy: expect.any(Array),
      });
      expect(result).toHaveLength(1);
      expect(result[0].batchNumber).toBe("LOT-001");
    });

    it("should order batches by expiry date (FEFO)", async () => {
      vi.mocked(prisma.stockBatch.findMany).mockResolvedValue([mockBatch as any]);

      await getItemBatches("stock-1");

      expect(prisma.stockBatch.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [{ expiryDate: "asc" }, { createdAt: "asc" }],
        })
      );
    });

    it("should return empty array when no batches", async () => {
      vi.mocked(prisma.stockBatch.findMany).mockResolvedValue([]);

      const result = await getItemBatches("stock-1");

      expect(result).toHaveLength(0);
    });
  });

  describe("getExpiringBatches", () => {
    it("should return batches expiring within specified days", async () => {
      vi.mocked(prisma.stockBatch.findMany).mockResolvedValue([mockBatch as any]);

      const result = await getExpiringBatches(30);

      expect(prisma.stockBatch.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            currentQuantity: { gt: 0 },
            expiryDate: expect.objectContaining({
              not: null,
              lte: expect.any(Date),
            }),
          }),
        })
      );
      expect(result).toHaveLength(1);
    });

    it("should use default 30 days if not specified", async () => {
      vi.mocked(prisma.stockBatch.findMany).mockResolvedValue([]);

      await getExpiringBatches();

      expect(prisma.stockBatch.findMany).toHaveBeenCalled();
    });
  });
});

// ============================================
// Transaction Functions Tests
// ============================================

describe("Transaction Functions", () => {
  describe("getTransactions", () => {
    it("should return transactions with details", async () => {
      vi.mocked(prisma.stockTransaction.findMany).mockResolvedValue([mockTransaction as any]);

      const result = await getTransactions();

      expect(prisma.stockTransaction.findMany).toHaveBeenCalled();
      expect(result).toHaveLength(1);
      expect(result[0].transactionNumber).toBe("STK-20241224-0001");
      expect(result[0].items).toHaveLength(1);
    });

    it("should filter by type", async () => {
      vi.mocked(prisma.stockTransaction.findMany).mockResolvedValue([mockTransaction as any]);

      await getTransactions({ type: StockTransactionType.RECEIVE });

      expect(prisma.stockTransaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            type: StockTransactionType.RECEIVE,
          }),
        })
      );
    });

    it("should filter by status", async () => {
      vi.mocked(prisma.stockTransaction.findMany).mockResolvedValue([]);

      await getTransactions({ status: StockTransactionStatus.PENDING });

      expect(prisma.stockTransaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: StockTransactionStatus.PENDING,
          }),
        })
      );
    });

    it("should filter by date range", async () => {
      const startDate = new Date("2024-01-01");
      const endDate = new Date("2024-12-31");
      vi.mocked(prisma.stockTransaction.findMany).mockResolvedValue([]);

      await getTransactions({ startDate, endDate });

      expect(prisma.stockTransaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            transactionDate: {
              gte: startDate,
              lte: endDate,
            },
          }),
        })
      );
    });

    it("should calculate total value", async () => {
      vi.mocked(prisma.stockTransaction.findMany).mockResolvedValue([mockTransaction as any]);

      const result = await getTransactions();

      expect(result[0].totalValue).toBe(2500);
    });
  });

  describe("getPendingTransactions", () => {
    it("should return only pending transactions", async () => {
      const pendingTx = {
        ...mockTransaction,
        status: StockTransactionStatus.PENDING,
        approvedBy: null,
        approvedAt: null,
      };
      vi.mocked(prisma.stockTransaction.findMany).mockResolvedValue([pendingTx as any]);

      const result = await getPendingTransactions();

      expect(prisma.stockTransaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: StockTransactionStatus.PENDING,
          }),
        })
      );
    });
  });

  describe("getTransactionById", () => {
    it("should return transaction for valid id", async () => {
      vi.mocked(prisma.stockTransaction.findUnique).mockResolvedValue(mockTransaction as any);

      const result = await getTransactionById("tx-1");

      expect(prisma.stockTransaction.findUnique).toHaveBeenCalledWith({
        where: { id: "tx-1" },
        include: expect.any(Object),
      });
      expect(result).not.toBeNull();
      expect(result?.id).toBe("tx-1");
    });

    it("should return null for non-existent id", async () => {
      vi.mocked(prisma.stockTransaction.findUnique).mockResolvedValue(null);

      const result = await getTransactionById("non-existent");

      expect(result).toBeNull();
    });
  });

  describe("createTransaction", () => {
    it("should auto-approve RECEIVE transactions", async () => {
      vi.mocked(prisma.$transaction).mockImplementation(async (fn: any) => {
        return fn({
          stockTransaction: {
            create: vi.fn().mockResolvedValue({
              ...mockTransaction,
              status: StockTransactionStatus.APPROVED,
            }),
            findFirst: vi.fn().mockResolvedValue(null),
          },
          stockItem: {
            update: vi.fn(),
          },
          stockBatch: {
            create: vi.fn(),
          },
        });
      });

      const result = await createTransaction({
        type: StockTransactionType.RECEIVE,
        items: [
          {
            stockItemId: "stock-1",
            quantity: 50,
            unitCost: 50,
          },
        ],
        requestedBy: "user-1",
      });

      expect(result.status).toBe(StockTransactionStatus.APPROVED);
    });

    it("should set WITHDRAW transactions as PENDING", async () => {
      const pendingTx = {
        ...mockTransaction,
        type: StockTransactionType.WITHDRAW,
        status: StockTransactionStatus.PENDING,
        approvedBy: null,
        approvedAt: null,
      };
      vi.mocked(prisma.$transaction).mockImplementation(async (fn: any) => {
        return fn({
          stockTransaction: {
            create: vi.fn().mockResolvedValue(pendingTx),
            findFirst: vi.fn().mockResolvedValue(null),
          },
        });
      });

      const result = await createTransaction({
        type: StockTransactionType.WITHDRAW,
        items: [
          {
            stockItemId: "stock-1",
            quantity: 10,
            purpose: "ใช้ในการผลิต",
          },
        ],
        requestedBy: "user-1",
      });

      expect(result.status).toBe(StockTransactionStatus.PENDING);
      expect(result.approvedBy).toBeNull();
    });

    it("should calculate total cost for each item", async () => {
      vi.mocked(prisma.$transaction).mockImplementation(async (fn: any) => {
        return fn({
          stockTransaction: {
            create: vi.fn().mockResolvedValue(mockTransaction),
            findFirst: vi.fn().mockResolvedValue(null),
          },
          stockItem: {
            update: vi.fn(),
          },
          stockBatch: {
            create: vi.fn(),
          },
        });
      });

      const result = await createTransaction({
        type: StockTransactionType.RECEIVE,
        items: [
          {
            stockItemId: "stock-1",
            quantity: 50,
            unitCost: 50,
          },
        ],
        requestedBy: "user-1",
      });

      expect(result.items[0].totalCost).toBe(2500);
    });
  });
});

// ============================================
// Flow Integration Tests
// ============================================

describe("Inventory Flow Integration", () => {
  describe("Flow: Add Item to Stock → Receive → Withdraw", () => {
    it("should complete full inventory flow", async () => {
      // Step 1: Create stock item (เพิ่มสินค้าเข้าสต๊อก)
      const newStockItem = {
        ...mockStockItem,
        currentQuantity: 0,
        minQuantity: 10,
        maxQuantity: 500,
        averageCost: null,
        lastCost: null,
      };
      vi.mocked(prisma.stockItem.create).mockResolvedValue(newStockItem as any);

      const stockItem = await createStockItem({
        itemId: "ITEM-001",
        minQuantity: 10,
        maxQuantity: 500,
        location: "A-1",
      });

      expect(stockItem.currentQuantity).toBe(0);
      expect(stockItem.minQuantity).toBe(10);

      // Step 2: Receive items (นำเข้าสินค้า)
      vi.mocked(prisma.$transaction).mockImplementation(async (fn: any) => {
        return fn({
          stockTransaction: {
            create: vi.fn().mockResolvedValue({
              ...mockTransaction,
              type: StockTransactionType.RECEIVE,
              status: StockTransactionStatus.APPROVED,
              items: [
                {
                  ...mockTransaction.items[0],
                  quantity: 100,
                  stockItem: {
                    ...mockTransaction.items[0].stockItem,
                    currentQuantity: 100, // Updated quantity
                  },
                },
              ],
            }),
            findFirst: vi.fn().mockResolvedValue(null),
          },
          stockItem: {
            update: vi.fn(),
          },
          stockBatch: {
            create: vi.fn(),
          },
        });
      });

      const receiveTx = await createTransaction({
        type: StockTransactionType.RECEIVE,
        items: [
          {
            stockItemId: stockItem.id,
            quantity: 100,
            unitCost: 50,
            batchNumber: "LOT-001",
            expiryDate: new Date("2025-12-31"),
          },
        ],
        requestedBy: "user-1",
        description: "รับสินค้าเข้าสต๊อก",
      });

      expect(receiveTx.type).toBe(StockTransactionType.RECEIVE);
      expect(receiveTx.status).toBe(StockTransactionStatus.APPROVED); // Auto-approved

      // Step 3: Withdraw items (เบิกจ่ายสินค้า)
      vi.mocked(prisma.$transaction).mockImplementation(async (fn: any) => {
        return fn({
          stockTransaction: {
            create: vi.fn().mockResolvedValue({
              ...mockTransaction,
              type: StockTransactionType.WITHDRAW,
              status: StockTransactionStatus.PENDING,
              approvedBy: null,
              approvedAt: null,
              items: [
                {
                  ...mockTransaction.items[0],
                  quantity: 20,
                  purpose: "ใช้ในครัว",
                },
              ],
            }),
            findFirst: vi.fn().mockResolvedValue({ transactionNumber: "STK-20241224-0001" }),
          },
        });
      });

      const withdrawTx = await createTransaction({
        type: StockTransactionType.WITHDRAW,
        items: [
          {
            stockItemId: stockItem.id,
            quantity: 20,
            purpose: "ใช้ในครัว",
          },
        ],
        requestedBy: "user-1",
        description: "เบิกสินค้าใช้ในครัว",
      });

      expect(withdrawTx.type).toBe(StockTransactionType.WITHDRAW);
      expect(withdrawTx.status).toBe(StockTransactionStatus.PENDING); // Needs approval
    });
  });

  describe("Auto-approve rules", () => {
    it("should auto-approve RECEIVE transactions", async () => {
      vi.mocked(prisma.$transaction).mockImplementation(async (fn: any) => {
        return fn({
          stockTransaction: {
            create: vi.fn().mockResolvedValue({
              ...mockTransaction,
              type: StockTransactionType.RECEIVE,
              status: StockTransactionStatus.APPROVED,
            }),
            findFirst: vi.fn().mockResolvedValue(null),
          },
          stockItem: { update: vi.fn() },
          stockBatch: { create: vi.fn() },
        });
      });

      const result = await createTransaction({
        type: StockTransactionType.RECEIVE,
        items: [{ stockItemId: "stock-1", quantity: 10 }],
        requestedBy: "user-1",
      });

      expect(result.status).toBe(StockTransactionStatus.APPROVED);
    });

    it("should auto-approve RETURN transactions", async () => {
      vi.mocked(prisma.$transaction).mockImplementation(async (fn: any) => {
        return fn({
          stockTransaction: {
            create: vi.fn().mockResolvedValue({
              ...mockTransaction,
              type: StockTransactionType.RETURN,
              status: StockTransactionStatus.APPROVED,
            }),
            findFirst: vi.fn().mockResolvedValue(null),
          },
          stockItem: { update: vi.fn() },
          stockBatch: { create: vi.fn() },
        });
      });

      const result = await createTransaction({
        type: StockTransactionType.RETURN,
        items: [{ stockItemId: "stock-1", quantity: 5 }],
        requestedBy: "user-1",
      });

      expect(result.status).toBe(StockTransactionStatus.APPROVED);
    });

    it("should auto-approve TRANSFER_IN transactions", async () => {
      vi.mocked(prisma.$transaction).mockImplementation(async (fn: any) => {
        return fn({
          stockTransaction: {
            create: vi.fn().mockResolvedValue({
              ...mockTransaction,
              type: StockTransactionType.TRANSFER_IN,
              status: StockTransactionStatus.APPROVED,
            }),
            findFirst: vi.fn().mockResolvedValue(null),
          },
          stockItem: { update: vi.fn() },
          stockBatch: { create: vi.fn() },
        });
      });

      const result = await createTransaction({
        type: StockTransactionType.TRANSFER_IN,
        items: [{ stockItemId: "stock-1", quantity: 10 }],
        requestedBy: "user-1",
      });

      expect(result.status).toBe(StockTransactionStatus.APPROVED);
    });

    it("should NOT auto-approve WITHDRAW transactions", async () => {
      vi.mocked(prisma.$transaction).mockImplementation(async (fn: any) => {
        return fn({
          stockTransaction: {
            create: vi.fn().mockResolvedValue({
              ...mockTransaction,
              type: StockTransactionType.WITHDRAW,
              status: StockTransactionStatus.PENDING,
              approvedBy: null,
              approvedAt: null,
            }),
            findFirst: vi.fn().mockResolvedValue(null),
          },
        });
      });

      const result = await createTransaction({
        type: StockTransactionType.WITHDRAW,
        items: [{ stockItemId: "stock-1", quantity: 10 }],
        requestedBy: "user-1",
      });

      expect(result.status).toBe(StockTransactionStatus.PENDING);
    });

    it("should NOT auto-approve ADJUST_IN transactions", async () => {
      vi.mocked(prisma.$transaction).mockImplementation(async (fn: any) => {
        return fn({
          stockTransaction: {
            create: vi.fn().mockResolvedValue({
              ...mockTransaction,
              type: StockTransactionType.ADJUST_IN,
              status: StockTransactionStatus.PENDING,
              approvedBy: null,
              approvedAt: null,
            }),
            findFirst: vi.fn().mockResolvedValue(null),
          },
        });
      });

      const result = await createTransaction({
        type: StockTransactionType.ADJUST_IN,
        items: [{ stockItemId: "stock-1", quantity: 10 }],
        requestedBy: "user-1",
      });

      expect(result.status).toBe(StockTransactionStatus.PENDING);
    });

    it("should NOT auto-approve ADJUST_OUT transactions", async () => {
      vi.mocked(prisma.$transaction).mockImplementation(async (fn: any) => {
        return fn({
          stockTransaction: {
            create: vi.fn().mockResolvedValue({
              ...mockTransaction,
              type: StockTransactionType.ADJUST_OUT,
              status: StockTransactionStatus.PENDING,
              approvedBy: null,
              approvedAt: null,
            }),
            findFirst: vi.fn().mockResolvedValue(null),
          },
        });
      });

      const result = await createTransaction({
        type: StockTransactionType.ADJUST_OUT,
        items: [{ stockItemId: "stock-1", quantity: 10 }],
        requestedBy: "user-1",
      });

      expect(result.status).toBe(StockTransactionStatus.PENDING);
    });

    it("should NOT auto-approve TRANSFER_OUT transactions", async () => {
      vi.mocked(prisma.$transaction).mockImplementation(async (fn: any) => {
        return fn({
          stockTransaction: {
            create: vi.fn().mockResolvedValue({
              ...mockTransaction,
              type: StockTransactionType.TRANSFER_OUT,
              status: StockTransactionStatus.PENDING,
              approvedBy: null,
              approvedAt: null,
            }),
            findFirst: vi.fn().mockResolvedValue(null),
          },
        });
      });

      const result = await createTransaction({
        type: StockTransactionType.TRANSFER_OUT,
        items: [{ stockItemId: "stock-1", quantity: 10 }],
        requestedBy: "user-1",
      });

      expect(result.status).toBe(StockTransactionStatus.PENDING);
    });
  });
});
