import { NextResponse } from "next/server";
import { syncItems } from "@/lib/sync-items";

export async function POST() {
  try {
    console.log("[Items API] Manual items sync triggered");

    const result = await syncItems();

    return NextResponse.json({
      success: true,
      message: `Items sync completed: ${result.inserted} inserted, ${result.updated} updated`,
      ...result,
    });
  } catch (error) {
    console.error("[Items API] Sync failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
