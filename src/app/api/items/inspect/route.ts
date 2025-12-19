import { NextResponse } from "next/server";
import { fetchItemsFromSheet } from "@/lib/google-sheets";

export async function GET() {
  try {
    const items = await fetchItemsFromSheet();

    return NextResponse.json({
      success: true,
      totalRows: items.length,
      headers: items[0] || [],
      sampleRows: items.slice(1, 6), // First 5 data rows
    });
  } catch (error) {
    console.error("Error inspecting items sheet:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch items",
      },
      { status: 500 }
    );
  }
}
