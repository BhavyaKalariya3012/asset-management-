-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'MANAGER', 'OFFICER');

-- CreateEnum
CREATE TYPE "AssetStatus" AS ENUM ('PLANNED', 'PROCURED', 'IN_SERVICE', 'UNDER_MAINTENANCE', 'DECOMMISSIONED', 'DISPOSED');

-- CreateEnum
CREATE TYPE "Condition" AS ENUM ('EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'CRITICAL');

-- CreateEnum
CREATE TYPE "MaintenanceType" AS ENUM ('ROUTINE', 'PERIODIC_RENEWAL', 'RESURFACING', 'STRUCTURAL_REPAIR', 'EMERGENCY', 'INSPECTION');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'OFFICER',
    "divisionId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Division" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "circle" TEXT NOT NULL,

    CONSTRAINT "Division_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "usefulLifeYears" INTEGER NOT NULL DEFAULT 20,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Location" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" TEXT NOT NULL,
    "assetCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "categoryId" TEXT NOT NULL,
    "divisionId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "status" "AssetStatus" NOT NULL DEFAULT 'PLANNED',
    "condition" "Condition" NOT NULL DEFAULT 'GOOD',
    "roadNumber" TEXT,
    "lengthKm" DOUBLE PRECISION,
    "builtYear" INTEGER,
    "lastRenovatedOn" TIMESTAMP(3),
    "specs" JSONB,
    "acquisitionDate" TIMESTAMP(3),
    "acquisitionCost" DECIMAL(14,2),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StatusHistory" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "fromStatus" "AssetStatus",
    "toStatus" "AssetStatus" NOT NULL,
    "remarks" TEXT,
    "changedById" TEXT NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaintenanceRecord" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "type" "MaintenanceType" NOT NULL,
    "description" TEXT NOT NULL,
    "cost" DECIMAL(12,2),
    "contractor" TEXT,
    "workOrderNo" TEXT,
    "performedOn" TIMESTAMP(3) NOT NULL,
    "nextDueOn" TIMESTAMP(3),
    "performedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaintenanceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Division_name_key" ON "Division"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Division_code_key" ON "Division"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Category_code_key" ON "Category"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Asset_assetCode_key" ON "Asset"("assetCode");

-- CreateIndex
CREATE INDEX "Asset_status_idx" ON "Asset"("status");

-- CreateIndex
CREATE INDEX "Asset_categoryId_idx" ON "Asset"("categoryId");

-- CreateIndex
CREATE INDEX "Asset_divisionId_idx" ON "Asset"("divisionId");

-- CreateIndex
CREATE INDEX "Asset_condition_idx" ON "Asset"("condition");

-- CreateIndex
CREATE INDEX "Asset_roadNumber_idx" ON "Asset"("roadNumber");

-- CreateIndex
CREATE INDEX "StatusHistory_assetId_changedAt_idx" ON "StatusHistory"("assetId", "changedAt");

-- CreateIndex
CREATE INDEX "MaintenanceRecord_assetId_idx" ON "MaintenanceRecord"("assetId");

-- CreateIndex
CREATE INDEX "MaintenanceRecord_nextDueOn_idx" ON "MaintenanceRecord"("nextDueOn");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_divisionId_fkey" FOREIGN KEY ("divisionId") REFERENCES "Division"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_divisionId_fkey" FOREIGN KEY ("divisionId") REFERENCES "Division"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatusHistory" ADD CONSTRAINT "StatusHistory_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatusHistory" ADD CONSTRAINT "StatusHistory_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceRecord" ADD CONSTRAINT "MaintenanceRecord_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceRecord" ADD CONSTRAINT "MaintenanceRecord_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
