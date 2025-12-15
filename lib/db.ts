import { PrismaClient } from "./generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Prisma Client instance for Prisma 7
 * 
 * Prisma 7 requires either an adapter or accelerateUrl.
 * 
 * - If DATABASE_URL starts with "prisma+", it's a Prisma Accelerate URL - use accelerateUrl
 * - Otherwise, use PostgreSQL adapter with connection pool
 * 
 * For Vercel Postgres:
 * - DATABASE_URL will be set automatically by Vercel
 * - Or use POSTGRES_PRISMA_URL for pooled connections
 */
const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL;

// Check if it's a Prisma Accelerate URL
const isAccelerateUrl = databaseUrl?.startsWith("prisma+");

let adapter;
let accelerateUrl;

if (isAccelerateUrl) {
  // Use Prisma Accelerate
  accelerateUrl = databaseUrl;
} else if (databaseUrl) {
  // Use PostgreSQL adapter
  const pool = new Pool({ connectionString: databaseUrl });
  adapter = new PrismaPg(pool);
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    ...(adapter && { adapter }),
    ...(accelerateUrl && { accelerateUrl }),
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  } as any);

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
