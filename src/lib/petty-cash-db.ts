import { prisma } from "./db";
import { PettyCashType, PettyCashStatus, Prisma } from "@prisma/client";

// ============================================
// Types
// ============================================

export interface PettyCashAccountWithUser {
  id: string;
  userId: string;
  balance: number;
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
  _count: {
    transactions: number;
  };
}

export interface PettyCashTransactionWithAccount {
  id: string;
  accountId: string;
  type: PettyCashType;
  amount: number;
  description: string | null;
  reference: string | null;
  status: PettyCashStatus;
  requestedBy: string | null;
  approvedBy: string | null;
  approvedAt: Date | null;
  rejectedAt: Date | null;
  rejectReason: string | null;
  createdAt: Date;
  updatedAt: Date;
  account: {
    user: {
      id: string;
      name: string | null;
      email: string;
      image: string | null;
    };
  };
}

export interface PettyCashKPIs {
  totalBalance: number;
  pendingCount: number;
  todayWithdraw: number;
  todayReturn: number;
  todayTopup: number;
  accountCount: number;
}

export interface TransactionFilters {
  type?: PettyCashType;
  status?: PettyCashStatus;
  startDate?: Date;
  endDate?: Date;
}

// ============================================
// Account Functions
// ============================================

export async function getPettyCashAccounts(): Promise<PettyCashAccountWithUser[]> {
  const accounts = await prisma.pettyCashAccount.findMany({
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
      _count: {
        select: {
          transactions: true,
        },
      },
    },
    orderBy: {
      user: {
        name: "asc",
      },
    },
  });

  return accounts.map((account) => ({
    ...account,
    balance: Number(account.balance),
  }));
}

export async function getPettyCashAccountByUserId(
  userId: string
): Promise<PettyCashAccountWithUser | null> {
  const account = await prisma.pettyCashAccount.findUnique({
    where: { userId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
      _count: {
        select: {
          transactions: true,
        },
      },
    },
  });

  if (!account) return null;

  return {
    ...account,
    balance: Number(account.balance),
  };
}

export async function createPettyCashAccount(
  userId: string,
  initialBalance: number = 0
): Promise<PettyCashAccountWithUser> {
  const account = await prisma.pettyCashAccount.create({
    data: {
      userId,
      balance: initialBalance,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
      _count: {
        select: {
          transactions: true,
        },
      },
    },
  });

  return {
    ...account,
    balance: Number(account.balance),
  };
}

export async function getOrCreatePettyCashAccount(
  userId: string
): Promise<PettyCashAccountWithUser> {
  const existing = await getPettyCashAccountByUserId(userId);
  if (existing) return existing;
  return createPettyCashAccount(userId);
}

// ============================================
// Transaction Functions
// ============================================

export async function getTransactions(
  accountId?: string,
  filters?: TransactionFilters,
  limit: number = 50
): Promise<PettyCashTransactionWithAccount[]> {
  const where: Prisma.PettyCashTransactionWhereInput = {};

  if (accountId) {
    where.accountId = accountId;
  }

  if (filters?.type) {
    where.type = filters.type;
  }

  if (filters?.status) {
    where.status = filters.status;
  }

  if (filters?.startDate || filters?.endDate) {
    where.createdAt = {};
    if (filters.startDate) {
      where.createdAt.gte = filters.startDate;
    }
    if (filters.endDate) {
      where.createdAt.lte = filters.endDate;
    }
  }

  const transactions = await prisma.pettyCashTransaction.findMany({
    where,
    include: {
      account: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: limit,
  });

  return transactions.map((tx) => ({
    ...tx,
    amount: Number(tx.amount),
  }));
}

export async function getPendingTransactions(): Promise<
  PettyCashTransactionWithAccount[]
> {
  return getTransactions(undefined, { status: PettyCashStatus.PENDING }, 100);
}

export async function createTransaction(data: {
  accountId: string;
  type: PettyCashType;
  amount: number;
  description?: string;
  reference?: string;
  requestedBy?: string;
}): Promise<PettyCashTransactionWithAccount> {
  // For RETURN and TOPUP, auto-approve and update balance immediately
  const autoApprove =
    data.type === PettyCashType.RETURN || data.type === PettyCashType.TOPUP;

  const transaction = await prisma.$transaction(async (tx) => {
    // Create the transaction
    const newTx = await tx.pettyCashTransaction.create({
      data: {
        accountId: data.accountId,
        type: data.type,
        amount: data.amount,
        description: data.description,
        reference: data.reference,
        requestedBy: data.requestedBy,
        status: autoApprove ? PettyCashStatus.APPROVED : PettyCashStatus.PENDING,
        approvedAt: autoApprove ? new Date() : null,
      },
      include: {
        account: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
          },
        },
      },
    });

    // If auto-approved, update the balance
    if (autoApprove) {
      const balanceChange =
        data.type === PettyCashType.WITHDRAW ? -data.amount : data.amount;

      await tx.pettyCashAccount.update({
        where: { id: data.accountId },
        data: {
          balance: {
            increment: balanceChange,
          },
        },
      });
    }

    return newTx;
  });

  return {
    ...transaction,
    amount: Number(transaction.amount),
  };
}

export async function approveTransaction(
  transactionId: string,
  approvedBy: string
): Promise<PettyCashTransactionWithAccount> {
  const transaction = await prisma.$transaction(async (tx) => {
    // Get the transaction
    const existingTx = await tx.pettyCashTransaction.findUnique({
      where: { id: transactionId },
    });

    if (!existingTx) {
      throw new Error("Transaction not found");
    }

    if (existingTx.status !== PettyCashStatus.PENDING) {
      throw new Error("Transaction is not pending");
    }

    // Update the transaction
    const updatedTx = await tx.pettyCashTransaction.update({
      where: { id: transactionId },
      data: {
        status: PettyCashStatus.APPROVED,
        approvedBy,
        approvedAt: new Date(),
      },
      include: {
        account: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
          },
        },
      },
    });

    // Update the balance (WITHDRAW reduces, RETURN/TOPUP increases)
    const balanceChange =
      existingTx.type === PettyCashType.WITHDRAW
        ? -Number(existingTx.amount)
        : Number(existingTx.amount);

    await tx.pettyCashAccount.update({
      where: { id: existingTx.accountId },
      data: {
        balance: {
          increment: balanceChange,
        },
      },
    });

    return updatedTx;
  });

  return {
    ...transaction,
    amount: Number(transaction.amount),
  };
}

export async function rejectTransaction(
  transactionId: string,
  rejectReason?: string
): Promise<PettyCashTransactionWithAccount> {
  const transaction = await prisma.pettyCashTransaction.update({
    where: { id: transactionId },
    data: {
      status: PettyCashStatus.REJECTED,
      rejectedAt: new Date(),
      rejectReason,
    },
    include: {
      account: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
      },
    },
  });

  return {
    ...transaction,
    amount: Number(transaction.amount),
  };
}

// ============================================
// KPI Functions
// ============================================

export async function getPettyCashKPIs(): Promise<PettyCashKPIs> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [
    totalBalanceResult,
    pendingCount,
    accountCount,
    todayTransactions,
  ] = await Promise.all([
    // Total balance across all accounts
    prisma.pettyCashAccount.aggregate({
      _sum: {
        balance: true,
      },
    }),

    // Pending transactions count
    prisma.pettyCashTransaction.count({
      where: {
        status: PettyCashStatus.PENDING,
      },
    }),

    // Account count
    prisma.pettyCashAccount.count(),

    // Today's approved transactions grouped by type
    prisma.pettyCashTransaction.groupBy({
      by: ["type"],
      where: {
        status: PettyCashStatus.APPROVED,
        approvedAt: {
          gte: today,
          lt: tomorrow,
        },
      },
      _sum: {
        amount: true,
      },
    }),
  ]);

  const todayWithdraw =
    todayTransactions.find((t) => t.type === PettyCashType.WITHDRAW)?._sum
      .amount ?? 0;
  const todayReturn =
    todayTransactions.find((t) => t.type === PettyCashType.RETURN)?._sum
      .amount ?? 0;
  const todayTopup =
    todayTransactions.find((t) => t.type === PettyCashType.TOPUP)?._sum
      .amount ?? 0;

  return {
    totalBalance: Number(totalBalanceResult._sum.balance ?? 0),
    pendingCount,
    todayWithdraw: Number(todayWithdraw),
    todayReturn: Number(todayReturn),
    todayTopup: Number(todayTopup),
    accountCount,
  };
}

// ============================================
// User Lookup Functions
// ============================================

export async function getAllUsersForPettyCash() {
  return prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      pettyCashAccount: {
        select: {
          id: true,
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  });
}
