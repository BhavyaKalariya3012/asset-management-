import { Prisma, PrismaClient } from "@prisma/client";

/** Accepts the shared PrismaClient or a transaction client. */
type Db = PrismaClient | Prisma.TransactionClient;

const PAD = 4;

/**
 * Compute the next asset code for a category: `RNB-<CATEGORY_CODE>-0001`.
 * Sequence = (count of existing assets whose code starts with the prefix) + 1,
 * zero-padded. `offset` lets callers skip ahead on a retry.
 */
export async function generateAssetCode(
  db: Db,
  categoryCode: string,
  offset = 0
): Promise<string> {
  const prefix = `RNB-${categoryCode}-`;
  const count = await db.asset.count({
    where: { assetCode: { startsWith: prefix } },
  });
  const seq = count + 1 + offset;
  return `${prefix}${String(seq).padStart(PAD, "0")}`;
}

/**
 * Generate a unique asset code and run `create` with it. On a unique-constraint
 * conflict (P2002) it retries exactly once with the next sequence number.
 */
export async function createAssetWithCode<T>(
  db: Db,
  categoryCode: string,
  create: (assetCode: string) => Promise<T>
): Promise<T> {
  try {
    const code = await generateAssetCode(db, categoryCode);
    return await create(code);
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      // Retry once, skipping one sequence position to dodge the collision.
      const code = await generateAssetCode(db, categoryCode, 1);
      return await create(code);
    }
    throw err;
  }
}
