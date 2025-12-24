import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/db";
import { PettyCashType, PettyCashStatus } from "@prisma/client";
import {
  getPettyCashAccounts,
  getPettyCashAccountByUserId,
  createPettyCashAccount,
  getOrCreatePettyCashAccount,
  getTransactions,
  getPendingTransactions,
  createTransaction,
  approveTransaction,
  rejectTransaction,
  editTransaction,
  getTransactionById,
  getPettyCashKPIs,
  transferBetweenAccounts,
  getAllUsersForPettyCash,
} from "@/lib/petty-cash-db";

// Mock types
const mockUser = {
  id: "user-1",
  name: "Test User",
  email: "test@example.com",
  image: null,
};

const mockAccount = {
  id: "account-1",
  userId: "user-1",
  balance: 10000,
  createdAt: new Date(),
  updatedAt: new Date(),
  user: mockUser,
  _count: { transactions: 5 },
};

const mockTransaction = {
  id: "tx-1",
  accountId: "account-1",
  type: PettyCashType.WITHDRAW,
  amount: 1000,
  description: "Test withdrawal",
  reference: "REF-001",
  status: PettyCashStatus.PENDING,
  requestedBy: "user-1",
  approvedBy: null,
  approvedAt: null,
  rejectedAt: null,
  rejectReason: null,
  attachmentUrl: null,
  attachmentName: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  account: {
    balance: 10000,
    user: mockUser,
  },
};

// Reset mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
});

// ============================================
// Account Functions Tests
// ============================================

describe("getPettyCashAccounts", () => {
  it("should return all accounts with user info", async () => {
    vi.mocked(prisma.pettyCashAccount.findMany).mockResolvedValue([mockAccount]);

    const result = await getPettyCashAccounts();

    expect(prisma.pettyCashAccount.findMany).toHaveBeenCalledWith({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        _count: {
          select: {
            transactions: true,
          },
        },
      },
      orderBy: {
        user: {
          name: "asc",
        },
      },
    });
    expect(result).toHaveLength(1);
    expect(result[0].balance).toBe(10000);
    expect(result[0].user.name).toBe("Test User");
  });

  it("should return empty array when no accounts", async () => {
    vi.mocked(prisma.pettyCashAccount.findMany).mockResolvedValue([]);

    const result = await getPettyCashAccounts();

    expect(result).toHaveLength(0);
  });

  it("should convert Decimal balance to number", async () => {
    const accountWithDecimal = {
      ...mockAccount,
      balance: { toNumber: () => 5000.5 } as any,
    };
    vi.mocked(prisma.pettyCashAccount.findMany).mockResolvedValue([accountWithDecimal]);

    const result = await getPettyCashAccounts();

    expect(typeof result[0].balance).toBe("number");
  });
});

describe("getPettyCashAccountByUserId", () => {
  it("should return account for valid userId", async () => {
    vi.mocked(prisma.pettyCashAccount.findUnique).mockResolvedValue(mockAccount);

    const result = await getPettyCashAccountByUserId("user-1");

    expect(prisma.pettyCashAccount.findUnique).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      include: expect.any(Object),
    });
    expect(result).not.toBeNull();
    expect(result?.userId).toBe("user-1");
  });

  it("should return null for non-existent userId", async () => {
    vi.mocked(prisma.pettyCashAccount.findUnique).mockResolvedValue(null);

    const result = await getPettyCashAccountByUserId("non-existent");

    expect(result).toBeNull();
  });
});

describe("createPettyCashAccount", () => {
  it("should create account with default balance 0", async () => {
    vi.mocked(prisma.pettyCashAccount.create).mockResolvedValue({
      ...mockAccount,
      balance: 0,
    });

    const result = await createPettyCashAccount("user-1");

    expect(prisma.pettyCashAccount.create).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        balance: 0,
      },
      include: expect.any(Object),
    });
    expect(result.balance).toBe(0);
  });

  it("should create account with initial balance", async () => {
    vi.mocked(prisma.pettyCashAccount.create).mockResolvedValue({
      ...mockAccount,
      balance: 5000,
    });

    const result = await createPettyCashAccount("user-1", 5000);

    expect(prisma.pettyCashAccount.create).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        balance: 5000,
      },
      include: expect.any(Object),
    });
    expect(result.balance).toBe(5000);
  });
});

describe("getOrCreatePettyCashAccount", () => {
  it("should return existing account if found", async () => {
    vi.mocked(prisma.pettyCashAccount.findUnique).mockResolvedValue(mockAccount);

    const result = await getOrCreatePettyCashAccount("user-1");

    expect(prisma.pettyCashAccount.findUnique).toHaveBeenCalled();
    expect(prisma.pettyCashAccount.create).not.toHaveBeenCalled();
    expect(result.id).toBe("account-1");
  });

  it("should create new account if not found", async () => {
    vi.mocked(prisma.pettyCashAccount.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.pettyCashAccount.create).mockResolvedValue({
      ...mockAccount,
      balance: 0,
    });

    const result = await getOrCreatePettyCashAccount("user-1");

    expect(prisma.pettyCashAccount.findUnique).toHaveBeenCalled();
    expect(prisma.pettyCashAccount.create).toHaveBeenCalled();
    expect(result.balance).toBe(0);
  });
});

// ============================================
// Transaction Functions Tests
// ============================================

describe("getTransactions", () => {
  it("should return all transactions when no filters", async () => {
    vi.mocked(prisma.pettyCashTransaction.findMany).mockResolvedValue([mockTransaction]);

    const result = await getTransactions();

    expect(prisma.pettyCashTransaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {},
        take: 50,
        orderBy: { createdAt: "desc" },
      })
    );
    expect(result).toHaveLength(1);
  });

  it("should filter by accountId", async () => {
    vi.mocked(prisma.pettyCashTransaction.findMany).mockResolvedValue([mockTransaction]);

    await getTransactions("account-1");

    expect(prisma.pettyCashTransaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { accountId: "account-1" },
      })
    );
  });

  it("should filter by type", async () => {
    vi.mocked(prisma.pettyCashTransaction.findMany).mockResolvedValue([mockTransaction]);

    await getTransactions(undefined, { type: PettyCashType.WITHDRAW });

    expect(prisma.pettyCashTransaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { type: PettyCashType.WITHDRAW },
      })
    );
  });

  it("should filter by status", async () => {
    vi.mocked(prisma.pettyCashTransaction.findMany).mockResolvedValue([mockTransaction]);

    await getTransactions(undefined, { status: PettyCashStatus.PENDING });

    expect(prisma.pettyCashTransaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: PettyCashStatus.PENDING },
      })
    );
  });

  it("should filter by date range", async () => {
    vi.mocked(prisma.pettyCashTransaction.findMany).mockResolvedValue([]);
    const startDate = new Date("2024-01-01");
    const endDate = new Date("2024-12-31");

    await getTransactions(undefined, { startDate, endDate });

    expect(prisma.pettyCashTransaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      })
    );
  });

  it("should respect limit parameter", async () => {
    vi.mocked(prisma.pettyCashTransaction.findMany).mockResolvedValue([]);

    await getTransactions(undefined, undefined, 100);

    expect(prisma.pettyCashTransaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 100,
      })
    );
  });
});

describe("getPendingTransactions", () => {
  it("should return only PENDING transactions", async () => {
    vi.mocked(prisma.pettyCashTransaction.findMany).mockResolvedValue([mockTransaction]);

    const result = await getPendingTransactions();

    expect(prisma.pettyCashTransaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: PettyCashStatus.PENDING },
        take: 100,
      })
    );
    expect(result[0].status).toBe(PettyCashStatus.PENDING);
  });
});

describe("createTransaction", () => {
  it("should create WITHDRAW transaction with PENDING status", async () => {
    const mockTxResult = {
      ...mockTransaction,
      status: PettyCashStatus.PENDING,
    };

    vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
      return callback({
        pettyCashTransaction: {
          create: vi.fn().mockResolvedValue(mockTxResult),
        },
        pettyCashAccount: {
          update: vi.fn(),
        },
      });
    });

    const result = await createTransaction({
      accountId: "account-1",
      type: PettyCashType.WITHDRAW,
      amount: 1000,
      description: "Test",
    });

    expect(result.status).toBe(PettyCashStatus.PENDING);
    expect(result.type).toBe(PettyCashType.WITHDRAW);
  });

  it("should auto-approve RETURN transaction and update balance", async () => {
    const mockTxResult = {
      ...mockTransaction,
      type: PettyCashType.RETURN,
      status: PettyCashStatus.APPROVED,
      approvedAt: new Date(),
    };

    const mockUpdate = vi.fn();
    vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
      return callback({
        pettyCashTransaction: {
          create: vi.fn().mockResolvedValue(mockTxResult),
        },
        pettyCashAccount: {
          update: mockUpdate,
        },
      });
    });

    const result = await createTransaction({
      accountId: "account-1",
      type: PettyCashType.RETURN,
      amount: 500,
    });

    expect(result.status).toBe(PettyCashStatus.APPROVED);
    expect(mockUpdate).toHaveBeenCalled();
  });

  it("should auto-approve TOPUP transaction and update balance", async () => {
    const mockTxResult = {
      ...mockTransaction,
      type: PettyCashType.TOPUP,
      status: PettyCashStatus.APPROVED,
      approvedAt: new Date(),
    };

    vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
      return callback({
        pettyCashTransaction: {
          create: vi.fn().mockResolvedValue(mockTxResult),
        },
        pettyCashAccount: {
          update: vi.fn(),
        },
      });
    });

    const result = await createTransaction({
      accountId: "account-1",
      type: PettyCashType.TOPUP,
      amount: 10000,
    });

    expect(result.status).toBe(PettyCashStatus.APPROVED);
  });

  it("should save attachment info", async () => {
    const mockCreate = vi.fn().mockResolvedValue(mockTransaction);
    vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
      return callback({
        pettyCashTransaction: { create: mockCreate },
        pettyCashAccount: { update: vi.fn() },
      });
    });

    await createTransaction({
      accountId: "account-1",
      type: PettyCashType.WITHDRAW,
      amount: 1000,
      attachmentUrl: "https://example.com/file.pdf",
      attachmentName: "receipt.pdf",
    });

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          attachmentUrl: "https://example.com/file.pdf",
          attachmentName: "receipt.pdf",
        }),
      })
    );
  });
});

describe("approveTransaction", () => {
  it("should approve PENDING transaction and update balance", async () => {
    const mockApprovedTx = {
      ...mockTransaction,
      status: PettyCashStatus.APPROVED,
      approvedBy: "admin-1",
      approvedAt: new Date(),
    };

    vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
      return callback({
        pettyCashTransaction: {
          findUnique: vi.fn().mockResolvedValue(mockTransaction),
          update: vi.fn().mockResolvedValue(mockApprovedTx),
        },
        pettyCashAccount: {
          update: vi.fn(),
        },
      });
    });

    const result = await approveTransaction("tx-1", "admin-1");

    expect(result.status).toBe(PettyCashStatus.APPROVED);
    expect(result.approvedBy).toBe("admin-1");
  });

  it("should throw error if transaction not found", async () => {
    vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
      return callback({
        pettyCashTransaction: {
          findUnique: vi.fn().mockResolvedValue(null),
          update: vi.fn(),
        },
        pettyCashAccount: { update: vi.fn() },
      });
    });

    await expect(approveTransaction("non-existent", "admin-1")).rejects.toThrow(
      "Transaction not found"
    );
  });

  it("should throw error if transaction is not PENDING", async () => {
    vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
      return callback({
        pettyCashTransaction: {
          findUnique: vi.fn().mockResolvedValue({
            ...mockTransaction,
            status: PettyCashStatus.APPROVED,
          }),
          update: vi.fn(),
        },
        pettyCashAccount: { update: vi.fn() },
      });
    });

    await expect(approveTransaction("tx-1", "admin-1")).rejects.toThrow(
      "Transaction is not pending"
    );
  });

  it("should decrease balance for WITHDRAW approval", async () => {
    const mockUpdate = vi.fn();
    vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
      return callback({
        pettyCashTransaction: {
          findUnique: vi.fn().mockResolvedValue({
            ...mockTransaction,
            type: PettyCashType.WITHDRAW,
            amount: 1000,
          }),
          update: vi.fn().mockResolvedValue({
            ...mockTransaction,
            status: PettyCashStatus.APPROVED,
          }),
        },
        pettyCashAccount: { update: mockUpdate },
      });
    });

    await approveTransaction("tx-1", "admin-1");

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          balance: { increment: -1000 },
        },
      })
    );
  });
});

describe("rejectTransaction", () => {
  it("should reject transaction with reason", async () => {
    const mockRejectedTx = {
      ...mockTransaction,
      status: PettyCashStatus.REJECTED,
      rejectedAt: new Date(),
      rejectReason: "Invalid receipt",
    };

    vi.mocked(prisma.pettyCashTransaction.update).mockResolvedValue(mockRejectedTx);

    const result = await rejectTransaction("tx-1", "Invalid receipt");

    expect(prisma.pettyCashTransaction.update).toHaveBeenCalledWith({
      where: { id: "tx-1" },
      data: {
        status: PettyCashStatus.REJECTED,
        rejectedAt: expect.any(Date),
        rejectReason: "Invalid receipt",
      },
      include: expect.any(Object),
    });
    expect(result.status).toBe(PettyCashStatus.REJECTED);
    expect(result.rejectReason).toBe("Invalid receipt");
  });

  it("should reject without reason", async () => {
    const mockRejectedTx = {
      ...mockTransaction,
      status: PettyCashStatus.REJECTED,
      rejectedAt: new Date(),
      rejectReason: undefined,
    };

    vi.mocked(prisma.pettyCashTransaction.update).mockResolvedValue(mockRejectedTx);

    await rejectTransaction("tx-1");

    expect(prisma.pettyCashTransaction.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          rejectReason: undefined,
        }),
      })
    );
  });
});

describe("editTransaction", () => {
  it("should edit PENDING transaction without balance change", async () => {
    const mockEditedTx = {
      ...mockTransaction,
      amount: 2000,
      description: "Updated description",
    };

    vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
      return callback({
        pettyCashTransaction: {
          findUnique: vi.fn().mockResolvedValue(mockTransaction),
          update: vi.fn().mockResolvedValue(mockEditedTx),
        },
        pettyCashAccount: { update: vi.fn() },
      });
    });

    const result = await editTransaction({
      transactionId: "tx-1",
      amount: 2000,
      description: "Updated description",
      editedBy: "user-1",
    });

    expect(result.amount).toBe(2000);
    expect(result.description).toBe("Updated description");
  });

  it("should reverse balance and reset to PENDING when editing APPROVED transaction", async () => {
    const approvedTx = {
      ...mockTransaction,
      status: PettyCashStatus.APPROVED,
      approvedBy: "admin-1",
      approvedAt: new Date(),
    };

    const mockAccountUpdate = vi.fn();
    vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
      return callback({
        pettyCashTransaction: {
          findUnique: vi.fn().mockResolvedValue(approvedTx),
          update: vi.fn().mockResolvedValue({
            ...approvedTx,
            status: PettyCashStatus.PENDING,
            approvedBy: null,
            approvedAt: null,
          }),
        },
        pettyCashAccount: { update: mockAccountUpdate },
      });
    });

    await editTransaction({
      transactionId: "tx-1",
      amount: 1500,
      editedBy: "user-1",
    });

    // Should reverse the balance (add back for WITHDRAW)
    expect(mockAccountUpdate).toHaveBeenCalled();
  });

  it("should throw error if transaction not found", async () => {
    vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
      return callback({
        pettyCashTransaction: {
          findUnique: vi.fn().mockResolvedValue(null),
          update: vi.fn(),
        },
        pettyCashAccount: { update: vi.fn() },
      });
    });

    await expect(
      editTransaction({
        transactionId: "non-existent",
        amount: 1000,
        editedBy: "user-1",
      })
    ).rejects.toThrow("Transaction not found");
  });
});

describe("getTransactionById", () => {
  it("should return transaction by id", async () => {
    vi.mocked(prisma.pettyCashTransaction.findUnique).mockResolvedValue(mockTransaction);

    const result = await getTransactionById("tx-1");

    expect(prisma.pettyCashTransaction.findUnique).toHaveBeenCalledWith({
      where: { id: "tx-1" },
      include: expect.any(Object),
    });
    expect(result).not.toBeNull();
    expect(result?.id).toBe("tx-1");
  });

  it("should return null for non-existent id", async () => {
    vi.mocked(prisma.pettyCashTransaction.findUnique).mockResolvedValue(null);

    const result = await getTransactionById("non-existent");

    expect(result).toBeNull();
  });
});

// ============================================
// KPI Functions Tests
// ============================================

describe("getPettyCashKPIs", () => {
  it("should return all KPIs", async () => {
    vi.mocked(prisma.pettyCashAccount.aggregate).mockResolvedValue({
      _sum: { balance: 50000 },
      _avg: null,
      _count: null,
      _max: null,
      _min: null,
    });
    vi.mocked(prisma.pettyCashTransaction.count).mockResolvedValue(3);
    vi.mocked(prisma.pettyCashAccount.count).mockResolvedValue(5);
    vi.mocked(prisma.pettyCashTransaction.groupBy).mockResolvedValue([
      { type: PettyCashType.WITHDRAW, _sum: { amount: 5000 }, _count: null, _avg: null, _max: null, _min: null } as any,
      { type: PettyCashType.RETURN, _sum: { amount: 1000 }, _count: null, _avg: null, _max: null, _min: null } as any,
      { type: PettyCashType.TOPUP, _sum: { amount: 10000 }, _count: null, _avg: null, _max: null, _min: null } as any,
    ]);

    const result = await getPettyCashKPIs();

    expect(result.totalBalance).toBe(50000);
    expect(result.pendingCount).toBe(3);
    expect(result.accountCount).toBe(5);
    expect(result.todayWithdraw).toBe(5000);
    expect(result.todayReturn).toBe(1000);
    expect(result.todayTopup).toBe(10000);
  });

  it("should handle empty data", async () => {
    vi.mocked(prisma.pettyCashAccount.aggregate).mockResolvedValue({
      _sum: { balance: null },
      _avg: null,
      _count: null,
      _max: null,
      _min: null,
    });
    vi.mocked(prisma.pettyCashTransaction.count).mockResolvedValue(0);
    vi.mocked(prisma.pettyCashAccount.count).mockResolvedValue(0);
    vi.mocked(prisma.pettyCashTransaction.groupBy).mockResolvedValue([]);

    const result = await getPettyCashKPIs();

    expect(result.totalBalance).toBe(0);
    expect(result.pendingCount).toBe(0);
    expect(result.accountCount).toBe(0);
    expect(result.todayWithdraw).toBe(0);
    expect(result.todayReturn).toBe(0);
    expect(result.todayTopup).toBe(0);
  });
});

// ============================================
// Transfer Functions Tests
// ============================================

describe("transferBetweenAccounts", () => {
  const mockFromAccount = {
    id: "account-1",
    balance: 10000,
    user: { name: "User A", email: "a@example.com" },
  };

  const mockToAccount = {
    id: "account-2",
    balance: 5000,
    user: { name: "User B", email: "b@example.com" },
  };

  it("should transfer between two accounts", async () => {
    vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
      return callback({
        pettyCashAccount: {
          findUnique: vi
            .fn()
            .mockResolvedValueOnce(mockFromAccount)
            .mockResolvedValueOnce(mockToAccount),
          update: vi.fn(),
        },
        pettyCashTransaction: {
          create: vi.fn().mockResolvedValue({ id: "tx-out" }),
          findUnique: vi.fn().mockResolvedValue({
            ...mockTransaction,
            account: { balance: 9000, user: mockUser },
          }),
          update: vi.fn(),
        },
      });
    });

    const result = await transferBetweenAccounts({
      fromAccountId: "account-1",
      toAccountId: "account-2",
      amount: 1000,
      requestedBy: "user-1",
    });

    expect(result.outTransaction).toBeDefined();
    expect(result.inTransaction).toBeDefined();
  });

  it("should throw error for same account transfer", async () => {
    await expect(
      transferBetweenAccounts({
        fromAccountId: "account-1",
        toAccountId: "account-1",
        amount: 1000,
        requestedBy: "user-1",
      })
    ).rejects.toThrow("Cannot transfer to the same account");
  });

  it("should throw error for zero or negative amount", async () => {
    await expect(
      transferBetweenAccounts({
        fromAccountId: "account-1",
        toAccountId: "account-2",
        amount: 0,
        requestedBy: "user-1",
      })
    ).rejects.toThrow("Amount must be greater than 0");

    await expect(
      transferBetweenAccounts({
        fromAccountId: "account-1",
        toAccountId: "account-2",
        amount: -100,
        requestedBy: "user-1",
      })
    ).rejects.toThrow("Amount must be greater than 0");
  });

  it("should throw error for insufficient balance", async () => {
    vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
      return callback({
        pettyCashAccount: {
          findUnique: vi.fn().mockResolvedValue({
            ...mockFromAccount,
            balance: 500, // Less than transfer amount
          }),
        },
        pettyCashTransaction: { create: vi.fn() },
      });
    });

    await expect(
      transferBetweenAccounts({
        fromAccountId: "account-1",
        toAccountId: "account-2",
        amount: 1000,
        requestedBy: "user-1",
      })
    ).rejects.toThrow("Insufficient balance");
  });

  it("should throw error if source account not found", async () => {
    vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
      return callback({
        pettyCashAccount: {
          findUnique: vi.fn().mockResolvedValue(null),
        },
        pettyCashTransaction: { create: vi.fn() },
      });
    });

    await expect(
      transferBetweenAccounts({
        fromAccountId: "non-existent",
        toAccountId: "account-2",
        amount: 1000,
        requestedBy: "user-1",
      })
    ).rejects.toThrow("Source account not found");
  });
});

// ============================================
// User Lookup Functions Tests
// ============================================

describe("getAllUsersForPettyCash", () => {
  it("should return all users with petty cash account info", async () => {
    const mockUsers = [
      { id: "user-1", name: "User A", email: "a@example.com", image: null, pettyCashAccount: { id: "account-1" } },
      { id: "user-2", name: "User B", email: "b@example.com", image: null, pettyCashAccount: null },
    ];

    vi.mocked(prisma.user.findMany).mockResolvedValue(mockUsers);

    const result = await getAllUsersForPettyCash();

    expect(prisma.user.findMany).toHaveBeenCalledWith({
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        pettyCashAccount: {
          select: {
            id: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });
    expect(result).toHaveLength(2);
    expect(result[0].pettyCashAccount).toBeDefined();
    expect(result[1].pettyCashAccount).toBeNull();
  });
});
