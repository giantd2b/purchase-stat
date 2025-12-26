"use server";

import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import {
  upsertTransactionOverride,
  deleteTransactionOverride,
  createManualTransaction,
  updateManualTransaction,
  deleteManualTransaction,
  type ManualTransactionInput,
} from "@/lib/transactions-db";

// Update transaction override (actual price)
export async function updateTransactionOverrideAction(
  transactionId: number,
  actualPrice: number | null,
  reason?: string
) {
  const session = await auth();
  const userId = session?.user?.id || "test-user";

  try {
    if (actualPrice !== null && actualPrice >= 0) {
      await upsertTransactionOverride(transactionId, actualPrice, userId, reason);
    } else {
      await deleteTransactionOverride(transactionId);
    }

    revalidatePath("/transactions");
    return { success: true };
  } catch (error) {
    console.error("Failed to update transaction override:", error);
    return { error: "Failed to update price" };
  }
}

// Create manual transaction
export async function createManualTransactionAction(data: {
  date: string;
  reference?: string;
  vendor?: string;
  productName?: string;
  totalPrice: number;
  payment?: string;
  minorGroup?: string;
  note?: string;
}) {
  const session = await auth();
  const userId = session?.user?.id || "test-user";

  try {
    const input: ManualTransactionInput = {
      date: new Date(data.date),
      reference: data.reference,
      vendor: data.vendor,
      productName: data.productName,
      totalPrice: data.totalPrice,
      payment: data.payment,
      minorGroup: data.minorGroup,
      note: data.note,
    };

    const id = await createManualTransaction(input, userId);

    revalidatePath("/transactions");
    return { success: true, id };
  } catch (error) {
    console.error("Failed to create manual transaction:", error);
    return { error: "Failed to create transaction" };
  }
}

// Update manual transaction
export async function updateManualTransactionAction(
  id: number,
  data: {
    date?: string;
    reference?: string;
    vendor?: string;
    productName?: string;
    totalPrice?: number;
    payment?: string;
    minorGroup?: string;
    note?: string;
  }
) {
  try {
    const input: Partial<ManualTransactionInput> = {};
    if (data.date) input.date = new Date(data.date);
    if (data.reference !== undefined) input.reference = data.reference;
    if (data.vendor !== undefined) input.vendor = data.vendor;
    if (data.productName !== undefined) input.productName = data.productName;
    if (data.totalPrice !== undefined) input.totalPrice = data.totalPrice;
    if (data.payment !== undefined) input.payment = data.payment;
    if (data.minorGroup !== undefined) input.minorGroup = data.minorGroup;
    if (data.note !== undefined) input.note = data.note;

    await updateManualTransaction(id, input);

    revalidatePath("/transactions");
    return { success: true };
  } catch (error) {
    console.error("Failed to update manual transaction:", error);
    return { error: "Failed to update transaction" };
  }
}

// Delete manual transaction
export async function deleteManualTransactionAction(id: number) {
  try {
    await deleteManualTransaction(id);

    revalidatePath("/transactions");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete manual transaction:", error);
    return { error: "Failed to delete transaction" };
  }
}
