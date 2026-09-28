# SEED DATA (`prisma/seed.ts`)

A rich, realistic demo beats an empty app. Seed must be **idempotent** (upsert master data; delete and recreate assets/history/maintenance at start).

## Divisions (name / code / circle)
| Name | Code | Circle |
|---|---|---|
| R&B Division Ahmedabad | AMD | Ahmedabad Circle |
| R&B Division Surat | SRT | Surat Circle |
| R&B Division Vadodara | VDR | Vadodara Circle |
| R&B Division Rajkot | RJK | Rajkot Circle |
| R&B Division Gandhinagar | GNR | Gandhinagar Circle |
| R&B Division Bhuj | BHJ | Bhuj (Kutch) Circle |

## Users (hash with bcrypt at seed time)
| Name | Email | Password | Role | Division |
|---|---|---|---|---|
| Rajesh Patel | admin@gov.in | Admin@123 | ADMIN | — |
| Meera Shah | manager@gov.in | Manager@123 | MANAGER | Ahmedabad |
| Amit Desai | officer@gov.in | Officer@123 | OFFICER | Ahmedabad |
| Kiran Joshi | manager2@gov.in | Manager@123 | MANAGER | Surat |
| Neha Trivedi | officer2@gov.in | Officer@123 | OFFICER | Surat |
| Hardik Solanki | manager3@gov.in | Manager@123 | MANAGER | Vadodara |
| (optionally 1 manager each for Rajkot, Gandhinagar, Bhuj) | | | | |

## Categories (name / code / usefulLifeYears)
State Highway / SH / 20 · District Road / DR / 15 · Village Road / VR / 10 · Bridge / BR / 50 · Culvert / CV / 30 · Government Building / BL / 40 · Residential Quarters / RQ / 40 · Machinery / MC / 10

## Locations (name, district, lat, lng)
Ahmedabad City (Ahmedabad, 23.0225, 72.5714) · Sanand (Ahmedabad, 22.9920, 72.3810) · Surat Adajan (Surat, 21.1959, 72.7933) · Bardoli (Surat, 21.1200, 73.1120) · Vadodara Alkapuri (Vadodara, 22.3072, 73.1812) · Rajkot Race Course (Rajkot, 22.3039, 70.8022) · Gondal (Rajkot, 21.9600, 70.7920) · Gandhinagar Sector 11 (Gandhinagar, 23.2156, 72.6369) · Bhuj (Kutch, 23.2420, 69.6669) · Mundra (Kutch, 22.8390, 69.7250)

## Assets: create ~70, distributed across all 6 divisions (Ahmedabad and Surat should have the most: ~18 each, so scoped demos look rich)

### Realistic naming examples
- SH: "SH-1 Ahmedabad–Mehsana Section (km 12–38)", roadNumber `SH-1`, lengthKm 26, specs `{surface:"Bituminous", lanes:4, widthM:14, chainageFromKm:12, chainageToKm:38}`
- DR: "MDR-24 Bardoli–Mandvi Road", roadNumber `MDR-24`, lengthKm 31
- VR: "Sanand–Kalana Village Link Road", roadNumber `VR-108`, lengthKm 6.5, surface "WBM"
- BR: "Sabarmati River Bridge, Ahmedabad" (`{bridgeType:"PSC", spans:12, loadClassMT:70, crossing:"Sabarmati River"}`, lengthKm 0.42), "Tapi Bridge, Surat", "Mahi River Bridge, Vadodara"
- CV: "Culvert at SH-1 km 21, Sanand"
- BL: "R&B Division Office, Rajkot" (`{floors:3, builtUpAreaSqM:2400, usage:"Office"}`), "R&B Rest House, Gandhinagar"
- RQ: "Government Quarters Block C, Sector 11 Gandhinagar"
- MC: "Road Roller GJ-03-AB-4412" (`{make:"BOMAG", model:"BW 219", regNo:"GJ-03-AB-4412", yearOfManufacture:2019, engineHours:4200}`), "Motor Grader", "Bitumen Paver", "Tipper Truck"

### Distribution targets
- **Category mix**: SH ~10, DR ~10, VR ~6, BR ~10, CV ~6, BL ~10, RQ ~6, MC ~12
- **Status**: ~4 PLANNED, ~5 PROCURED, ~38 IN_SERVICE, ~12 UNDER_MAINTENANCE, ~8 DECOMMISSIONED, ~3 DISPOSED
- **Condition**: mostly GOOD/FAIR, ~8 POOR, **4–5 CRITICAL** (include one old bridge and one road section post-monsoon)
- **Cost**: machinery ₹8 lakh–₹1.2 crore; buildings ₹1–25 crore; roads ₹2–120 crore; bridges ₹5–180 crore
- `builtYear` 1985–2025; some with `lastRenovatedOn`
- Every asset has `specs` filled per its category, plus `roadNumber`/`lengthKm` where relevant

### History (mandatory)
Each asset gets StatusHistory rows walking a valid path to its current status, increasing dates, `changedBy` = that division's manager, remarks like "Work order issued", "Handed over after final inspection", "Monsoon damage – closed for repair", "Resurfacing completed, reopened", "Beyond economic repair – condemned".
At least **4 assets** must have a long loop: IN_SERVICE → UNDER_MAINTENANCE → IN_SERVICE → UNDER_MAINTENANCE → IN_SERVICE so the timeline looks rich (make sure at least 2 of these are in the Ahmedabad division).

### Maintenance records
For every IN_SERVICE / UNDER_MAINTENANCE / DECOMMISSIONED asset add 1–4 records over the last 2 years using all types (ROUTINE, PERIODIC_RENEWAL, RESURFACING, STRUCTURAL_REPAIR, EMERGENCY, INSPECTION). Each has `contractor` (e.g. "Shree Ganesh Infra Pvt Ltd", "Patel Constructions", "Narmada Roadways", "Jay Ambe Builders") and `workOrderNo` (e.g. "RNB/AMD/2025-26/0412"). Costs ₹5,000–₹2.5 crore depending on type/asset.
Ensure:
- ~10 assets have latest `nextDueOn` **in the past** (overdue) — include several in Ahmedabad and Surat
- ~12 assets have `nextDueOn` within the next 30 days
- Others 2–12 months ahead
- `performedOn` spread across the last 12 months (cost-by-month chart has shape)
- ~8 EMERGENCY records in the last 12 months, clustered in the monsoon months (Jul–Sep) for a realistic bump

## Asset code generation
Reuse `src/lib/assetCode.ts` in the seed. Format `RNB-<CATEGORY_CODE>-<0001>` sequential per category.

## Run
`package.json`: `"prisma": { "seed": "tsx prisma/seed.ts" }` → `npx prisma db seed`
