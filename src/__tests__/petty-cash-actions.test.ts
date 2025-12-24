import { describe, it, expect, vi, beforeEach } from "vitest";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import {
  createTransaction,
  approveTransaction,
  rejectTransaction,
  createPettyCashAccount,
  transferBetweenAccounts,
  editTransaction,
} from "@/lib/petty-cash-db";

// Mock the actual actions by importing them after mocks are set up
vi.mock("@/lib/petty-cash-db", () => ({
  createTransaction: vi.fn(),
  approveTransaction: vi.fn(),
  rejectTransaction: vi.fn(),
  createPettyCashAccount: vi.fn(),
  transferBetweenAccounts: vi.fn(),
  editTransaction: vi.fn(),
  getOrCreatePettyCashAccount: vi.fn(),
}));

// Import actions after mocks
import {
  createWithdrawalAction,
  createReturnAction,
  createTopupAction,
  approveTransactionAction,
  rejectTransactionAction,
  createAccountAction,
  transferAction,
  createBulkWithdrawalAction,
  editTransactionAction,
} from "@/app/petty-cash/actions";

// Mock session data
const mockUserSession = {
  user: {
    id: "user-1",
    name: "Test User",
    email: "test@example.com",
    role: "USER",
  },
};

const mockAdminSession = {
  user: {
    id: "admin-1",
    name: "Admin User",
    email: "admin@example.com",
    role: "ADMIN",
  },
};

const mockTransaction = {
  id: "tx-1",
  accountId: "account-1",
  type: "WITHDRAW",
  amount: 1000,
  status: "PENDING",
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ============================================
// createWithdrawalAction Tests
// ============================================

describe("createWithdrawalAction", () => {
  it("should create withdrawal for authenticated user", async () => {
    vi.mocked(auth).mockResolvedValue(mockUserSession as any);
    vi.mocked(createTransaction).mockResolvedValue(mockTransaction as any);

    const formData = new FormData();
    formData.set("accountId", "account-1");
    formData.set("amount", "1000");
    formData.set("description", "Test withdrawal");
    formData.set("reference", "REF-001");

    const result = await createWithdrawalAction(formData);

    expect(result.success).toBe(true);
    expect(createTransaction).toHaveBeenCalledWith({
      accountId: "account-1",
      type: "WITHDRAW",
      amount: 1000,
      description: "Test withdrawal",
      reference: "REF-001",
      requestedBy: "user-1",
      attachmentUrl: undefined,
      attachmentName: undefined,
    });
    expect(revalidatePath).toHaveBeenCalledWith("/petty-cash");
  });

  it("should return error for unauthenticated user", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const formData = new FormData();
    formData.set("accountId", "account-1");
    formData.set("amount", "1000");

    const result = await createWithdrawalAction(formData);

    expect(result.error).toBe("Unauthorized");
    expect(createTransaction).not.toHaveBeenCalled();
  });

  it("should return error for invalid amount", async () => {
    vi.mocked(auth).mockResolvedValue(mockUserSession as any);

    const formData = new FormData();
    formData.set("accountId", "account-1");
    formData.set("amount", "0");

    const result = await createWithdrawalAction(formData);

    expect(result.error).toBe("Invalid input");
  });

  it("should return error for missing accountId", async () => {
    vi.mocked(auth).mockResolvedValue(mockUserSession as any);

    const formData = new FormData();
    formData.set("amount", "1000");

    const result = await createWithdrawalAction(formData);

    expect(result.error).toBe("Invalid input");
  });

  it("should handle attachment data", async () => {
    vi.mocked(auth).mockResolvedValue(mockUserSession as any);
    vi.mocked(createTransaction).mockResolvedValue(mockTransaction as any);

    const formData = new FormData();
    formData.set("accountId", "account-1");
    formData.set("amount", "1000");
    formData.set("attachmentUrl", "https://example.com/file.pdf");
    formData.set("attachmentName", "receipt.pdf");

    await createWithdrawalAction(formData);

    expect(createTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        attachmentUrl: "https://example.com/file.pdf",
        attachmentName: "receipt.pdf",
      })
    );
  });

  it("should handle database errors", async () => {
    vi.mocked(auth).mockResolvedValue(mockUserSession as any);
    vi.mocked(createTransaction).mockRejectedValue(new Error("DB Error"));

    const formData = new FormData();
    formData.set("accountId", "account-1");
    formData.set("amount", "1000");

    const result = await createWithdrawalAction(formData);

    expect(result.error).toBe("Failed to create withdrawal");
  });
});

// ============================================
// createReturnAction Tests
// ============================================

describe("createReturnAction", () => {
  it("should create return for authenticated user", async () => {
    vi.mocked(auth).mockResolvedValue(mockUserSession as any);
    vi.mocked(createTransaction).mockResolvedValue({
      ...mockTransaction,
      type: "RETURN",
      status: "APPROVED",
    } as any);

    const formData = new FormData();
    formData.set("accountId", "account-1");
    formData.set("amount", "500");
    formData.set("description", "Return change");

    const result = await createReturnAction(formData);

    expect(result.success).toBe(true);
    expect(createTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "RETURN",
        amount: 500,
      })
    );
  });

  it("should return error for unauthenticated user", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const formData = new FormData();
    formData.set("accountId", "account-1");
    formData.set("amount", "500");

    const result = await createReturnAction(formData);

    expect(result.error).toBe("Unauthorized");
  });

  it("should return error for negative amount", async () => {
    vi.mocked(auth).mockResolvedValue(mockUserSession as any);

    const formData = new FormData();
    formData.set("accountId", "account-1");
    formData.set("amount", "-100");

    const result = await createReturnAction(formData);

    expect(result.error).toBe("Invalid input");
  });
});

// ============================================
// createTopupAction Tests
// ============================================

describe("createTopupAction", () => {
  it("should create topup for admin user", async () => {
    vi.mocked(auth).mockResolvedValue(mockAdminSession as any);
    vi.mocked(createTransaction).mockResolvedValue({
      ...mockTransaction,
      type: "TOPUP",
      status: "APPROVED",
    } as any);

    const formData = new FormData();
    formData.set("accountId", "account-1");
    formData.set("amount", "10000");
    formData.set("description", "Monthly topup");

    const result = await createTopupAction(formData);

    expect(result.success).toBe(true);
    expect(createTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "TOPUP",
        amount: 10000,
      })
    );
  });

  it("should return error for non-admin user", async () => {
    vi.mocked(auth).mockResolvedValue(mockUserSession as any);

    const formData = new FormData();
    formData.set("accountId", "account-1");
    formData.set("amount", "10000");

    const result = await createTopupAction(formData);

    expect(result.error).toBe("Unauthorized - Admin only");
    expect(createTransaction).not.toHaveBeenCalled();
  });

  it("should return error for unauthenticated user", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const formData = new FormData();
    formData.set("accountId", "account-1");
    formData.set("amount", "10000");

    const result = await createTopupAction(formData);

    expect(result.error).toBe("Unauthorized - Admin only");
  });
});

// ============================================
// approveTransactionAction Tests
// ============================================

describe("approveTransactionAction", () => {
  it("should approve transaction for admin", async () => {
    vi.mocked(auth).mockResolvedValue(mockAdminSession as any);
    vi.mocked(approveTransaction).mockResolvedValue({
      ...mockTransaction,
      status: "APPROVED",
    } as any);

    const result = await approveTransactionAction("tx-1");

    expect(result.success).toBe(true);
    expect(approveTransaction).toHaveBeenCalledWith("tx-1", "admin-1");
    expect(revalidatePath).toHaveBeenCalledWith("/petty-cash");
  });

  it("should return error for non-admin user", async () => {
    vi.mocked(auth).mockResolvedValue(mockUserSession as any);

    const result = await approveTransactionAction("tx-1");

    expect(result.error).toBe("Unauthorized - Admin only");
    expect(approveTransaction).not.toHaveBeenCalled();
  });

  it("should handle database errors", async () => {
    vi.mocked(auth).mockResolvedValue(mockAdminSession as any);
    vi.mocked(approveTransaction).mockRejectedValue(new Error("Transaction not found"));

    const result = await approveTransactionAction("tx-1");

    expect(result.error).toBe("Failed to approve transaction");
  });
});

// ============================================
// rejectTransactionAction Tests
// ============================================

describe("rejectTransactionAction", () => {
  it("should reject transaction for admin with reason", async () => {
    vi.mocked(auth).mockResolvedValue(mockAdminSession as any);
    vi.mocked(rejectTransaction).mockResolvedValue({
      ...mockTransaction,
      status: "REJECTED",
      rejectReason: "Invalid receipt",
    } as any);

    const result = await rejectTransactionAction("tx-1", "Invalid receipt");

    expect(result.success).toBe(true);
    expect(rejectTransaction).toHaveBeenCalledWith("tx-1", "Invalid receipt");
  });

  it("should reject transaction without reason", async () => {
    vi.mocked(auth).mockResolvedValue(mockAdminSession as any);
    vi.mocked(rejectTransaction).mockResolvedValue({
      ...mockTransaction,
      status: "REJECTED",
    } as any);

    const result = await rejectTransactionAction("tx-1");

    expect(result.success).toBe(true);
    expect(rejectTransaction).toHaveBeenCalledWith("tx-1", undefined);
  });

  it("should return error for non-admin user", async () => {
    vi.mocked(auth).mockResolvedValue(mockUserSession as any);

    const result = await rejectTransactionAction("tx-1");

    expect(result.error).toBe("Unauthorized - Admin only");
  });
});

// ============================================
// createAccountAction Tests
// ============================================

describe("createAccountAction", () => {
  it("should create account for admin", async () => {
    vi.mocked(auth).mockResolvedValue(mockAdminSession as any);
    vi.mocked(createPettyCashAccount).mockResolvedValue({
      id: "account-1",
      userId: "user-1",
      balance: 5000,
    } as any);

    const result = await createAccountAction("user-1", 5000);

    expect(result.success).toBe(true);
    expect(createPettyCashAccount).toHaveBeenCalledWith("user-1", 5000);
    expect(revalidatePath).toHaveBeenCalledWith("/petty-cash");
  });

  it("should create account with default balance 0", async () => {
    vi.mocked(auth).mockResolvedValue(mockAdminSession as any);
    vi.mocked(createPettyCashAccount).mockResolvedValue({
      id: "account-1",
      userId: "user-1",
      balance: 0,
    } as any);

    const result = await createAccountAction("user-1");

    expect(result.success).toBe(true);
    expect(createPettyCashAccount).toHaveBeenCalledWith("user-1", 0);
  });

  it("should return error for non-admin user", async () => {
    vi.mocked(auth).mockResolvedValue(mockUserSession as any);

    const result = await createAccountAction("user-1");

    expect(result.error).toBe("Unauthorized - Admin only");
  });
});

// ============================================
// transferAction Tests
// ============================================

describe("transferAction", () => {
  it("should transfer between accounts for admin", async () => {
    vi.mocked(auth).mockResolvedValue(mockAdminSession as any);
    vi.mocked(transferBetweenAccounts).mockResolvedValue({
      outTransaction: { id: "tx-out" } as any,
      inTransaction: { id: "tx-in" } as any,
    });

    const formData = new FormData();
    formData.set("fromAccountId", "account-1");
    formData.set("toAccountId", "account-2");
    formData.set("amount", "1000");
    formData.set("description", "Transfer to account 2");

    const result = await transferAction(formData);

    expect(result.success).toBe(true);
    expect(transferBetweenAccounts).toHaveBeenCalledWith({
      fromAccountId: "account-1",
      toAccountId: "account-2",
      amount: 1000,
      description: "Transfer to account 2",
      requestedBy: "admin-1",
    });
  });

  it("should return error for same account transfer", async () => {
    vi.mocked(auth).mockResolvedValue(mockAdminSession as any);

    const formData = new FormData();
    formData.set("fromAccountId", "account-1");
    formData.set("toAccountId", "account-1");
    formData.set("amount", "1000");

    const result = await transferAction(formData);

    expect(result.error).toBe("Cannot transfer to the same account");
  });

  it("should return error for non-admin user", async () => {
    vi.mocked(auth).mockResolvedValue(mockUserSession as any);

    const formData = new FormData();
    formData.set("fromAccountId", "account-1");
    formData.set("toAccountId", "account-2");
    formData.set("amount", "1000");

    const result = await transferAction(formData);

    expect(result.error).toBe("Unauthorized - Admin only");
  });

  it("should return error for invalid amount", async () => {
    vi.mocked(auth).mockResolvedValue(mockAdminSession as any);

    const formData = new FormData();
    formData.set("fromAccountId", "account-1");
    formData.set("toAccountId", "account-2");
    formData.set("amount", "0");

    const result = await transferAction(formData);

    expect(result.error).toBe("Invalid input");
  });

  it("should handle insufficient balance error", async () => {
    vi.mocked(auth).mockResolvedValue(mockAdminSession as any);
    vi.mocked(transferBetweenAccounts).mockRejectedValue(new Error("Insufficient balance"));

    const formData = new FormData();
    formData.set("fromAccountId", "account-1");
    formData.set("toAccountId", "account-2");
    formData.set("amount", "100000");

    const result = await transferAction(formData);

    expect(result.error).toBe("Insufficient balance");
  });
});

// ============================================
// createBulkWithdrawalAction Tests
// ============================================

describe("createBulkWithdrawalAction", () => {
  it("should create multiple transactions", async () => {
    vi.mocked(auth).mockResolvedValue(mockUserSession as any);
    vi.mocked(createTransaction).mockResolvedValue(mockTransaction as any);

    const items = [
      { amount: 500, description: "Item 1" },
      { amount: 300, description: "Item 2" },
      { amount: 200, description: "Item 3" },
    ];

    const result = await createBulkWithdrawalAction("account-1", items);

    expect(result.success).toBe(true);
    expect(result.count).toBe(3);
    expect(createTransaction).toHaveBeenCalledTimes(3);
  });

  it("should skip items with zero or negative amount", async () => {
    vi.mocked(auth).mockResolvedValue(mockUserSession as any);
    vi.mocked(createTransaction).mockResolvedValue(mockTransaction as any);

    const items = [
      { amount: 500, description: "Valid" },
      { amount: 0, description: "Zero" },
      { amount: -100, description: "Negative" },
    ];

    const result = await createBulkWithdrawalAction("account-1", items);

    expect(result.success).toBe(true);
    expect(result.count).toBe(1);
    expect(createTransaction).toHaveBeenCalledTimes(1);
  });

  it("should attach file info to all items", async () => {
    vi.mocked(auth).mockResolvedValue(mockUserSession as any);
    vi.mocked(createTransaction).mockResolvedValue(mockTransaction as any);

    const items = [{ amount: 500 }, { amount: 300 }];

    await createBulkWithdrawalAction(
      "account-1",
      items,
      "https://example.com/receipt.pdf",
      "receipt.pdf"
    );

    expect(createTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        attachmentUrl: "https://example.com/receipt.pdf",
        attachmentName: "receipt.pdf",
      })
    );
  });

  it("should return error for unauthenticated user", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const result = await createBulkWithdrawalAction("account-1", [{ amount: 500 }]);

    expect(result.error).toBe("Unauthorized");
  });

  it("should return error for empty items array", async () => {
    vi.mocked(auth).mockResolvedValue(mockUserSession as any);

    const result = await createBulkWithdrawalAction("account-1", []);

    expect(result.error).toBe("Invalid input");
  });
});

// ============================================
// editTransactionAction Tests
// ============================================

describe("editTransactionAction", () => {
  it("should edit transaction for authenticated user", async () => {
    vi.mocked(auth).mockResolvedValue(mockUserSession as any);
    vi.mocked(editTransaction).mockResolvedValue({
      ...mockTransaction,
      amount: 1500,
      status: "PENDING",
    } as any);

    const result = await editTransactionAction({
      transactionId: "tx-1",
      amount: 1500,
      description: "Updated",
    });

    expect(result.success).toBe(true);
    expect(editTransaction).toHaveBeenCalledWith({
      transactionId: "tx-1",
      amount: 1500,
      description: "Updated",
      editedBy: "user-1",
    });
    expect(revalidatePath).toHaveBeenCalledWith("/petty-cash");
    expect(revalidatePath).toHaveBeenCalledWith("/petty-cash/approvals");
  });

  it("should return wasApproved flag when editing approved transaction", async () => {
    vi.mocked(auth).mockResolvedValue(mockUserSession as any);
    vi.mocked(editTransaction).mockResolvedValue({
      ...mockTransaction,
      status: "PENDING", // Reset to pending after edit
    } as any);

    const result = await editTransactionAction({
      transactionId: "tx-1",
      amount: 1500,
    });

    expect(result.wasApproved).toBe(true);
  });

  it("should return error for unauthenticated user", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const result = await editTransactionAction({
      transactionId: "tx-1",
      amount: 1500,
    });

    expect(result.error).toBe("Unauthorized");
  });

  it("should return error for missing transactionId", async () => {
    vi.mocked(auth).mockResolvedValue(mockUserSession as any);

    const result = await editTransactionAction({
      transactionId: "",
      amount: 1500,
    });

    expect(result.error).toBe("Invalid input");
  });

  it("should return error for invalid amount", async () => {
    vi.mocked(auth).mockResolvedValue(mockUserSession as any);

    const result = await editTransactionAction({
      transactionId: "tx-1",
      amount: 0,
    });

    expect(result.error).toBe("Invalid input");

    const result2 = await editTransactionAction({
      transactionId: "tx-1",
      amount: -100,
    });

    expect(result2.error).toBe("Invalid input");
  });

  it("should handle transaction not found error", async () => {
    vi.mocked(auth).mockResolvedValue(mockUserSession as any);
    vi.mocked(editTransaction).mockRejectedValue(new Error("Transaction not found"));

    const result = await editTransactionAction({
      transactionId: "non-existent",
      amount: 1500,
    });

    expect(result.error).toBe("Transaction not found");
  });
});
