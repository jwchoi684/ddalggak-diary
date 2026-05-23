import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * OAuth / magic-link callback. The provider (Supabase Auth) redirects here with
 * a `code` query param. We exchange the code for a session and bounce to `next`.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') ?? '/';

  // Supabase forwards provider errors via the query string when they happen
  // before code exchange (consent denied, invalid scope, etc.).
  const providerError = url.searchParams.get('error');
  if (providerError) {
    const errorCode = url.searchParams.get('error_code') ?? providerError;
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(errorCode)}`, url.origin),
    );
  }

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, url.origin));
    }
    console.error('[auth/callback] exchangeCodeForSession failed:', error.message, error.status);
    return NextResponse.redirect(
      new URL(
        `/login?error=exchange_failed&detail=${encodeURIComponent(error.message)}`,
        url.origin,
      ),
    );
  }

  return NextResponse.redirect(
    new URL('/login?error=missing_code', url.origin),
  );
}
