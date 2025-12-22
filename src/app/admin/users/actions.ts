"use server";

import { auth } from "@/lib/auth";
import { authPrisma } from "@/lib/auth-db";
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
    await authPrisma.user.update({
      where: { id: userId },
      data: { role: newRole },
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
    await authPrisma.user.delete({
      where: { id: userId },
    });

    revalidatePath("/admin/users");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete user:", error);
    return { success: false, error: "Failed to delete user" };
  }
}
