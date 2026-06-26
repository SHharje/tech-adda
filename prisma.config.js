// prisma.config.js
// ─────────────────────────────────────────────────────────────────────
// WHY THIS FILE EXISTS:
// In newer Prisma versions, the database connection URL moved OUT of
// schema.prisma and INTO this config file.  Prisma CLI reads this
// file when you run commands like `prisma db push` or `prisma generate`.
//
// The `env()` helper is Prisma's own way to read environment variables
// (from your .env file).  It's similar to process.env but works
// specifically within Prisma's config system.
// ─────────────────────────────────────────────────────────────────────

import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
