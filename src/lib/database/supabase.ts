import "server-only";

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database/types";

let client: ReturnType<typeof createClient<Database>> | null = null;

export function isDatabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SECRET_KEY
  );
}

export function getSupabase() {
  if (client) {
    return client;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !supabaseSecretKey) {
    throw new DatabaseError(
      "Supabase environment variables are not configured.",
      "ENV_MISSING"
    );
  }

  client = createClient<Database>(supabaseUrl, supabaseSecretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return client;
}

export class DatabaseError extends Error {
  constructor(message: string, public readonly code?: string) {
    super(message);
    this.name = "DatabaseError";
  }
}

export function assertDatabaseResult(error: { message: string; code?: string } | null) {
  if (error) {
    throw new DatabaseError(error.message, error.code);
  }
}
