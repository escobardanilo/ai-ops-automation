# Supabase setup

The application never runs schema changes automatically. Before starting V1, open the Supabase SQL editor for the configured project and execute:

`migrations/202609120001_ai_ops_v1.sql`

The migration is additive: it creates missing tables, columns, indexes, and enables row-level security. It contains no `DROP`, `DELETE`, or data-reset statements.

The application uses `SUPABASE_SECRET_KEY` only on the server. Do not expose that value through a `NEXT_PUBLIC_` variable or commit it to Git.
