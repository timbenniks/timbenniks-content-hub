import { PrismaClient } from "./generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Prisma Client instance for Prisma 7 with Neon Postgres
 * 
 * Prisma 7 requires either an adapter or accelerateUrl.
 * 
 * For Neon Postgres:
 * - Uses Neon's serverless adapter for optimal serverless performance
 * - DATABASE_URL should be your Neon connection string
 * - Works seamlessly with Vercel's serverless functions
 * 
 * Environment variables:
 * - DATABASE_URL: Neon connection string (required)
 * - Or POSTGRES_URL: Fallback if DATABASE_URL not set
 */
const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;

// Check if it's a Prisma Accelerate URL
const isAccelerateUrl = databaseUrl?.startsWith("prisma+");

let adapter;
let accelerateUrl;

if (isAccelerateUrl) {
  // Use Prisma Accelerate
  accelerateUrl = databaseUrl;
} else if (databaseUrl) {
  // Use Neon serverless adapter
  // PrismaNeon accepts a PoolConfig, which can be a connection string
  adapter = new PrismaNeon({ connectionString: databaseUrl });
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    ...(adapter && { adapter }),
    ...(accelerateUrl && { accelerateUrl }),
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  } as any);

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
