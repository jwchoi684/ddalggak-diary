"use client";

import { createBrowserClient } from '@supabase/ssr';

/**
 * Browser-side Supabase client.
 *
 * - Reads NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY at runtime.
 * - Each call returns a fresh client; @supabase/ssr handles cookie sync via the
 *   middleware (src/middleware.ts) so server and browser stay logged in together.
 * - NEVER use the service-role key here.
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
