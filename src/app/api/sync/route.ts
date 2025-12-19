import { NextResponse } from "next/server";
import { syncGoogleSheetsToDatabase, getLastSyncStatus } from "@/lib/sync";

/**
 * GET /api/sync - Get last sync status
 */
export async function GET() {
  try {
    const lastSync = await getLastSyncStatus();
    return NextResponse.json({
      success: true,
      lastSync: lastSync
        ? {
            id: lastSync.id,
            status: lastSync.status,
            startedAt: lastSync.startedAt,
            completedAt: lastSync.completedAt,
            totalRows: lastSync.totalRows,
            insertedRows: lastSync.insertedRows,
            updatedRows: lastSync.updatedRows,
            deletedRows: lastSync.deletedRows,
            errorMessage: lastSync.errorMessage,
          }
        : null,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

/**
 * POST /api/sync - Trigger manual sync
 */
export async function POST(request: Request) {
  // Optional: Add API key protection
  const authHeader = request.headers.get("authorization");
  const apiKey = process.env.SYNC_API_KEY;

  if (apiKey && authHeader !== `Bearer ${apiKey}`) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    console.log(`[API] Manual sync triggered at ${new Date().toLocaleString("th-TH")}`);
    const result = await syncGoogleSheetsToDatabase();

    return NextResponse.json({
      success: true,
      result: {
        totalRows: result.totalRows,
        insertedRows: result.insertedRows,
        updatedRows: result.updatedRows,
        deletedRows: result.deletedRows,
      },
      syncedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[API] Sync failed:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
