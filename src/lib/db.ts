import { PrismaClient as SqlitePrismaClient } from "@prisma/client";
import { PrismaClient as PostgresPrismaClient } from "@prisma/client-postgresql";

type PrismaClient = InstanceType<typeof SqlitePrismaClient>;
const log = process.env.NODE_ENV === "development" ? (["error", "warn"] as const) : (["error"] as const);

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient(): PrismaClient {
  if (process.env.DATABASE_PROVIDER === "postgresql") {
    return new PostgresPrismaClient({ log: [...log] }) as unknown as PrismaClient;
  }
  return new SqlitePrismaClient({ log: [...log] });
}

export const prisma =
  globalForPrisma.prisma ??
  createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export function isPrismaUniqueConstraintError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}