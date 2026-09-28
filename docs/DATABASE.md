# DATABASE — Prisma schema (source of truth)

Copy this into `prisma/schema.prisma`. Do not rename fields without updating the other docs.

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role            { ADMIN MANAGER OFFICER }
enum AssetStatus     { PLANNED PROCURED IN_SERVICE UNDER_MAINTENANCE DECOMMISSIONED DISPOSED }
enum Condition       { EXCELLENT GOOD FAIR POOR CRITICAL }
enum MaintenanceType { ROUTINE PERIODIC_RENEWAL RESURFACING STRUCTURAL_REPAIR EMERGENCY INSPECTION }

model User {
  id         String   @id @default(cuid())
  name       String
  email      String   @unique
  password   String
  role       Role     @default(OFFICER)
  divisionId String?              // null only for ADMIN
  isActive   Boolean  @default(true)
  createdAt  DateTime @default(now())

  division    Division?           @relation(fields: [divisionId], references: [id])
  assets      Asset[]
  history     StatusHistory[]
  maintenance MaintenanceRecord[]
}

model Division {
  id     String  @id @default(cuid())
  name   String  @unique        // "R&B Division Ahmedabad"
  code   String  @unique        // AMD, SRT, VDR, RJK, GNR, BHJ
  circle String                 // "Ahmedabad Circle"
  users  User[]
  assets Asset[]
}

model Category {
  id              String  @id @default(cuid())
  name            String  @unique   // State Highway, District Road, Village Road, Bridge, Culvert, Government Building, Residential Quarters, Machinery
  code            String  @unique   // SH, DR, VR, BR, CV, BL, RQ, MC
  usefulLifeYears Int     @default(20)
  assets          Asset[]
}

model Location {
  id       String  @id @default(cuid())
  name     String
  district String
  lat      Float?
  lng      Float?
  assets   Asset[]
}

model Asset {
  id              String      @id @default(cuid())
  assetCode       String      @unique          // RNB-SH-0001
  name            String
  description     String?
  categoryId      String
  divisionId      String
  locationId      String
  status          AssetStatus @default(PLANNED)
  condition       Condition   @default(GOOD)

  // R&B-specific
  roadNumber      String?                      // SH-1, MDR-12 (roads only)
  lengthKm        Float?                       // roads, bridges (bridge length in km, e.g. 0.42)
  builtYear       Int?
  lastRenovatedOn DateTime?
  specs           Json?                        // category-specific, validated by Zod per category

  acquisitionDate DateTime?
  acquisitionCost Decimal?    @db.Decimal(14, 2)
  createdById     String
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt

  category    Category            @relation(fields: [categoryId], references: [id])
  division    Division            @relation(fields: [divisionId], references: [id])
  location    Location            @relation(fields: [locationId], references: [id])
  createdBy   User                @relation(fields: [createdById], references: [id])
  history     StatusHistory[]
  maintenance MaintenanceRecord[]

  @@index([status])
  @@index([categoryId])
  @@index([divisionId])
  @@index([condition])
  @@index([roadNumber])
}

model StatusHistory {
  id          String       @id @default(cuid())
  assetId     String
  fromStatus  AssetStatus?
  toStatus    AssetStatus
  remarks     String?
  changedById String
  changedAt   DateTime     @default(now())

  asset     Asset @relation(fields: [assetId], references: [id], onDelete: Cascade)
  changedBy User  @relation(fields: [changedById], references: [id])

  @@index([assetId, changedAt])
}

model MaintenanceRecord {
  id            String          @id @default(cuid())
  assetId       String
  type          MaintenanceType
  description   String
  cost          Decimal?        @db.Decimal(12, 2)
  contractor    String?
  workOrderNo   String?
  performedOn   DateTime
  nextDueOn     DateTime?
  performedById String
  createdAt     DateTime        @default(now())

  asset       Asset @relation(fields: [assetId], references: [id], onDelete: Cascade)
  performedBy User  @relation(fields: [performedById], references: [id])

  @@index([assetId])
  @@index([nextDueOn])
}
```

## `Asset.specs` shape by category (JSON, all keys optional)
| Category code | Keys |
|---|---|
| SH, DR, VR | `surface` (Bituminous \| Concrete \| WBM \| Earthen), `lanes` (int), `widthM` (number), `chainageFromKm`, `chainageToKm` |
| BR | `bridgeType` (RCC \| PSC \| Steel \| Masonry), `spans` (int), `loadClassMT` (int), `crossing` (string, e.g. "Sabarmati River") |
| CV | `culvertType` (Pipe \| Box \| Slab), `spans` (int), `widthM` |
| BL, RQ | `floors` (int), `builtUpAreaSqM` (number), `usage` (Office \| Rest House \| Residential \| Store) |
| MC | `make`, `model`, `regNo`, `yearOfManufacture` (int), `engineHours` (int) |

## Notes
- Every asset must have a first `StatusHistory` row (`fromStatus = null`, `toStatus = initial status`) created in the same transaction as the asset.
- **Overdue maintenance** = the **latest** maintenance record of an asset (status IN_SERVICE or UNDER_MAINTENANCE) has `nextDueOn < today`.
- **Upcoming** = `nextDueOn` within the next 30 days.
- ADMIN users have `divisionId = null`; MANAGER/OFFICER must have a division.
- Migration: `npx prisma migrate dev --name init`. Production: `npx prisma migrate deploy`.
