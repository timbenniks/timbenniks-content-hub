import { db } from "./db";

/**
 * Clean up orphaned items that don't have a valid source
 * This can happen if items were created before cascade delete was set up
 */
export async function cleanupOrphanedItems(): Promise<{
  deleted: number;
}> {
  // Find all items where the source doesn't exist
  const allItems = await db.item.findMany({
    select: {
      id: true,
      sourceId: true,
    },
  });

  const sourceIds = new Set(
    (await db.source.findMany({ select: { id: true } })).map((s) => s.id)
  );

  const orphanedItemIds = allItems
    .filter((item) => !sourceIds.has(item.sourceId))
    .map((item) => item.id);

  if (orphanedItemIds.length === 0) {
    return { deleted: 0 };
  }

  // Delete orphaned items
  const result = await db.item.deleteMany({
    where: {
      id: {
        in: orphanedItemIds,
      },
    },
  });

  return { deleted: result.count };
}

