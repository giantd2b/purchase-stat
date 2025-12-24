"use server";

import { auth } from "@/lib/auth";
import { authPrisma } from "@/lib/auth-db";
import { logActivityFromSession } from "@/lib/activity-log";
import { revalidatePath } from "next/cache";
import type { UserRole } from "@prisma/client";

export async function updateUserRole(userId: string, newRole: UserRole) {
  const session = await auth();

  // Verify admin access
  if (!session?.user || session.user.role !== "ADMIN") {
    return { success: false, error: "Unauthorized" };
  }

  // Prevent self-demotion
  if (userId === session.user.id && newRole !== "ADMIN") {
    return { success: false, error: "Cannot change your own role" };
  }

  try {
    // Get current user info for logging
    const targetUser = await authPrisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true, role: true },
    });

    const oldRole = targetUser?.role;

    await authPrisma.user.update({
      where: { id: userId },
      data: { role: newRole },
    });

    // Log the activity
    await logActivityFromSession(session, {
      action: "USER_ROLE_CHANGED",
      targetId: userId,
      targetType: "User",
      description: `เปลี่ยนสิทธิ์ของ ${targetUser?.name || targetUser?.email} จาก ${oldRole} เป็น ${newRole}`,
      metadata: {
        targetUserName: targetUser?.name,
        targetUserEmail: targetUser?.email,
        oldRole,
        newRole,
      },
    });

    revalidatePath("/admin/users");
    return { success: true };
  } catch (error) {
    console.error("Failed to update user role:", error);
    return { success: false, error: "Failed to update user role" };
  }
}

export async function deleteUser(userId: string) {
  const session = await auth();

  // Verify admin access
  if (!session?.user || session.user.role !== "ADMIN") {
    return { success: false, error: "Unauthorized" };
  }

  // Prevent self-deletion
  if (userId === session.user.id) {
    return { success: false, error: "Cannot delete your own account" };
  }

  try {
    // Get user info for logging before deletion
    const targetUser = await authPrisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true, role: true },
    });

    await authPrisma.user.delete({
      where: { id: userId },
    });

    // Log the activity
    await logActivityFromSession(session, {
      action: "USER_DELETED",
      targetId: userId,
      targetType: "User",
      description: `ลบผู้ใช้ ${targetUser?.name || targetUser?.email}`,
      metadata: {
        deletedUserName: targetUser?.name,
        deletedUserEmail: targetUser?.email,
        deletedUserRole: targetUser?.role,
      },
    });

    revalidatePath("/admin/users");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete user:", error);
    return { success: false, error: "Failed to delete user" };
  }
}
