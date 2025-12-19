import { z } from "zod";

// Zod schema for purchase form validation
export const purchaseSchema = z.object({
  date: z.date({
    required_error: "Date is required",
  }),
  vendor: z.string().min(1, "Vendor is required"),
  item: z.string().min(1, "Item is required"),
  quantity: z.number().min(0.01, "Quantity must be greater than 0"),
  unit: z.string().min(1, "Unit is required"),
  unitPrice: z.number().min(0, "Unit price must be greater than or equal to 0"),
  department: z.enum(["Kitchen", "F&B", "Staff", "General"], {
    required_error: "Department is required",
  }),
  payment: z.enum(["Credit", "Cash"], {
    required_error: "Payment method is required",
  }),
  reference: z.string().optional(),
});

export type PurchaseFormData = z.infer<typeof purchaseSchema>;
