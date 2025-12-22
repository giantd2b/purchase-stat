"use server";

import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import {
  createTransaction,
  approveTransaction,
  rejectTransaction,
  getOrCreatePettyCashAccount,
  createPettyCashAccount,
} from "@/lib/petty-cash-db";
import { PettyCashType } from "@prisma/client";

export async function createWithdrawalAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  const accountId = formData.get("accountId") as string;
  const amount = parseFloat(formData.get("amount") as string);
  const description = formData.get("description") as string;
  const reference = formData.get("reference") as string;

  if (!accountId || !amount || amount <= 0) {
    return { error: "Invalid input" };
  }

  try {
    await createTransaction({
      accountId,
      type: PettyCashType.WITHDRAW,
      amount,
      description: description || undefined,
      reference: reference || undefined,
      requestedBy: session.user.id,
    });

    revalidatePath("/petty-cash");
    return { success: true };
  } catch (error) {
    console.error("Failed to create withdrawal:", error);
    return { error: "Failed to create withdrawal" };
  }
}

export async function createReturnAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  const accountId = formData.get("accountId") as string;
  const amount = parseFloat(formData.get("amount") as string);
  const description = formData.get("description") as string;
  const reference = formData.get("reference") as string;

  if (!accountId || !amount || amount <= 0) {
    return { error: "Invalid input" };
  }

  try {
    await createTransaction({
      accountId,
      type: PettyCashType.RETURN,
      amount,
      description: description || undefined,
      reference: reference || undefined,
      requestedBy: session.user.id,
    });

    revalidatePath("/petty-cash");
    return { success: true };
  } catch (error) {
    console.error("Failed to create return:", error);
    return { error: "Failed to create return" };
  }
}

export async function createTopupAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return { error: "Unauthorized - Admin only" };
  }

  const accountId = formData.get("accountId") as string;
  const amount = parseFloat(formData.get("amount") as string);
  const description = formData.get("description") as string;
  const reference = formData.get("reference") as string;

  if (!accountId || !amount || amount <= 0) {
    return { error: "Invalid input" };
  }

  try {
    await createTransaction({
      accountId,
      type: PettyCashType.TOPUP,
      amount,
      description: description || undefined,
      reference: reference || undefined,
      requestedBy: session.user.id,
    });

    revalidatePath("/petty-cash");
    return { success: true };
  } catch (error) {
    console.error("Failed to create topup:", error);
    return { error: "Failed to create topup" };
  }
}

export async function approveTransactionAction(transactionId: string) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return { error: "Unauthorized - Admin only" };
  }

  try {
    await approveTransaction(transactionId, session.user.id);
    revalidatePath("/petty-cash");
    return { success: true };
  } catch (error) {
    console.error("Failed to approve transaction:", error);
    return { error: "Failed to approve transaction" };
  }
}

export async function rejectTransactionAction(
  transactionId: string,
  reason?: string
) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return { error: "Unauthorized - Admin only" };
  }

  try {
    await rejectTransaction(transactionId, reason);
    revalidatePath("/petty-cash");
    return { success: true };
  } catch (error) {
    console.error("Failed to reject transaction:", error);
    return { error: "Failed to reject transaction" };
  }
}

export async function createAccountAction(userId: string, initialBalance: number = 0) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return { error: "Unauthorized - Admin only" };
  }

  try {
    await createPettyCashAccount(userId, initialBalance);
    revalidatePath("/petty-cash");
    return { success: true };
  } catch (error) {
    console.error("Failed to create account:", error);
    return { error: "Failed to create account" };
  }
}
