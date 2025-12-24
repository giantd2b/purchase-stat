import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import {
  getInventoryKPIs,
  getStockItems,
  getExpiringBatches,
  getPendingTransactions,
  getAllItems,
} from "@/lib/inventory-db";
import InventoryClient from "./InventoryClient";

export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  const session = await auth();

  if (!session) {
    redirect("/api/auth/signin");
  }

  const isAdmin = session.user?.role === "ADMIN";

  const [kpis, stockItems, expiringBatches, pendingTransactions, allItems] =
    await Promise.all([
      getInventoryKPIs(),
      getStockItems({ isActive: true }),
      getExpiringBatches(30),
      isAdmin ? getPendingTransactions() : Promise.resolve([]),
      getAllItems(),
    ]);

  return (
    <InventoryClient
      kpis={kpis}
      stockItems={stockItems}
      expiringBatches={expiringBatches}
      pendingTransactions={pendingTransactions}
      allItems={allItems}
      isAdmin={isAdmin}
    />
  );
}
