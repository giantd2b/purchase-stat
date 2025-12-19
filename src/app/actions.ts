"use server";

import { z } from "zod";
import { appendPurchaseToSheet } from "@/lib/google-sheets";
import { revalidatePath } from "next/cache";
import { purchaseSchema, type PurchaseFormData } from "@/lib/validations/purchase";

// Server Action to add a new purchase
export async function addPurchase(data: PurchaseFormData) {
  try {
    // Validate the data
    const validatedData = purchaseSchema.parse(data);

    // Format date as DD/MM/YYYY for Google Sheets
    const formattedDate = validatedData.date.toLocaleDateString("en-GB");

    // Append to Google Sheets
    await appendPurchaseToSheet({
      date: formattedDate,
      reference: validatedData.reference,
      vendor: validatedData.vendor,
      item: validatedData.item,
      quantity: validatedData.quantity,
      unit: validatedData.unit,
      unitPrice: validatedData.unitPrice,
      department: validatedData.department,
      payment: validatedData.payment,
    });

    // Revalidate the dashboard to show the new data
    revalidatePath("/");

    return { success: true, message: "Purchase added successfully!" };
  } catch (error) {
    console.error("Error adding purchase:", error);

    if (error instanceof z.ZodError) {
      return {
        success: false,
        message: "Validation error: " + error.errors.map(e => e.message).join(", ")
      };
    }

    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to add purchase"
    };
  }
}
