import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { authPrisma } from "@/lib/auth-db";
import { UserManagementClient } from "@/components/UserManagementClient";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Activity } from "lucide-react";
import Link from "next/link";
import { UserNav } from "@/components/UserNav";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const session = await auth();

  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/");
  }

  const users = await authPrisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
      createdAt: true,
    },
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  User Management
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Manage user roles and permissions
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/admin/activity-logs">
                <Button variant="outline" size="sm">
                  <Activity className="h-4 w-4 mr-2" />
                  Activity Logs
                </Button>
              </Link>
              <UserNav />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <UserManagementClient users={users} currentUserId={session.user.id} />
      </main>
    </div>
  );
}
