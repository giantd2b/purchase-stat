import { authPrisma } from "@/lib/auth-db";
import type { ActivityAction, Prisma } from "@prisma/client";
import { headers } from "next/headers";

interface LogActivityParams {
  action: ActivityAction;
  userId?: string | null;
  userName?: string | null;
  userEmail?: string | null;
  targetId?: string | null;
  targetType?: string | null;
  description?: string | null;
  metadata?: Record<string, unknown> | null;
}

/**
 * Log an activity to the database
 */
export async function logActivity(params: LogActivityParams): Promise<void> {
  const {
    action,
    userId,
    userName,
    userEmail,
    targetId,
    targetType,
    description,
    metadata,
  } = params;

  // Get IP and user agent from headers (if available)
  let ipAddress: string | null = null;
  let userAgent: string | null = null;

  try {
    const headersList = await headers();
    ipAddress =
      headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      headersList.get("x-real-ip") ||
      null;
    userAgent = headersList.get("user-agent") || null;
  } catch {
    // Headers might not be available in some contexts
  }

  try {
    await authPrisma.activityLog.create({
      data: {
        action,
        userId,
        userName,
        userEmail,
        targetId,
        targetType,
        description,
        metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : undefined,
        ipAddress,
        userAgent,
      },
    });
  } catch (error) {
    // Don't let logging failures break the main operation
    console.error("Failed to log activity:", error);
  }
}

/**
 * Helper to log activity from a session
 */
export async function logActivityFromSession(
  session: { user?: { id?: string; name?: string | null; email?: string | null } } | null,
  params: Omit<LogActivityParams, "userId" | "userName" | "userEmail">
): Promise<void> {
  await logActivity({
    ...params,
    userId: session?.user?.id || null,
    userName: session?.user?.name || null,
    userEmail: session?.user?.email || null,
  });
}

/**
 * Get activity logs with pagination and filters
 */
export async function getActivityLogs(options: {
  page?: number;
  limit?: number;
  userId?: string;
  action?: ActivityAction;
  targetType?: string;
  startDate?: Date;
  endDate?: Date;
}) {
  const {
    page = 1,
    limit = 50,
    userId,
    action,
    targetType,
    startDate,
    endDate,
  } = options;

  const where: Prisma.ActivityLogWhereInput = {};

  if (userId) where.userId = userId;
  if (action) where.action = action;
  if (targetType) where.targetType = targetType;
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = startDate;
    if (endDate) where.createdAt.lte = endDate;
  }

  const [logs, total] = await Promise.all([
    authPrisma.activityLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    authPrisma.activityLog.count({ where }),
  ]);

  return {
    logs,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Get activity logs for a specific user
 */
export async function getUserActivityLogs(userId: string, limit = 20) {
  return authPrisma.activityLog.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

/**
 * Action descriptions for display
 */
export const ACTION_DESCRIPTIONS: Record<ActivityAction, string> = {
  LOGIN: "เข้าสู่ระบบ",
  LOGOUT: "ออกจากระบบ",
  USER_CREATED: "สร้างผู้ใช้ใหม่",
  USER_UPDATED: "แก้ไขข้อมูลผู้ใช้",
  USER_DELETED: "ลบผู้ใช้",
  USER_ROLE_CHANGED: "เปลี่ยนสิทธิ์ผู้ใช้",
  PETTY_CASH_WITHDRAW: "เบิกเงินสดย่อย",
  PETTY_CASH_RETURN: "คืนเงินทอน",
  PETTY_CASH_TOPUP: "เติมเงินเข้ากองทุน",
  PETTY_CASH_TRANSFER: "โอนเงินสดย่อย",
  PETTY_CASH_APPROVED: "อนุมัติเงินสดย่อย",
  PETTY_CASH_REJECTED: "ปฏิเสธเงินสดย่อย",
  PETTY_CASH_EDITED: "แก้ไขรายการเงินสดย่อย",
  PETTY_CASH_DELETED: "ลบรายการเงินสดย่อย",
  STOCK_RECEIVE: "นำเข้าสินค้า",
  STOCK_WITHDRAW: "เบิกจ่ายสินค้า",
  STOCK_ADJUST: "ปรับยอดสินค้า",
  STOCK_TRANSFER: "โอนสินค้า",
  STOCK_APPROVED: "อนุมัติรายการสต็อก",
  STOCK_REJECTED: "ปฏิเสธรายการสต็อก",
  DATA_SYNC_STARTED: "เริ่มซิงค์ข้อมูล",
  DATA_SYNC_COMPLETED: "ซิงค์ข้อมูลสำเร็จ",
  DATA_SYNC_FAILED: "ซิงค์ข้อมูลล้มเหลว",
  ITEMS_SYNC_STARTED: "เริ่มซิงค์รายการสินค้า",
  ITEMS_SYNC_COMPLETED: "ซิงค์รายการสินค้าสำเร็จ",
  ITEMS_SYNC_FAILED: "ซิงค์รายการสินค้าล้มเหลว",
  OTHER: "อื่นๆ",
};
