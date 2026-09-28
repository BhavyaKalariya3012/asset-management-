import { z } from "zod";
import { AssetStatus, Condition, MaintenanceType } from "@prisma/client";

/* -------------------------------------------------------------------------- */
/* Category-specific specs (Asset.specs JSON)                                 */
/* All fields optional. Unknown keys are stripped (Zod object default).       */
/* Keys per docs/DATABASE.md.                                                 */
/* -------------------------------------------------------------------------- */

const roadSpecs = z.object({
  surface: z.enum(["Bituminous", "Concrete", "WBM", "Earthen"]).optional(),
  lanes: z.number().int().min(1).optional(),
  widthM: z.number().min(0).optional(),
  chainageFromKm: z.number().min(0).optional(),
  chainageToKm: z.number().min(0).optional(),
});

const bridgeSpecs = z.object({
  bridgeType: z.enum(["RCC", "PSC", "Steel", "Masonry"]).optional(),
  spans: z.number().int().min(1).optional(),
  loadClassMT: z.number().int().min(0).optional(),
  crossing: z.string().max(120).optional(),
});

const culvertSpecs = z.object({
  culvertType: z.enum(["Pipe", "Box", "Slab"]).optional(),
  spans: z.number().int().min(1).optional(),
  widthM: z.number().min(0).optional(),
});

const buildingSpecs = z.object({
  floors: z.number().int().min(0).optional(),
  builtUpAreaSqM: z.number().min(0).optional(),
  usage: z.enum(["Office", "Rest House", "Residential", "Store"]).optional(),
});

const machinerySpecs = z.object({
  make: z.string().max(80).optional(),
  model: z.string().max(80).optional(),
  regNo: z.string().max(40).optional(),
  yearOfManufacture: z.number().int().min(1900).optional(),
  engineHours: z.number().int().min(0).optional(),
});

/**
 * Map from Category.code → the Zod schema that validates that category's specs.
 * SH/DR/VR share roadSpecs; BL/RQ share buildingSpecs.
 */
export const specsSchemaByCategoryCode: Record<string, z.ZodObject> = {
  SH: roadSpecs,
  DR: roadSpecs,
  VR: roadSpecs,
  BR: bridgeSpecs,
  CV: culvertSpecs,
  BL: buildingSpecs,
  RQ: buildingSpecs,
  MC: machinerySpecs,
};

/** Categories whose assets carry a road number (SH/DR/VR). */
export const ROAD_CATEGORY_CODES = ["SH", "DR", "VR"] as const;

/**
 * Validate a specs object against the schema for the given category code.
 * Returns the parsed (unknown-keys-stripped) object, or undefined when no specs
 * were supplied. Throws ZodError on invalid input.
 */
export function parseSpecsForCategory(
  categoryCode: string,
  specs: unknown
): Record<string, unknown> | undefined {
  if (specs === undefined || specs === null) return undefined;
  const schema = specsSchemaByCategoryCode[categoryCode];
  if (!schema) return undefined;
  return schema.parse(specs) as Record<string, unknown>;
}

/* -------------------------------------------------------------------------- */
/* Asset create / update                                                      */
/* -------------------------------------------------------------------------- */

const currentYear = new Date().getFullYear();

const baseAssetShape = {
  name: z.string().trim().min(3).max(120),
  description: z.string().max(1000).optional(),
  categoryId: z.string().min(1),
  locationId: z.string().min(1),
  divisionId: z.string().min(1),
  condition: z.enum(Condition).optional(),
  roadNumber: z.string().max(20).optional(),
  lengthKm: z.number().min(0).optional(),
  builtYear: z.number().int().min(1900).max(currentYear).optional(),
  lastRenovatedOn: z.coerce.date().optional(),
  specs: z.record(z.string(), z.unknown()).optional(),
  acquisitionDate: z.coerce.date().optional(),
  acquisitionCost: z.number().min(0).optional(),
};

export const createAssetSchema = z.object({
  ...baseAssetShape,
  initialStatus: z
    .enum([AssetStatus.PLANNED, AssetStatus.PROCURED, AssetStatus.IN_SERVICE])
    .default(AssetStatus.PLANNED),
});

/**
 * PATCH body: partial of the base fields (no initialStatus, no status).
 * divisionId is accepted here but the route rejects it for non-admins.
 */
export const updateAssetSchema = z.object(baseAssetShape).partial();

export type CreateAssetInput = z.infer<typeof createAssetSchema>;
export type UpdateAssetInput = z.infer<typeof updateAssetSchema>;

/* -------------------------------------------------------------------------- */
/* Asset list query                                                           */
/* -------------------------------------------------------------------------- */

const SORT_FIELDS = [
  "createdAt",
  "name",
  "acquisitionCost",
  "assetCode",
  "lengthKm",
] as const;

export const assetQuerySchema = z.object({
  q: z.string().trim().optional(),
  status: z.enum(AssetStatus).optional(),
  categoryId: z.string().optional(),
  divisionId: z.string().optional(),
  condition: z.enum(Condition).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
  sort: z.enum(SORT_FIELDS).default("createdAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

export type AssetQuery = z.infer<typeof assetQuerySchema>;

/* -------------------------------------------------------------------------- */
/* Lifecycle status change                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Body for POST /api/assets/[id]/status.
 * The transition rule (canTransition) and the remarks-required-for-terminal
 * rule are enforced in the route so they can return 409 / 400 respectively.
 */
export const statusChangeSchema = z.object({
  toStatus: z.enum(AssetStatus),
  remarks: z.string().trim().max(500).optional(),
});

export type StatusChangeInput = z.infer<typeof statusChangeSchema>;

/* -------------------------------------------------------------------------- */
/* Maintenance record create                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Body for POST /api/assets/[id]/maintenance.
 * - performedOn may not be in the future
 * - nextDueOn (when given) must be strictly after performedOn
 * Both cross-field rules attach their error to the relevant field so the
 * client form can highlight it.
 */
export const maintenanceCreateSchema = z
  .object({
    type: z.enum(MaintenanceType),
    description: z.string().trim().min(5).max(500),
    cost: z.number().min(0).optional(),
    contractor: z.string().trim().max(120).optional(),
    workOrderNo: z.string().trim().max(60).optional(),
    performedOn: z.coerce.date(),
    nextDueOn: z.coerce.date().optional(),
  })
  .superRefine((data, ctx) => {
    // performedOn not in the future (compare on day granularity, end of today).
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);
    if (data.performedOn.getTime() > endOfToday.getTime()) {
      ctx.addIssue({
        code: "custom",
        path: ["performedOn"],
        message: "Performed date cannot be in the future",
      });
    }
    if (
      data.nextDueOn &&
      data.nextDueOn.getTime() <= data.performedOn.getTime()
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["nextDueOn"],
        message: "Next due date must be after the performed date",
      });
    }
  });

export type MaintenanceCreateInput = z.infer<typeof maintenanceCreateSchema>;

/** Query for GET /api/maintenance/upcoming. */
export const upcomingQuerySchema = z.object({
  scope: z.enum(["overdue", "upcoming", "all"]).default("all"),
  days: z.coerce.number().int().min(1).max(365).default(30),
});

export type UpcomingQuery = z.infer<typeof upcomingQuerySchema>;
