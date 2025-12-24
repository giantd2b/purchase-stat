import { prisma } from "./db";
import { StockTransactionType, StockTransactionStatus, Prisma } from "@prisma/client";

// ============================================
// Types
// ============================================

export interface StockItemWithDetails {
  id: string;
  itemId: string;
  item: {
    id: string;
    name: string;
    unit: string | null;
    type: string | null;
    category: string | null;
    supplier1: string | null;
    supplier2: string | null;
  };
  currentQuantity: number;
  minQuantity: number | null;
  maxQuantity: number | null;
  averageCost: number | null;
  lastCost: number | null;
  location: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  _count: {
    batches: number;
    transactionItems: number;
  };
}

export interface StockBatchWithItem {
  id: string;
  stockItemId: string;
  batchNumber: string | null;
  expiryDate: Date | null;
  manufactureDate: Date | null;
  initialQuantity: number;
  currentQuantity: number;
  unitCost: number;
  receiveTransactionId: string | null;
  createdAt: Date;
  updatedAt: Date;
  stockItem: {
    id: string;
    item: {
      id: string;
      name: string;
      unit: string | null;
    };
  };
}

export interface StockTransactionWithDetails {
  id: string;
  transactionNumber: string;
  type: StockTransactionType;
  status: StockTransactionStatus;
  description: string | null;
  reference: string | null;
  notes: string | null;
  requestedBy: string;
  requestedByUser: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
  approvedBy: string | null;
  approvedByUser: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  transactionDate: Date;
  approvedAt: Date | null;
  rejectedAt: Date | null;
  rejectReason: string | null;
  attachmentUrl: string | null;
  attachmentName: string | null;
  createdAt: Date;
  updatedAt: Date;
  items: StockTransactionItemWithDetails[];
  totalValue: number;
}

export interface StockTransactionItemWithDetails {
  id: string;
  transactionId: string;
  stockItemId: string;
  stockItem: {
    id: string;
    item: {
      id: string;
      name: string;
      unit: string | null;
    };
    currentQuantity: number;
  };
  quantity: number;
  unitCost: number | null;
  totalCost: number | null;
  batchNumber: string | null;
  expiryDate: Date | null;
  purpose: string | null;
}

export interface InventoryKPIs {
  totalItems: number;
  totalValue: number;
  lowStockCount: number;
  expiringSoonCount: number;
  pendingTransactionCount: number;
  todayReceived: number;
  todayWithdrawn: number;
}

export interface StockItemFilters {
  category?: string;
  type?: string;
  lowStockOnly?: boolean;
  expiringSoon?: boolean;
  isActive?: boolean;
  search?: string;
}

export interface TransactionFilters {
  type?: StockTransactionType;
  status?: StockTransactionStatus;
  startDate?: Date;
  endDate?: Date;
  stockItemId?: string;
  requestedBy?: string;
}

// ============================================
// Helper Functions
// ============================================

async function generateTransactionNumber(): Promise<string> {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");
  const prefix = `STK-${dateStr}-`;

  // Find the latest transaction number for today
  const latest = await prisma.stockTransaction.findFirst({
    where: {
      transactionNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      transactionNumber: "desc",
    },
  });

  let sequence = 1;
  if (latest) {
    const lastSequence = parseInt(latest.transactionNumber.split("-")[2], 10);
    sequence = lastSequence + 1;
  }

  return `${prefix}${sequence.toString().padStart(4, "0")}`;
}

function shouldAutoApprove(type: StockTransactionType): boolean {
  const autoApproveTypes: StockTransactionType[] = [
    StockTransactionType.RECEIVE,
    StockTransactionType.TRANSFER_IN,
    StockTransactionType.RETURN,
  ];
  return autoApproveTypes.includes(type);
}

// ============================================
// Stock Item Functions
// ============================================

export async function getStockItems(
  filters?: StockItemFilters
): Promise<StockItemWithDetails[]> {
  const where: Prisma.StockItemWhereInput = {};

  if (filters?.isActive !== undefined) {
    where.isActive = filters.isActive;
  } else {
    where.isActive = true; // Default to active only
  }

  if (filters?.category) {
    where.item = { category: filters.category };
  }

  if (filters?.type) {
    where.item = { ...where.item, type: filters.type };
  }

  if (filters?.search) {
    where.item = {
      ...where.item,
      OR: [
        { name: { contains: filters.search, mode: "insensitive" } },
        { id: { contains: filters.search, mode: "insensitive" } },
      ],
    };
  }

  if (filters?.lowStockOnly) {
    where.AND = [
      { minQuantity: { not: null } },
      {
        currentQuantity: {
          lte: prisma.stockItem.fields.minQuantity,
        },
      },
    ];
  }

  const items = await prisma.stockItem.findMany({
    where,
    include: {
      item: {
        select: {
          id: true,
          name: true,
          unit: true,
          type: true,
          category: true,
          supplier1: true,
          supplier2: true,
        },
      },
      _count: {
        select: {
          batches: true,
          transactionItems: true,
        },
      },
    },
    orderBy: {
      item: {
        name: "asc",
      },
    },
  });

  return items.map((item) => ({
    ...item,
    currentQuantity: Number(item.currentQuantity),
    minQuantity: item.minQuantity ? Number(item.minQuantity) : null,
    maxQuantity: item.maxQuantity ? Number(item.maxQuantity) : null,
    averageCost: item.averageCost ? Number(item.averageCost) : null,
    lastCost: item.lastCost ? Number(item.lastCost) : null,
  }));
}

export async function getStockItemById(
  id: string
): Promise<StockItemWithDetails | null> {
  const item = await prisma.stockItem.findUnique({
    where: { id },
    include: {
      item: {
        select: {
          id: true,
          name: true,
          unit: true,
          type: true,
          category: true,
          supplier1: true,
          supplier2: true,
        },
      },
      _count: {
        select: {
          batches: true,
          transactionItems: true,
        },
      },
    },
  });

  if (!item) return null;

  return {
    ...item,
    currentQuantity: Number(item.currentQuantity),
    minQuantity: item.minQuantity ? Number(item.minQuantity) : null,
    maxQuantity: item.maxQuantity ? Number(item.maxQuantity) : null,
    averageCost: item.averageCost ? Number(item.averageCost) : null,
    lastCost: item.lastCost ? Number(item.lastCost) : null,
  };
}

export async function getStockItemByItemId(
  itemId: string
): Promise<StockItemWithDetails | null> {
  const item = await prisma.stockItem.findUnique({
    where: { itemId },
    include: {
      item: {
        select: {
          id: true,
          name: true,
          unit: true,
          type: true,
          category: true,
          supplier1: true,
          supplier2: true,
        },
      },
      _count: {
        select: {
          batches: true,
          transactionItems: true,
        },
      },
    },
  });

  if (!item) return null;

  return {
    ...item,
    currentQuantity: Number(item.currentQuantity),
    minQuantity: item.minQuantity ? Number(item.minQuantity) : null,
    maxQuantity: item.maxQuantity ? Number(item.maxQuantity) : null,
    averageCost: item.averageCost ? Number(item.averageCost) : null,
    lastCost: item.lastCost ? Number(item.lastCost) : null,
  };
}

export async function createStockItem(data: {
  itemId: string;
  minQuantity?: number;
  maxQuantity?: number;
  location?: string;
}): Promise<StockItemWithDetails> {
  const item = await prisma.stockItem.create({
    data: {
      itemId: data.itemId,
      minQuantity: data.minQuantity,
      maxQuantity: data.maxQuantity,
      location: data.location,
    },
    include: {
      item: {
        select: {
          id: true,
          name: true,
          unit: true,
          type: true,
          category: true,
          supplier1: true,
          supplier2: true,
        },
      },
      _count: {
        select: {
          batches: true,
          transactionItems: true,
        },
      },
    },
  });

  return {
    ...item,
    currentQuantity: Number(item.currentQuantity),
    minQuantity: item.minQuantity ? Number(item.minQuantity) : null,
    maxQuantity: item.maxQuantity ? Number(item.maxQuantity) : null,
    averageCost: item.averageCost ? Number(item.averageCost) : null,
    lastCost: item.lastCost ? Number(item.lastCost) : null,
  };
}

export async function getOrCreateStockItem(
  itemId: string
): Promise<StockItemWithDetails> {
  const existing = await getStockItemByItemId(itemId);
  if (existing) return existing;
  return createStockItem({ itemId });
}

export async function updateStockItem(
  id: string,
  data: {
    minQuantity?: number | null;
    maxQuantity?: number | null;
    location?: string | null;
    isActive?: boolean;
  }
): Promise<StockItemWithDetails> {
  const item = await prisma.stockItem.update({
    where: { id },
    data,
    include: {
      item: {
        select: {
          id: true,
          name: true,
          unit: true,
          type: true,
          category: true,
          supplier1: true,
          supplier2: true,
        },
      },
      _count: {
        select: {
          batches: true,
          transactionItems: true,
        },
      },
    },
  });

  return {
    ...item,
    currentQuantity: Number(item.currentQuantity),
    minQuantity: item.minQuantity ? Number(item.minQuantity) : null,
    maxQuantity: item.maxQuantity ? Number(item.maxQuantity) : null,
    averageCost: item.averageCost ? Number(item.averageCost) : null,
    lastCost: item.lastCost ? Number(item.lastCost) : null,
  };
}

// ============================================
// Batch Functions
// ============================================

export async function getItemBatches(
  stockItemId: string
): Promise<StockBatchWithItem[]> {
  const batches = await prisma.stockBatch.findMany({
    where: {
      stockItemId,
      currentQuantity: { gt: 0 },
    },
    include: {
      stockItem: {
        select: {
          id: true,
          item: {
            select: {
              id: true,
              name: true,
              unit: true,
            },
          },
        },
      },
    },
    orderBy: [
      { expiryDate: "asc" }, // FEFO - First Expiry, First Out
      { createdAt: "asc" }, // Then by creation date (FIFO)
    ],
  });

  return batches.map((batch) => ({
    ...batch,
    initialQuantity: Number(batch.initialQuantity),
    currentQuantity: Number(batch.currentQuantity),
    unitCost: Number(batch.unitCost),
  }));
}

export async function getExpiringBatches(
  daysAhead: number = 30
): Promise<StockBatchWithItem[]> {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + daysAhead);

  const batches = await prisma.stockBatch.findMany({
    where: {
      currentQuantity: { gt: 0 },
      expiryDate: {
        not: null,
        lte: futureDate,
      },
    },
    include: {
      stockItem: {
        select: {
          id: true,
          item: {
            select: {
              id: true,
              name: true,
              unit: true,
            },
          },
        },
      },
    },
    orderBy: {
      expiryDate: "asc",
    },
  });

  return batches.map((batch) => ({
    ...batch,
    initialQuantity: Number(batch.initialQuantity),
    currentQuantity: Number(batch.currentQuantity),
    unitCost: Number(batch.unitCost),
  }));
}

// ============================================
// Transaction Functions
// ============================================

export async function getTransactions(
  filters?: TransactionFilters,
  limit: number = 50
): Promise<StockTransactionWithDetails[]> {
  const where: Prisma.StockTransactionWhereInput = {};

  if (filters?.type) {
    where.type = filters.type;
  }

  if (filters?.status) {
    where.status = filters.status;
  }

  if (filters?.stockItemId) {
    where.items = {
      some: {
        stockItemId: filters.stockItemId,
      },
    };
  }

  if (filters?.requestedBy) {
    where.requestedBy = filters.requestedBy;
  }

  if (filters?.startDate || filters?.endDate) {
    where.transactionDate = {};
    if (filters.startDate) {
      where.transactionDate.gte = filters.startDate;
    }
    if (filters.endDate) {
      where.transactionDate.lte = filters.endDate;
    }
  }

  const transactions = await prisma.stockTransaction.findMany({
    where,
    include: {
      requestedByUser: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
      approvedByUser: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      items: {
        include: {
          stockItem: {
            select: {
              id: true,
              currentQuantity: true,
              item: {
                select: {
                  id: true,
                  name: true,
                  unit: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: limit,
  });

  return transactions.map((tx) => {
    const items = tx.items.map((item) => ({
      ...item,
      quantity: Number(item.quantity),
      unitCost: item.unitCost ? Number(item.unitCost) : null,
      totalCost: item.totalCost ? Number(item.totalCost) : null,
      stockItem: {
        ...item.stockItem,
        currentQuantity: Number(item.stockItem.currentQuantity),
      },
    }));

    const totalValue = items.reduce(
      (sum, item) => sum + (item.totalCost || 0),
      0
    );

    return {
      ...tx,
      items,
      totalValue,
    };
  });
}

export async function getPendingTransactions(): Promise<
  StockTransactionWithDetails[]
> {
  return getTransactions({ status: StockTransactionStatus.PENDING }, 100);
}

export async function getTransactionById(
  id: string
): Promise<StockTransactionWithDetails | null> {
  const tx = await prisma.stockTransaction.findUnique({
    where: { id },
    include: {
      requestedByUser: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
      approvedByUser: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      items: {
        include: {
          stockItem: {
            select: {
              id: true,
              currentQuantity: true,
              item: {
                select: {
                  id: true,
                  name: true,
                  unit: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!tx) return null;

  const items = tx.items.map((item) => ({
    ...item,
    quantity: Number(item.quantity),
    unitCost: item.unitCost ? Number(item.unitCost) : null,
    totalCost: item.totalCost ? Number(item.totalCost) : null,
    stockItem: {
      ...item.stockItem,
      currentQuantity: Number(item.stockItem.currentQuantity),
    },
  }));

  const totalValue = items.reduce(
    (sum, item) => sum + (item.totalCost || 0),
    0
  );

  return {
    ...tx,
    items,
    totalValue,
  };
}

interface CreateTransactionItem {
  stockItemId: string;
  quantity: number;
  unitCost?: number;
  batchNumber?: string;
  expiryDate?: Date;
  purpose?: string;
}

export async function createTransaction(data: {
  type: StockTransactionType;
  items: CreateTransactionItem[];
  description?: string;
  reference?: string;
  notes?: string;
  requestedBy: string;
  attachmentUrl?: string;
  attachmentName?: string;
}): Promise<StockTransactionWithDetails> {
  const transactionNumber = await generateTransactionNumber();
  const autoApprove = shouldAutoApprove(data.type);

  const transaction = await prisma.$transaction(async (tx) => {
    // Create the transaction
    const newTx = await tx.stockTransaction.create({
      data: {
        transactionNumber,
        type: data.type,
        status: autoApprove
          ? StockTransactionStatus.APPROVED
          : StockTransactionStatus.PENDING,
        description: data.description,
        reference: data.reference,
        notes: data.notes,
        requestedBy: data.requestedBy,
        approvedBy: autoApprove ? data.requestedBy : null,
        approvedAt: autoApprove ? new Date() : null,
        attachmentUrl: data.attachmentUrl,
        attachmentName: data.attachmentName,
        items: {
          create: data.items.map((item) => ({
            stockItemId: item.stockItemId,
            quantity: item.quantity,
            unitCost: item.unitCost,
            totalCost: item.unitCost
              ? item.quantity * item.unitCost
              : undefined,
            batchNumber: item.batchNumber,
            expiryDate: item.expiryDate,
            purpose: item.purpose,
          })),
        },
      },
      include: {
        requestedByUser: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        approvedByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        items: {
          include: {
            stockItem: {
              select: {
                id: true,
                currentQuantity: true,
                item: {
                  select: {
                    id: true,
                    name: true,
                    unit: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // If auto-approved, update stock quantities and create batches
    if (autoApprove) {
      await applyTransactionToStock(tx, newTx.id, data.type, data.items);
    }

    return newTx;
  });

  const items = transaction.items.map((item) => ({
    ...item,
    quantity: Number(item.quantity),
    unitCost: item.unitCost ? Number(item.unitCost) : null,
    totalCost: item.totalCost ? Number(item.totalCost) : null,
    stockItem: {
      ...item.stockItem,
      currentQuantity: Number(item.stockItem.currentQuantity),
    },
  }));

  const totalValue = items.reduce(
    (sum, item) => sum + (item.totalCost || 0),
    0
  );

  return {
    ...transaction,
    items,
    totalValue,
  };
}

async function applyTransactionToStock(
  tx: Prisma.TransactionClient,
  transactionId: string,
  type: StockTransactionType,
  items: CreateTransactionItem[]
) {
  const increaseTypes: StockTransactionType[] = [
    StockTransactionType.RECEIVE,
    StockTransactionType.ADJUST_IN,
    StockTransactionType.TRANSFER_IN,
    StockTransactionType.RETURN,
  ];

  for (const item of items) {
    const isIncrease = increaseTypes.includes(type);

    const quantityChange = isIncrease ? item.quantity : -item.quantity;

    // Update stock quantity
    await tx.stockItem.update({
      where: { id: item.stockItemId },
      data: {
        currentQuantity: {
          increment: quantityChange,
        },
        lastCost: item.unitCost,
        // Update average cost for receives
        ...(type === StockTransactionType.RECEIVE && item.unitCost
          ? {
              averageCost: item.unitCost, // Simplified - should calculate weighted average
            }
          : {}),
      },
    });

    // Create batch for receives
    if (type === StockTransactionType.RECEIVE) {
      await tx.stockBatch.create({
        data: {
          stockItemId: item.stockItemId,
          batchNumber: item.batchNumber,
          expiryDate: item.expiryDate,
          initialQuantity: item.quantity,
          currentQuantity: item.quantity,
          unitCost: item.unitCost || 0,
          receiveTransactionId: transactionId,
        },
      });
    }

    // Deduct from batches for withdraws (FIFO/FEFO)
    if (type === StockTransactionType.WITHDRAW) {
      let remainingQty = item.quantity;
      const batches = await tx.stockBatch.findMany({
        where: {
          stockItemId: item.stockItemId,
          currentQuantity: { gt: 0 },
        },
        orderBy: [{ expiryDate: "asc" }, { createdAt: "asc" }],
      });

      for (const batch of batches) {
        if (remainingQty <= 0) break;

        const batchQty = Number(batch.currentQuantity);
        const deductQty = Math.min(remainingQty, batchQty);

        await tx.stockBatch.update({
          where: { id: batch.id },
          data: {
            currentQuantity: {
              decrement: deductQty,
            },
          },
        });

        remainingQty -= deductQty;
      }
    }
  }
}

export async function approveTransaction(
  transactionId: string,
  approvedBy: string
): Promise<StockTransactionWithDetails> {
  const transaction = await prisma.$transaction(async (tx) => {
    // Get the transaction
    const existingTx = await tx.stockTransaction.findUnique({
      where: { id: transactionId },
      include: {
        items: true,
      },
    });

    if (!existingTx) {
      throw new Error("Transaction not found");
    }

    if (existingTx.status !== StockTransactionStatus.PENDING) {
      throw new Error("Transaction is not pending");
    }

    // Update the transaction
    const updatedTx = await tx.stockTransaction.update({
      where: { id: transactionId },
      data: {
        status: StockTransactionStatus.APPROVED,
        approvedBy,
        approvedAt: new Date(),
      },
      include: {
        requestedByUser: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        approvedByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        items: {
          include: {
            stockItem: {
              select: {
                id: true,
                currentQuantity: true,
                item: {
                  select: {
                    id: true,
                    name: true,
                    unit: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // Apply stock changes
    const itemsForApply: CreateTransactionItem[] = existingTx.items.map(
      (item) => ({
        stockItemId: item.stockItemId,
        quantity: Number(item.quantity),
        unitCost: item.unitCost ? Number(item.unitCost) : undefined,
        batchNumber: item.batchNumber || undefined,
        expiryDate: item.expiryDate || undefined,
        purpose: item.purpose || undefined,
      })
    );

    await applyTransactionToStock(
      tx,
      transactionId,
      existingTx.type,
      itemsForApply
    );

    return updatedTx;
  });

  const items = transaction.items.map((item) => ({
    ...item,
    quantity: Number(item.quantity),
    unitCost: item.unitCost ? Number(item.unitCost) : null,
    totalCost: item.totalCost ? Number(item.totalCost) : null,
    stockItem: {
      ...item.stockItem,
      currentQuantity: Number(item.stockItem.currentQuantity),
    },
  }));

  const totalValue = items.reduce(
    (sum, item) => sum + (item.totalCost || 0),
    0
  );

  return {
    ...transaction,
    items,
    totalValue,
  };
}

export async function rejectTransaction(
  transactionId: string,
  rejectReason?: string
): Promise<StockTransactionWithDetails> {
  const transaction = await prisma.stockTransaction.update({
    where: { id: transactionId },
    data: {
      status: StockTransactionStatus.REJECTED,
      rejectedAt: new Date(),
      rejectReason,
    },
    include: {
      requestedByUser: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
      approvedByUser: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      items: {
        include: {
          stockItem: {
            select: {
              id: true,
              currentQuantity: true,
              item: {
                select: {
                  id: true,
                  name: true,
                  unit: true,
                },
              },
            },
          },
        },
      },
    },
  });

  const items = transaction.items.map((item) => ({
    ...item,
    quantity: Number(item.quantity),
    unitCost: item.unitCost ? Number(item.unitCost) : null,
    totalCost: item.totalCost ? Number(item.totalCost) : null,
    stockItem: {
      ...item.stockItem,
      currentQuantity: Number(item.stockItem.currentQuantity),
    },
  }));

  const totalValue = items.reduce(
    (sum, item) => sum + (item.totalCost || 0),
    0
  );

  return {
    ...transaction,
    items,
    totalValue,
  };
}

// ============================================
// KPI Functions
// ============================================

export async function getInventoryKPIs(): Promise<InventoryKPIs> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  const [
    totalItems,
    stockItems,
    lowStockCount,
    expiringSoonCount,
    pendingTransactionCount,
    todayTransactions,
  ] = await Promise.all([
    // Total active stock items
    prisma.stockItem.count({
      where: { isActive: true },
    }),

    // All stock items for value calculation
    prisma.stockItem.findMany({
      where: { isActive: true },
      select: {
        currentQuantity: true,
        averageCost: true,
      },
    }),

    // Low stock count (where currentQuantity <= minQuantity)
    prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) as count FROM "StockItem"
      WHERE "isActive" = true
      AND "minQuantity" IS NOT NULL
      AND "currentQuantity" <= "minQuantity"
    `,

    // Expiring soon count
    prisma.stockBatch.count({
      where: {
        currentQuantity: { gt: 0 },
        expiryDate: {
          not: null,
          lte: thirtyDaysFromNow,
        },
      },
    }),

    // Pending transactions
    prisma.stockTransaction.count({
      where: {
        status: StockTransactionStatus.PENDING,
      },
    }),

    // Today's approved transactions
    prisma.stockTransaction.findMany({
      where: {
        status: StockTransactionStatus.APPROVED,
        approvedAt: {
          gte: today,
          lt: tomorrow,
        },
      },
      include: {
        items: true,
      },
    }),
  ]);

  // Calculate total value
  const totalValue = stockItems.reduce((sum, item) => {
    const qty = Number(item.currentQuantity);
    const cost = item.averageCost ? Number(item.averageCost) : 0;
    return sum + qty * cost;
  }, 0);

  // Calculate today's received and withdrawn
  let todayReceived = 0;
  let todayWithdrawn = 0;

  for (const tx of todayTransactions) {
    const txTotal = tx.items.reduce(
      (sum, item) => sum + Number(item.quantity),
      0
    );

    if (tx.type === StockTransactionType.RECEIVE) {
      todayReceived += txTotal;
    } else if (tx.type === StockTransactionType.WITHDRAW) {
      todayWithdrawn += txTotal;
    }
  }

  return {
    totalItems,
    totalValue,
    lowStockCount: Number(lowStockCount[0]?.count || 0),
    expiringSoonCount,
    pendingTransactionCount,
    todayReceived,
    todayWithdrawn,
  };
}

// ============================================
// Item Lookup Functions
// ============================================

export async function getAllItems() {
  return prisma.item.findMany({
    select: {
      id: true,
      name: true,
      unit: true,
      type: true,
      category: true,
      supplier1: true,
      supplier2: true,
      stockItem: {
        select: {
          id: true,
          currentQuantity: true,
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  });
}

export async function getLowStockItems(): Promise<StockItemWithDetails[]> {
  const items = await prisma.$queryRaw<
    Array<{
      id: string;
      itemId: string;
      currentQuantity: number;
      minQuantity: number;
      maxQuantity: number | null;
      averageCost: number | null;
      lastCost: number | null;
      location: string | null;
      isActive: boolean;
      createdAt: Date;
      updatedAt: Date;
    }>
  >`
    SELECT * FROM "StockItem"
    WHERE "isActive" = true
    AND "minQuantity" IS NOT NULL
    AND "currentQuantity" <= "minQuantity"
  `;

  // Get full details for each low stock item
  const fullItems = await Promise.all(
    items.map((item) => getStockItemById(item.id))
  );

  return fullItems.filter((item): item is StockItemWithDetails => item !== null);
}
