import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getStockItems, getAllItems } from "@/lib/inventory-db";
import ItemsClient from "./ItemsClient";

export const dynamic = "force-dynamic";

export default async function ItemsPage() {
  const session = await auth();

  if (!session) {
    redirect("/api/auth/signin");
  }

  const [stockItems, allItems] = await Promise.all([
    getStockItems({ isActive: true }),
    getAllItems(),
  ]);

  // Items that are not yet in stock
  const availableItems = allItems.filter(
    (item) => !item.stockItem
  );

  return (
    <ItemsClient
      stockItems={stockItems}
      availableItems={availableItems}
    />
  );
}
