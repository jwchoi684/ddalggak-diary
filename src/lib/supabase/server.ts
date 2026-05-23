import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Server-side Supabase client for Server Components, Route Handlers, and Server Actions.
 *
 * - Uses the anon key — RLS policies enforce per-user isolation.
 * - Reads/writes auth cookies via next/headers cookies().
 * - Must be called inside a request scope (cookies() throws otherwise).
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // setAll called from a Server Component is a no-op — middleware refreshes the session.
          }
        },
      },
    },
  );
}
