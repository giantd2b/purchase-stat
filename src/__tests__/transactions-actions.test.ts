import { describe, it, expect, vi, beforeEach } from "vitest";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import {
  updateTransactionOverrideAction,
  createManualTransactionAction,
  updateManualTransactionAction,
  deleteManualTransactionAction,
} from "@/app/transactions/actions";
import {
  upsertTransactionOverride,
  deleteTransactionOverride,
  createManualTransaction,
  updateManualTransaction,
  deleteManualTransaction,
} from "@/lib/transactions-db";

// Mock dependencies
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/transactions-db", () => ({
  upsertTransactionOverride: vi.fn(),
  deleteTransactionOverride: vi.fn(),
  createManualTransaction: vi.fn(),
  updateManualTransaction: vi.fn(),
  deleteManualTransaction: vi.fn(),
}));

// Mock session
const mockSession = {
  user: {
    id: "user-1",
    name: "Test User",
    email: "test@example.com",
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(auth).mockResolvedValue(mockSession as never);
});

// ============================================
// updateTransactionOverrideAction Tests
// ============================================

describe("updateTransactionOverrideAction", () => {
  it("should update transaction override with valid price", async () => {
    vi.mocked(upsertTransactionOverride).mockResolvedValue(undefined as never);

    const result = await updateTransactionOverrideAction(1, 950, "Price correction");

    expect(upsertTransactionOverride).toHaveBeenCalledWith(1, 950, "user-1", "Price correction");
    expect(revalidatePath).toHaveBeenCalledWith("/transactions");
    expect(result).toEqual({ success: true });
  });

  it("should delete override when actualPrice is null", async () => {
    vi.mocked(deleteTransactionOverride).mockResolvedValue(undefined as never);

    const result = await updateTransactionOverrideAction(1, null);

    expect(deleteTransactionOverride).toHaveBeenCalledWith(1);
    expect(revalidatePath).toHaveBeenCalledWith("/transactions");
    expect(result).toEqual({ success: true });
  });

  it("should delete override when actualPrice is negative", async () => {
    vi.mocked(deleteTransactionOverride).mockResolvedValue(undefined as never);

    const result = await updateTransactionOverrideAction(1, -100);

    expect(deleteTransactionOverride).toHaveBeenCalledWith(1);
    expect(result).toEqual({ success: true });
  });

  it("should return error on failure", async () => {
    vi.mocked(upsertTransactionOverride).mockRejectedValue(new Error("Database error"));

    const result = await updateTransactionOverrideAction(1, 950);

    expect(result).toEqual({ error: "Failed to update price" });
  });

  it("should use test-user when no session", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    vi.mocked(upsertTransactionOverride).mockResolvedValue(undefined as never);

    await updateTransactionOverrideAction(1, 950);

    expect(upsertTransactionOverride).toHaveBeenCalledWith(1, 950, "test-user", undefined);
  });
});

// ============================================
// createManualTransactionAction Tests
// ============================================

describe("createManualTransactionAction", () => {
  it("should create manual transaction with all fields", async () => {
    vi.mocked(createManualTransaction).mockResolvedValue(1);

    const data = {
      date: "2025-12-26",
      reference: "MANUAL-001",
      vendor: "Test Vendor",
      productName: "Test Product",
      totalPrice: 500,
      payment: "เงินสด",
      minorGroup: "Kitchen",
      note: "Test note",
    };

    const result = await createManualTransactionAction(data);

    expect(createManualTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        date: expect.any(Date),
        reference: "MANUAL-001",
        vendor: "Test Vendor",
        productName: "Test Product",
        totalPrice: 500,
        payment: "เงินสด",
        minorGroup: "Kitchen",
        note: "Test note",
      }),
      "user-1"
    );
    expect(revalidatePath).toHaveBeenCalledWith("/transactions");
    expect(result).toEqual({ success: true, id: 1 });
  });

  it("should create transaction with minimal fields", async () => {
    vi.mocked(createManualTransaction).mockResolvedValue(2);

    const data = {
      date: "2025-12-26",
      totalPrice: 100,
    };

    const result = await createManualTransactionAction(data);

    expect(createManualTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        date: expect.any(Date),
        totalPrice: 100,
      }),
      "user-1"
    );
    expect(result).toEqual({ success: true, id: 2 });
  });

  it("should return error on failure", async () => {
    vi.mocked(createManualTransaction).mockRejectedValue(new Error("Database error"));

    const data = {
      date: "2025-12-26",
      totalPrice: 100,
    };

    const result = await createManualTransactionAction(data);

    expect(result).toEqual({ error: "Failed to create transaction" });
  });
});

// ============================================
// updateManualTransactionAction Tests
// ============================================

describe("updateManualTransactionAction", () => {
  it("should update manual transaction with provided fields", async () => {
    vi.mocked(updateManualTransaction).mockResolvedValue(undefined);

    const data = {
      date: "2025-12-27",
      vendor: "Updated Vendor",
      totalPrice: 600,
    };

    const result = await updateManualTransactionAction(1, data);

    expect(updateManualTransaction).toHaveBeenCalledWith(
      1,
      expect.objectContaining({
        date: expect.any(Date),
        vendor: "Updated Vendor",
        totalPrice: 600,
      })
    );
    expect(revalidatePath).toHaveBeenCalledWith("/transactions");
    expect(result).toEqual({ success: true });
  });

  it("should update with partial data", async () => {
    vi.mocked(updateManualTransaction).mockResolvedValue(undefined);

    const data = {
      productName: "Updated Product",
    };

    const result = await updateManualTransactionAction(1, data);

    expect(updateManualTransaction).toHaveBeenCalledWith(
      1,
      expect.objectContaining({
        productName: "Updated Product",
      })
    );
    expect(result).toEqual({ success: true });
  });

  it("should return error on failure", async () => {
    vi.mocked(updateManualTransaction).mockRejectedValue(new Error("Database error"));

    const result = await updateManualTransactionAction(1, { vendor: "Test" });

    expect(result).toEqual({ error: "Failed to update transaction" });
  });
});

// ============================================
// deleteManualTransactionAction Tests
// ============================================

describe("deleteManualTransactionAction", () => {
  it("should delete manual transaction by id", async () => {
    vi.mocked(deleteManualTransaction).mockResolvedValue(undefined);

    const result = await deleteManualTransactionAction(1);

    expect(deleteManualTransaction).toHaveBeenCalledWith(1);
    expect(revalidatePath).toHaveBeenCalledWith("/transactions");
    expect(result).toEqual({ success: true });
  });

  it("should return error on failure", async () => {
    vi.mocked(deleteManualTransaction).mockRejectedValue(new Error("Database error"));

    const result = await deleteManualTransactionAction(1);

    expect(result).toEqual({ error: "Failed to delete transaction" });
  });
});
