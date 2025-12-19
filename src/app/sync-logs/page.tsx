import { prisma } from "@/lib/db";
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
import { ArrowLeft, CheckCircle, XCircle, Clock, Loader2 } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { icon: React.ReactNode; class: string }> = {
    completed: {
      icon: <CheckCircle className="h-4 w-4" />,
      class: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
    },
    failed: {
      icon: <XCircle className="h-4 w-4" />,
      class: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
    },
    running: {
      icon: <Loader2 className="h-4 w-4 animate-spin" />,
      class: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
    },
    pending: {
      icon: <Clock className="h-4 w-4" />,
      class: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    },
  };

  const { icon, class: className } = config[status] || config.pending;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${className}`}>
      {icon}
      {status}
    </span>
  );
}

function formatDuration(startedAt: Date, completedAt: Date | null): string {
  if (!completedAt) return "-";
  const duration = (completedAt.getTime() - startedAt.getTime()) / 1000;
  if (duration < 60) return `${duration.toFixed(1)}s`;
  return `${Math.floor(duration / 60)}m ${Math.floor(duration % 60)}s`;
}

export default async function SyncLogsPage() {
  const logs = await prisma.syncLog.findMany({
    orderBy: { startedAt: "desc" },
    take: 50,
  });

  // Calculate stats
  const stats = {
    total: logs.length,
    completed: logs.filter((l) => l.status === "completed").length,
    failed: logs.filter((l) => l.status === "failed").length,
    totalInserted: logs.reduce((sum, l) => sum + (l.insertedRows || 0), 0),
    totalUpdated: logs.reduce((sum, l) => sum + (l.updatedRows || 0), 0),
    totalDeleted: logs.reduce((sum, l) => sum + (l.deletedRows || 0), 0),
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
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
                  Sync Logs
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  History of Google Sheets synchronization
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Total Syncs</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.total}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-green-600">Completed</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-red-600">Failed</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-blue-600">Inserted</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-blue-600">{stats.totalInserted.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-yellow-600">Updated</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-yellow-600">{stats.totalUpdated.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Deleted</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-gray-600">{stats.totalDeleted.toLocaleString()}</p>
            </CardContent>
          </Card>
        </div>

        {/* Logs Table */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Sync History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">#</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Started At</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead className="text-right">Total Rows</TableHead>
                    <TableHead className="text-right text-green-600">+Inserted</TableHead>
                    <TableHead className="text-right text-yellow-600">~Updated</TableHead>
                    <TableHead className="text-right text-red-600">-Deleted</TableHead>
                    <TableHead>Error</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                        No sync logs found
                      </TableCell>
                    </TableRow>
                  ) : (
                    logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-mono text-gray-500">{log.id}</TableCell>
                        <TableCell>
                          <StatusBadge status={log.status} />
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {new Intl.DateTimeFormat("th-TH", {
                            dateStyle: "short",
                            timeStyle: "medium",
                          }).format(log.startedAt)}
                        </TableCell>
                        <TableCell>{formatDuration(log.startedAt, log.completedAt)}</TableCell>
                        <TableCell className="text-right font-mono">
                          {log.totalRows?.toLocaleString() || "-"}
                        </TableCell>
                        <TableCell className="text-right font-mono text-green-600">
                          {log.insertedRows?.toLocaleString() || "0"}
                        </TableCell>
                        <TableCell className="text-right font-mono text-yellow-600">
                          {log.updatedRows?.toLocaleString() || "0"}
                        </TableCell>
                        <TableCell className="text-right font-mono text-red-600">
                          {log.deletedRows?.toLocaleString() || "0"}
                        </TableCell>
                        <TableCell className="max-w-xs truncate text-red-500">
                          {log.errorMessage || "-"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
