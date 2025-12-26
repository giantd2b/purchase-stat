"use server";

import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import {
  upsertDailyBalance,
  upsertTransactionNote,
  deleteTransactionNote,
  upsertTransactionOverride,
  deleteTransactionOverride,
  createManualTransaction,
  updateManualTransaction,
  deleteManualTransaction,
  type ManualTransactionInput,
} from "@/lib/petty-cash-report-db";

export async function updateDailyBalanceAction(formData: FormData) {
  // TODO: Re-enable auth check after testing
  const session = await auth();
  const userId = session?.user?.id || "test-user";

  const dateStr = formData.get("date") as string;
  const openingBalance = parseFloat(formData.get("openingBalance") as string);
  const notes = formData.get("notes") as string;

  if (!dateStr || isNaN(openingBalance)) {
    return { error: "Invalid input" };
  }

  try {
    const date = new Date(dateStr);
    await upsertDailyBalance(
      date,
      openingBalance,
      userId,
      notes || undefined
    );

    revalidatePath("/petty-cash-report");
    return { success: true };
  } catch (error) {
    console.error("Failed to update daily balance:", error);
    return { error: "Failed to update daily balance" };
  }
}

export async function updateTransactionNoteAction(
  transactionId: number,
  note: string
) {
  // TODO: Re-enable auth check after testing
  const session = await auth();
  const userId = session?.user?.id || "test-user";

  try {
    if (note.trim()) {
      await upsertTransactionNote(transactionId, note, userId);
    } else {
      await deleteTransactionNote(transactionId);
    }

    revalidatePath("/petty-cash-report");
    return { success: true };
  } catch (error) {
    console.error("Failed to update transaction note:", error);
    return { error: "Failed to update note" };
  }
}

// Update transaction actual price (override estimate from Google Sheet)
export async function updateTransactionOverrideAction(
  transactionId: number,
  actualPrice: number | null,
  reason?: string
) {
  // TODO: Re-enable auth check after testing
  const session = await auth();
  const userId = session?.user?.id || "test-user";

  try {
    if (actualPrice !== null && actualPrice >= 0) {
      await upsertTransactionOverride(transactionId, actualPrice, userId, reason);
    } else {
      // Remove override (revert to original price)
      await deleteTransactionOverride(transactionId);
    }

    revalidatePath("/petty-cash-report");
    return { success: true };
  } catch (error) {
    console.error("Failed to update transaction override:", error);
    return { error: "Failed to update price" };
  }
}

// ============================================
// Manual Transaction Actions
// ============================================

// Create a new manual transaction
export async function createManualTransactionAction(
  data: {
    date: string;
    reference?: string;
    vendor?: string;
    productName?: string;
    totalPrice: number;
    minorGroup?: string;
    note?: string;
  }
) {
  const session = await auth();
  const userId = session?.user?.id || "test-user";

  try {
    const input: ManualTransactionInput = {
      date: new Date(data.date),
      reference: data.reference,
      vendor: data.vendor,
      productName: data.productName,
      totalPrice: data.totalPrice,
      minorGroup: data.minorGroup,
      note: data.note,
    };

    const id = await createManualTransaction(input, userId);

    revalidatePath("/petty-cash-report");
    return { success: true, id };
  } catch (error) {
    console.error("Failed to create manual transaction:", error);
    return { error: "Failed to create transaction" };
  }
}

// Update a manual transaction
export async function updateManualTransactionAction(
  id: number,
  data: {
    date?: string;
    reference?: string;
    vendor?: string;
    productName?: string;
    totalPrice?: number;
    minorGroup?: string;
    note?: string;
  }
) {
  const session = await auth();
  const userId = session?.user?.id || "test-user";

  try {
    const input: Partial<ManualTransactionInput> = {};
    if (data.date) input.date = new Date(data.date);
    if (data.reference !== undefined) input.reference = data.reference;
    if (data.vendor !== undefined) input.vendor = data.vendor;
    if (data.productName !== undefined) input.productName = data.productName;
    if (data.totalPrice !== undefined) input.totalPrice = data.totalPrice;
    if (data.minorGroup !== undefined) input.minorGroup = data.minorGroup;
    if (data.note !== undefined) input.note = data.note;

    await updateManualTransaction(id, input, userId);

    revalidatePath("/petty-cash-report");
    return { success: true };
  } catch (error) {
    console.error("Failed to update manual transaction:", error);
    return { error: "Failed to update transaction" };
  }
}

// Delete a manual transaction
export async function deleteManualTransactionAction(id: number) {
  try {
    await deleteManualTransaction(id);

    revalidatePath("/petty-cash-report");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete manual transaction:", error);
    return { error: "Failed to delete transaction" };
  }
}
