import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

const cwd = process.cwd();
for (const file of ['.env.local', '.env']) {
  const full = path.join(cwd, file);
  if (fs.existsSync(full)) {
    dotenv.config({ path: full, override: false });
  }
}

const resolvedDatabaseUrl =
  process.env.DATABASE_URL && process.env.DATABASE_URL.trim().length > 0
    ? process.env.DATABASE_URL.trim()
    : 'file:./dev.db';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['error', 'warn'],
    datasources: { db: { url: resolvedDatabaseUrl } },
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;
