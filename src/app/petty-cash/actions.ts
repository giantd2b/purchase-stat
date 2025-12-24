"use server";

import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import {
  createTransaction,
  approveTransaction,
  rejectTransaction,
  getOrCreatePettyCashAccount,
  createPettyCashAccount,
  transferBetweenAccounts,
  editTransaction,
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
  const attachmentUrl = formData.get("attachmentUrl") as string;
  const attachmentName = formData.get("attachmentName") as string;

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
      attachmentUrl: attachmentUrl || undefined,
      attachmentName: attachmentName || undefined,
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
  const attachmentUrl = formData.get("attachmentUrl") as string;
  const attachmentName = formData.get("attachmentName") as string;

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
      attachmentUrl: attachmentUrl || undefined,
      attachmentName: attachmentName || undefined,
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
  const attachmentUrl = formData.get("attachmentUrl") as string;
  const attachmentName = formData.get("attachmentName") as string;

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
      attachmentUrl: attachmentUrl || undefined,
      attachmentName: attachmentName || undefined,
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

export async function transferAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return { error: "Unauthorized - Admin only" };
  }

  const fromAccountId = formData.get("fromAccountId") as string;
  const toAccountId = formData.get("toAccountId") as string;
  const amount = parseFloat(formData.get("amount") as string);
  const description = formData.get("description") as string;

  if (!fromAccountId || !toAccountId || !amount || amount <= 0) {
    return { error: "Invalid input" };
  }

  if (fromAccountId === toAccountId) {
    return { error: "Cannot transfer to the same account" };
  }

  try {
    await transferBetweenAccounts({
      fromAccountId,
      toAccountId,
      amount,
      description: description || undefined,
      requestedBy: session.user.id,
    });

    revalidatePath("/petty-cash");
    return { success: true };
  } catch (error) {
    console.error("Failed to transfer:", error);
    const message = error instanceof Error ? error.message : "Failed to transfer";
    return { error: message };
  }
}

interface BulkTransactionItem {
  amount: number;
  description?: string;
  reference?: string;
}

export async function createBulkWithdrawalAction(
  accountId: string,
  items: BulkTransactionItem[],
  attachmentUrl?: string,
  attachmentName?: string
) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  if (!accountId || !items || items.length === 0) {
    return { error: "Invalid input" };
  }

  try {
    const results = [];
    for (const item of items) {
      if (item.amount && item.amount > 0) {
        const tx = await createTransaction({
          accountId,
          type: PettyCashType.WITHDRAW,
          amount: item.amount,
          description: item.description || undefined,
          reference: item.reference || undefined,
          requestedBy: session.user.id,
          attachmentUrl: attachmentUrl || undefined,
          attachmentName: attachmentName || undefined,
        });
        results.push(tx);
      }
    }

    revalidatePath("/petty-cash");
    return { success: true, count: results.length };
  } catch (error) {
    console.error("Failed to create bulk withdrawal:", error);
    return { error: "Failed to create transactions" };
  }
}

export async function editTransactionAction(data: {
  transactionId: string;
  amount: number;
  description?: string;
  reference?: string;
  attachmentUrl?: string;
  attachmentName?: string;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  if (!data.transactionId || !data.amount || data.amount <= 0) {
    return { error: "Invalid input" };
  }

  try {
    const result = await editTransaction({
      ...data,
      editedBy: session.user.id,
    });

    revalidatePath("/petty-cash");
    revalidatePath("/petty-cash/approvals");
    return { success: true, wasApproved: result.status === "PENDING" };
  } catch (error) {
    console.error("Failed to edit transaction:", error);
    const message = error instanceof Error ? error.message : "Failed to edit transaction";
    return { error: message };
  }
}
