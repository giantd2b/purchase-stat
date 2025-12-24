import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getPendingTransactions } from "@/lib/inventory-db";
import ApprovalClient from "./ApprovalClient";

export const dynamic = "force-dynamic";

export default async function ApprovalsPage() {
  const session = await auth();

  if (!session) {
    redirect("/api/auth/signin");
  }

  if (session.user?.role !== "ADMIN") {
    redirect("/inventory");
  }

  const pendingTransactions = await getPendingTransactions();

  return <ApprovalClient transactions={pendingTransactions} />;
}
