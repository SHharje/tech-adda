// lib/prisma.js
// ─────────────────────────────────────────────────────────────────────
// WHY THIS FILE EXISTS:
// In development, Next.js "hot reloads" your code every time you save.
// If we created a new PrismaClient() on every reload, we'd quickly run
// out of database connections (Neon free tier allows ~100).
//
// The fix: store the client on `globalThis` (a special global object
// that survives hot reloads).  On the FIRST load we create the client;
// on every reload after that we just reuse the existing one.
// ─────────────────────────────────────────────────────────────────────
//
// WHY WE NEED AN ADAPTER:
// Prisma v7 introduced "driver adapters."  Instead of bundling its own
// database driver, Prisma now lets YOU choose which Postgres driver to
// use and pass it in.  This keeps the bundle smaller and lets you use
// drivers optimized for your environment (e.g. serverless).
//
// We use `@prisma/adapter-pg` with the `pg` package — the most common
// Node.js Postgres driver.
// ─────────────────────────────────────────────────────────────────────

import { PrismaClient } from "@/app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Create a Prisma Postgres adapter using your DATABASE_URL.
// This tells Prisma HOW to talk to your Neon database.
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

// In production, always create a fresh client.
// In development, reuse the one stored on globalThis.
const prisma = globalThis.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalThis.prisma = prisma;
}

export default prisma;
