-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "ActivityAction" AS ENUM ('LOGIN', 'LOGOUT', 'USER_CREATED', 'USER_UPDATED', 'USER_DELETED', 'USER_ROLE_CHANGED', 'PETTY_CASH_WITHDRAW', 'PETTY_CASH_RETURN', 'PETTY_CASH_TOPUP', 'PETTY_CASH_TRANSFER', 'PETTY_CASH_APPROVED', 'PETTY_CASH_REJECTED', 'PETTY_CASH_EDITED', 'PETTY_CASH_DELETED', 'STOCK_RECEIVE', 'STOCK_WITHDRAW', 'STOCK_ADJUST', 'STOCK_TRANSFER', 'STOCK_APPROVED', 'STOCK_REJECTED', 'DATA_SYNC_STARTED', 'DATA_SYNC_COMPLETED', 'DATA_SYNC_FAILED', 'ITEMS_SYNC_STARTED', 'ITEMS_SYNC_COMPLETED', 'ITEMS_SYNC_FAILED', 'OTHER');

-- CreateEnum
CREATE TYPE "PettyCashType" AS ENUM ('WITHDRAW', 'RETURN', 'TOPUP', 'TRANSFER_OUT', 'TRANSFER_IN');

-- CreateEnum
CREATE TYPE "PettyCashStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "StockTransactionType" AS ENUM ('RECEIVE', 'WITHDRAW', 'ADJUST_IN', 'ADJUST_OUT', 'TRANSFER_OUT', 'TRANSFER_IN', 'RETURN');

-- CreateEnum
CREATE TYPE "StockTransactionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL,
    "action" "ActivityAction" NOT NULL,
    "userId" TEXT,
    "userName" TEXT,
    "userEmail" TEXT,
    "targetId" TEXT,
    "targetType" TEXT,
    "description" TEXT,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcurementTransaction" (
    "id" SERIAL NOT NULL,
    "rowNumber" INTEGER NOT NULL,
    "date" TIMESTAMP(3),
    "reference" TEXT,
    "status" TEXT,
    "contactCode" TEXT,
    "vendor" TEXT,
    "itemNumber" INTEGER,
    "productCode" TEXT,
    "productName" TEXT,
    "accountChart" TEXT,
    "description" TEXT,
    "quantity" DECIMAL(18,4),
    "unit" TEXT,
    "price" DECIMAL(18,2),
    "discount" DECIMAL(18,2),
    "totalPrice" DECIMAL(18,2),
    "taxType" TEXT,
    "vatAmount" DECIMAL(18,2),
    "withholdingTax" DECIMAL(18,2),
    "totalWithVat" DECIMAL(18,2),
    "majorGroup" TEXT,
    "minorGroup" TEXT,
    "percentage" DECIMAL(5,2),
    "payment" TEXT,
    "poNumber" TEXT,
    "url" TEXT,
    "rowHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProcurementTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Item" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT,
    "type" TEXT,
    "category" TEXT,
    "supplier1" TEXT,
    "supplier2" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncLog" (
    "id" SERIAL NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL,
    "totalRows" INTEGER,
    "insertedRows" INTEGER,
    "updatedRows" INTEGER,
    "deletedRows" INTEGER,
    "errorMessage" TEXT,

    CONSTRAINT "SyncLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PettyCashAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "balance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PettyCashAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PettyCashTransaction" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "type" "PettyCashType" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "description" TEXT,
    "reference" TEXT,
    "status" "PettyCashStatus" NOT NULL DEFAULT 'PENDING',
    "requestedBy" TEXT,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "rejectReason" TEXT,
    "relatedTransactionId" TEXT,
    "attachmentUrl" TEXT,
    "attachmentName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PettyCashTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockItem" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "currentQuantity" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "minQuantity" DECIMAL(18,4),
    "maxQuantity" DECIMAL(18,4),
    "averageCost" DECIMAL(18,2),
    "lastCost" DECIMAL(18,2),
    "location" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockBatch" (
    "id" TEXT NOT NULL,
    "stockItemId" TEXT NOT NULL,
    "batchNumber" TEXT,
    "expiryDate" TIMESTAMP(3),
    "manufactureDate" TIMESTAMP(3),
    "initialQuantity" DECIMAL(18,4) NOT NULL,
    "currentQuantity" DECIMAL(18,4) NOT NULL,
    "unitCost" DECIMAL(18,2) NOT NULL,
    "receiveTransactionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockTransaction" (
    "id" TEXT NOT NULL,
    "transactionNumber" TEXT NOT NULL,
    "type" "StockTransactionType" NOT NULL,
    "status" "StockTransactionStatus" NOT NULL DEFAULT 'PENDING',
    "description" TEXT,
    "reference" TEXT,
    "notes" TEXT,
    "requestedBy" TEXT NOT NULL,
    "approvedBy" TEXT,
    "transactionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "rejectReason" TEXT,
    "relatedTransactionId" TEXT,
    "attachmentUrl" TEXT,
    "attachmentName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockTransactionItem" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "stockItemId" TEXT NOT NULL,
    "quantity" DECIMAL(18,4) NOT NULL,
    "unitCost" DECIMAL(18,2),
    "totalCost" DECIMAL(18,2),
    "batchNumber" TEXT,
    "expiryDate" TIMESTAMP(3),
    "purpose" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockTransactionItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyPettyCashBalance" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "openingBalance" DECIMAL(12,2) NOT NULL,
    "notes" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyPettyCashBalance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PettyCashTransactionNote" (
    "id" TEXT NOT NULL,
    "transactionId" INTEGER NOT NULL,
    "note" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PettyCashTransactionNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransactionOverride" (
    "id" TEXT NOT NULL,
    "transactionId" INTEGER NOT NULL,
    "actualPrice" DECIMAL(12,2) NOT NULL,
    "reason" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransactionOverride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManualPettyCashTransaction" (
    "id" SERIAL NOT NULL,
    "date" DATE NOT NULL,
    "reference" TEXT,
    "vendor" TEXT,
    "productName" TEXT,
    "totalPrice" DECIMAL(12,2) NOT NULL,
    "minorGroup" TEXT,
    "note" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ManualPettyCashTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManualTransaction" (
    "id" SERIAL NOT NULL,
    "date" DATE NOT NULL,
    "reference" TEXT,
    "vendor" TEXT,
    "productName" TEXT,
    "totalPrice" DECIMAL(12,2) NOT NULL,
    "payment" TEXT,
    "minorGroup" TEXT,
    "note" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ManualTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE INDEX "ActivityLog_userId_idx" ON "ActivityLog"("userId");

-- CreateIndex
CREATE INDEX "ActivityLog_action_idx" ON "ActivityLog"("action");

-- CreateIndex
CREATE INDEX "ActivityLog_targetType_idx" ON "ActivityLog"("targetType");

-- CreateIndex
CREATE INDEX "ActivityLog_createdAt_idx" ON "ActivityLog"("createdAt");

-- CreateIndex
CREATE INDEX "ProcurementTransaction_date_idx" ON "ProcurementTransaction"("date");

-- CreateIndex
CREATE INDEX "ProcurementTransaction_vendor_idx" ON "ProcurementTransaction"("vendor");

-- CreateIndex
CREATE INDEX "ProcurementTransaction_minorGroup_idx" ON "ProcurementTransaction"("minorGroup");

-- CreateIndex
CREATE INDEX "ProcurementTransaction_reference_idx" ON "ProcurementTransaction"("reference");

-- CreateIndex
CREATE INDEX "ProcurementTransaction_rowNumber_idx" ON "ProcurementTransaction"("rowNumber");

-- CreateIndex
CREATE UNIQUE INDEX "ProcurementTransaction_rowNumber_key" ON "ProcurementTransaction"("rowNumber");

-- CreateIndex
CREATE INDEX "Item_name_idx" ON "Item"("name");

-- CreateIndex
CREATE INDEX "Item_category_idx" ON "Item"("category");

-- CreateIndex
CREATE INDEX "Item_type_idx" ON "Item"("type");

-- CreateIndex
CREATE INDEX "SyncLog_startedAt_idx" ON "SyncLog"("startedAt");

-- CreateIndex
CREATE INDEX "SyncLog_status_idx" ON "SyncLog"("status");

-- CreateIndex
CREATE UNIQUE INDEX "PettyCashAccount_userId_key" ON "PettyCashAccount"("userId");

-- CreateIndex
CREATE INDEX "PettyCashAccount_userId_idx" ON "PettyCashAccount"("userId");

-- CreateIndex
CREATE INDEX "PettyCashTransaction_accountId_idx" ON "PettyCashTransaction"("accountId");

-- CreateIndex
CREATE INDEX "PettyCashTransaction_status_idx" ON "PettyCashTransaction"("status");

-- CreateIndex
CREATE INDEX "PettyCashTransaction_createdAt_idx" ON "PettyCashTransaction"("createdAt");

-- CreateIndex
CREATE INDEX "PettyCashTransaction_type_idx" ON "PettyCashTransaction"("type");

-- CreateIndex
CREATE UNIQUE INDEX "StockItem_itemId_key" ON "StockItem"("itemId");

-- CreateIndex
CREATE INDEX "StockItem_itemId_idx" ON "StockItem"("itemId");

-- CreateIndex
CREATE INDEX "StockItem_isActive_idx" ON "StockItem"("isActive");

-- CreateIndex
CREATE INDEX "StockBatch_stockItemId_idx" ON "StockBatch"("stockItemId");

-- CreateIndex
CREATE INDEX "StockBatch_expiryDate_idx" ON "StockBatch"("expiryDate");

-- CreateIndex
CREATE INDEX "StockBatch_batchNumber_idx" ON "StockBatch"("batchNumber");

-- CreateIndex
CREATE UNIQUE INDEX "StockTransaction_transactionNumber_key" ON "StockTransaction"("transactionNumber");

-- CreateIndex
CREATE INDEX "StockTransaction_type_idx" ON "StockTransaction"("type");

-- CreateIndex
CREATE INDEX "StockTransaction_status_idx" ON "StockTransaction"("status");

-- CreateIndex
CREATE INDEX "StockTransaction_transactionDate_idx" ON "StockTransaction"("transactionDate");

-- CreateIndex
CREATE INDEX "StockTransaction_requestedBy_idx" ON "StockTransaction"("requestedBy");

-- CreateIndex
CREATE INDEX "StockTransactionItem_transactionId_idx" ON "StockTransactionItem"("transactionId");

-- CreateIndex
CREATE INDEX "StockTransactionItem_stockItemId_idx" ON "StockTransactionItem"("stockItemId");

-- CreateIndex
CREATE UNIQUE INDEX "DailyPettyCashBalance_date_key" ON "DailyPettyCashBalance"("date");

-- CreateIndex
CREATE INDEX "DailyPettyCashBalance_date_idx" ON "DailyPettyCashBalance"("date");

-- CreateIndex
CREATE UNIQUE INDEX "PettyCashTransactionNote_transactionId_key" ON "PettyCashTransactionNote"("transactionId");

-- CreateIndex
CREATE INDEX "PettyCashTransactionNote_transactionId_idx" ON "PettyCashTransactionNote"("transactionId");

-- CreateIndex
CREATE UNIQUE INDEX "TransactionOverride_transactionId_key" ON "TransactionOverride"("transactionId");

-- CreateIndex
CREATE INDEX "TransactionOverride_transactionId_idx" ON "TransactionOverride"("transactionId");

-- CreateIndex
CREATE INDEX "ManualPettyCashTransaction_date_idx" ON "ManualPettyCashTransaction"("date");

-- CreateIndex
CREATE INDEX "ManualTransaction_date_idx" ON "ManualTransaction"("date");

-- CreateIndex
CREATE INDEX "ManualTransaction_payment_idx" ON "ManualTransaction"("payment");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PettyCashAccount" ADD CONSTRAINT "PettyCashAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PettyCashTransaction" ADD CONSTRAINT "PettyCashTransaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "PettyCashAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockItem" ADD CONSTRAINT "StockItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockBatch" ADD CONSTRAINT "StockBatch_stockItemId_fkey" FOREIGN KEY ("stockItemId") REFERENCES "StockItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTransaction" ADD CONSTRAINT "StockTransaction_requestedBy_fkey" FOREIGN KEY ("requestedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTransaction" ADD CONSTRAINT "StockTransaction_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTransactionItem" ADD CONSTRAINT "StockTransactionItem_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "StockTransaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTransactionItem" ADD CONSTRAINT "StockTransactionItem_stockItemId_fkey" FOREIGN KEY ("stockItemId") REFERENCES "StockItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
