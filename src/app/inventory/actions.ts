"use server";

import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import {
  createTransaction,
  approveTransaction,
  rejectTransaction,
  createStockItem,
  getOrCreateStockItem,
  updateStockItem,
} from "@/lib/inventory-db";
import { logActivityFromSession } from "@/lib/activity-log";
import { StockTransactionType } from "@prisma/client";

// ============================================
// Receive Items Action
// ============================================

interface ReceiveItemInput {
  itemId: string; // The Item code (e.g., T01001)
  quantity: number;
  unitCost: number;
  batchNumber?: string;
  expiryDate?: string; // ISO date string
}

export async function receiveItemsAction(data: {
  items: ReceiveItemInput[];
  description?: string;
  reference?: string;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  if (!data.items || data.items.length === 0) {
    return { error: "ไม่มีรายการสินค้า" };
  }

  try {
    // Ensure all items exist in StockItem table
    const stockItemIds: string[] = [];
    for (const item of data.items) {
      const stockItem = await getOrCreateStockItem(item.itemId);
      stockItemIds.push(stockItem.id);
    }

    // Create the transaction
    const transaction = await createTransaction({
      type: StockTransactionType.RECEIVE,
      items: data.items.map((item, index) => ({
        stockItemId: stockItemIds[index],
        quantity: item.quantity,
        unitCost: item.unitCost,
        batchNumber: item.batchNumber,
        expiryDate: item.expiryDate ? new Date(item.expiryDate) : undefined,
      })),
      description: data.description,
      reference: data.reference,
      requestedBy: session.user.id,
    });

    await logActivityFromSession(session, {
      action: "STOCK_RECEIVE",
      targetId: transaction.id,
      targetType: "StockTransaction",
      description: `นำเข้าสินค้า ${data.items.length} รายการ`,
      metadata: { transactionNumber: transaction.transactionNumber, itemCount: data.items.length, reference: data.reference },
    });

    revalidatePath("/inventory");
    revalidatePath("/inventory/transactions");

    return { success: true, transactionId: transaction.id };
  } catch (error) {
    console.error("Error receiving items:", error);
    return { error: "เกิดข้อผิดพลาดในการนำเข้าสินค้า" };
  }
}

// ============================================
// Withdraw Items Action
// ============================================

interface WithdrawItemInput {
  stockItemId: string;
  quantity: number;
  purpose?: string;
}

export async function withdrawItemsAction(data: {
  items: WithdrawItemInput[];
  description?: string;
  reference?: string;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  if (!data.items || data.items.length === 0) {
    return { error: "ไม่มีรายการสินค้า" };
  }

  try {
    const transaction = await createTransaction({
      type: StockTransactionType.WITHDRAW,
      items: data.items.map((item) => ({
        stockItemId: item.stockItemId,
        quantity: item.quantity,
        purpose: item.purpose,
      })),
      description: data.description,
      reference: data.reference,
      requestedBy: session.user.id,
    });

    await logActivityFromSession(session, {
      action: "STOCK_WITHDRAW",
      targetId: transaction.id,
      targetType: "StockTransaction",
      description: `เบิกจ่ายสินค้า ${data.items.length} รายการ`,
      metadata: { transactionNumber: transaction.transactionNumber, itemCount: data.items.length, reference: data.reference },
    });

    revalidatePath("/inventory");
    revalidatePath("/inventory/transactions");
    revalidatePath("/inventory/approvals");

    return { success: true, transactionId: transaction.id };
  } catch (error) {
    console.error("Error withdrawing items:", error);
    return { error: "เกิดข้อผิดพลาดในการเบิกจ่ายสินค้า" };
  }
}

// ============================================
// Approve Transaction Action
// ============================================

export async function approveTransactionAction(transactionId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  if (session.user.role !== "ADMIN") {
    return { error: "ไม่มีสิทธิ์อนุมัติ" };
  }

  try {
    const tx = await approveTransaction(transactionId, session.user.id);

    await logActivityFromSession(session, {
      action: "STOCK_APPROVED",
      targetId: transactionId,
      targetType: "StockTransaction",
      description: `อนุมัติรายการสต็อก ${tx.transactionNumber}`,
      metadata: { transactionNumber: tx.transactionNumber, type: tx.type },
    });

    revalidatePath("/inventory");
    revalidatePath("/inventory/transactions");
    revalidatePath("/inventory/approvals");

    return { success: true };
  } catch (error) {
    console.error("Error approving transaction:", error);
    return { error: "เกิดข้อผิดพลาดในการอนุมัติ" };
  }
}

// ============================================
// Reject Transaction Action
// ============================================

export async function rejectTransactionAction(
  transactionId: string,
  reason?: string
) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  if (session.user.role !== "ADMIN") {
    return { error: "ไม่มีสิทธิ์ปฏิเสธ" };
  }

  try {
    const tx = await rejectTransaction(transactionId, reason);

    await logActivityFromSession(session, {
      action: "STOCK_REJECTED",
      targetId: transactionId,
      targetType: "StockTransaction",
      description: `ปฏิเสธรายการสต็อก ${tx.transactionNumber}`,
      metadata: { transactionNumber: tx.transactionNumber, type: tx.type, reason },
    });

    revalidatePath("/inventory");
    revalidatePath("/inventory/transactions");
    revalidatePath("/inventory/approvals");

    return { success: true };
  } catch (error) {
    console.error("Error rejecting transaction:", error);
    return { error: "เกิดข้อผิดพลาดในการปฏิเสธ" };
  }
}

// ============================================
// Add Item to Stock Action
// ============================================

export async function addItemToStockAction(data: {
  itemId: string;
  minQuantity?: number;
  maxQuantity?: number;
  location?: string;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  try {
    const stockItem = await createStockItem({
      itemId: data.itemId,
      minQuantity: data.minQuantity,
      maxQuantity: data.maxQuantity,
      location: data.location,
    });

    revalidatePath("/inventory");
    revalidatePath("/inventory/items");

    return { success: true, stockItemId: stockItem.id };
  } catch (error) {
    console.error("Error adding item to stock:", error);
    return { error: "เกิดข้อผิดพลาดในการเพิ่มสินค้า" };
  }
}

// ============================================
// Update Stock Item Action
// ============================================

export async function updateStockItemAction(
  stockItemId: string,
  data: {
    minQuantity?: number | null;
    maxQuantity?: number | null;
    location?: string | null;
    isActive?: boolean;
  }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  try {
    await updateStockItem(stockItemId, data);

    revalidatePath("/inventory");
    revalidatePath("/inventory/items");

    return { success: true };
  } catch (error) {
    console.error("Error updating stock item:", error);
    return { error: "เกิดข้อผิดพลาดในการแก้ไขข้อมูล" };
  }
}

// ============================================
// Adjust Stock Action
// ============================================

interface AdjustStockInput {
  stockItemId: string;
  quantity: number;
  isIncrease: boolean;
  reason: string;
}

export async function adjustStockAction(data: AdjustStockInput) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  try {
    const transaction = await createTransaction({
      type: data.isIncrease
        ? StockTransactionType.ADJUST_IN
        : StockTransactionType.ADJUST_OUT,
      items: [
        {
          stockItemId: data.stockItemId,
          quantity: data.quantity,
        },
      ],
      description: data.reason,
      requestedBy: session.user.id,
    });

    await logActivityFromSession(session, {
      action: "STOCK_ADJUST",
      targetId: transaction.id,
      targetType: "StockTransaction",
      description: `ปรับยอดสินค้า ${data.isIncrease ? "เพิ่ม" : "ลด"} ${data.quantity} หน่วย`,
      metadata: {
        transactionNumber: transaction.transactionNumber,
        stockItemId: data.stockItemId,
        quantity: data.quantity,
        isIncrease: data.isIncrease,
        reason: data.reason,
      },
    });

    revalidatePath("/inventory");
    revalidatePath("/inventory/transactions");
    revalidatePath("/inventory/approvals");

    return { success: true, transactionId: transaction.id };
  } catch (error) {
    console.error("Error adjusting stock:", error);
    return { error: "เกิดข้อผิดพลาดในการปรับยอด" };
  }
}
