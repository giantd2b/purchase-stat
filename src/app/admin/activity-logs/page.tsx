import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getActivityLogs, ACTION_DESCRIPTIONS } from "@/lib/activity-log";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Activity, User, Clock, FileText } from "lucide-react";
import Link from "next/link";
import { UserNav } from "@/components/UserNav";
import type { ActivityAction } from "@prisma/client";

export const dynamic = "force-dynamic";

// Action category badges
function ActionBadge({ action }: { action: ActivityAction }) {
  const getActionColor = (action: ActivityAction): string => {
    if (action.startsWith("LOGIN") || action.startsWith("LOGOUT")) {
      return "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300";
    }
    if (action.startsWith("USER_")) {
      return "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300";
    }
    if (action.startsWith("PETTY_CASH_")) {
      return "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300";
    }
    if (action.startsWith("STOCK_")) {
      return "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300";
    }
    if (action.includes("SYNC")) {
      return "bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300";
    }
    return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
  };

  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getActionColor(action)}`}>
      {ACTION_DESCRIPTIONS[action] || action}
    </span>
  );
}

interface SearchParams {
  page?: string;
  action?: string;
  userId?: string;
}

export default async function ActivityLogsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await auth();

  // Only admins can view activity logs
  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/");
  }

  const params = await searchParams;
  const page = parseInt(params.page || "1", 10);
  const actionFilter = params.action as ActivityAction | undefined;
  const userIdFilter = params.userId;

  const { logs, pagination } = await getActivityLogs({
    page,
    limit: 50,
    action: actionFilter,
    userId: userIdFilter,
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/admin/users">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  Activity Logs
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  ประวัติการใช้งานระบบของผู้ใช้ทั้งหมด
                </p>
              </div>
            </div>
            <UserNav />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Total Activities
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{pagination.total.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Current Page
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{pagination.page} / {pagination.totalPages}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Per Page
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{pagination.limit}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
                <User className="h-4 w-4" />
                Showing
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{logs.length}</p>
            </CardContent>
          </Card>
        </div>

        {/* Logs Table */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead>IP Address</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        No activity logs found
                      </TableCell>
                    </TableRow>
                  ) : (
                    logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="whitespace-nowrap text-sm">
                          {new Intl.DateTimeFormat("th-TH", {
                            dateStyle: "short",
                            timeStyle: "medium",
                            timeZone: "Asia/Bangkok",
                          }).format(log.createdAt)}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium text-sm">
                              {log.userName || "System"}
                            </span>
                            <span className="text-xs text-gray-500">
                              {log.userEmail || "-"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <ActionBadge action={log.action} />
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            {log.description || "-"}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm">
                          {log.targetType ? (
                            <span className="text-gray-500">
                              {log.targetType}
                              {log.targetId && (
                                <span className="font-mono text-xs ml-1">
                                  ({log.targetId.substring(0, 8)}...)
                                </span>
                              )}
                            </span>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell className="text-sm font-mono text-gray-500">
                          {log.ipAddress || "-"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <p className="text-sm text-gray-500">
                  Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
                  {pagination.total} activities
                </p>
                <div className="flex gap-2">
                  {pagination.page > 1 && (
                    <Link href={`/admin/activity-logs?page=${pagination.page - 1}`}>
                      <Button variant="outline" size="sm">
                        Previous
                      </Button>
                    </Link>
                  )}
                  {pagination.page < pagination.totalPages && (
                    <Link href={`/admin/activity-logs?page=${pagination.page + 1}`}>
                      <Button variant="outline" size="sm">
                        Next
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
