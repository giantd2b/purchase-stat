import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getTransactions } from "@/lib/inventory-db";
import TransactionsClient from "./TransactionsClient";

export const dynamic = "force-dynamic";

export default async function TransactionsPage() {
  const session = await auth();

  if (!session) {
    redirect("/api/auth/signin");
  }

  const transactions = await getTransactions(undefined, 100);

  return <TransactionsClient transactions={transactions} />;
}
