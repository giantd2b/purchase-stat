"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Database, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function SyncItemsButton() {
  const [isSyncing, setIsSyncing] = useState(false);

  async function handleSync() {
    setIsSyncing(true);
    toast.info("Syncing items from Google Sheets...");

    try {
      const response = await fetch("/api/items/sync", {
        method: "POST",
      });

      const data = await response.json();

      if (data.success) {
        toast.success(data.message);
      } else {
        toast.error(data.error || "Failed to sync items");
      }
    } catch (error) {
      toast.error("An error occurred while syncing items");
      console.error("Sync error:", error);
    } finally {
      setIsSyncing(false);
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleSync}
      disabled={isSyncing}
    >
      {isSyncing ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Syncing Items...
        </>
      ) : (
        <>
          <Database className="h-4 w-4 mr-2" />
          Sync Items
        </>
      )}
    </Button>
  );
}
