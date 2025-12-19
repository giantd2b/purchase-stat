"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, Check, X } from "lucide-react";

interface SyncResult {
  success: boolean;
  result?: {
    totalRows: number;
    insertedRows: number;
    updatedRows: number;
    deletedRows: number;
  };
  error?: string;
}

export default function SyncButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<SyncResult | null>(null);

  const handleSync = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/sync", {
        method: "POST",
      });
      const data = await response.json();
      setResult(data);

      // Auto-refresh page after successful sync
      if (data.success) {
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      }
    } catch (error) {
      setResult({
        success: false,
        error: String(error),
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="default"
        size="sm"
        onClick={handleSync}
        disabled={isLoading}
        className="bg-blue-600 hover:bg-blue-700"
      >
        <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
        {isLoading ? "Syncing..." : "Sync from Sheet"}
      </Button>

      {result && (
        <div
          className={`flex items-center gap-1 text-sm px-2 py-1 rounded ${
            result.success
              ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
              : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
          }`}
        >
          {result.success ? (
            <>
              <Check className="h-4 w-4" />
              <span>
                +{result.result?.insertedRows} / ~{result.result?.updatedRows} / -{result.result?.deletedRows}
              </span>
            </>
          ) : (
            <>
              <X className="h-4 w-4" />
              <span>Failed</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
