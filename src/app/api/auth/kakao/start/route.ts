import { NextResponse, type NextRequest } from 'next/server';

/**
 * Begin our own Kakao OAuth flow. We bypass Supabase's hosted Kakao provider because
 * GoTrue hardcodes a fail if Kakao user info lacks email, and account_email scope
 * requires Kakao 비즈앱 인증 which this app does not have.
 *
 * Flow:
 *   /api/auth/kakao/start?next=/some/path
 *     → 302 to https://kauth.kakao.com/oauth/authorize?... (scope=profile_nickname only)
 *     → Kakao consent
 *     → /api/auth/kakao/callback?code=...&state=<next>
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const next = url.searchParams.get('next') ?? '/';

  const clientId = process.env.KAKAO_REST_API_KEY;
  if (!clientId) {
    return NextResponse.redirect(new URL('/login?error=kakao_config_missing', url.origin));
  }

  const authorize = new URL('https://kauth.kakao.com/oauth/authorize');
  authorize.searchParams.set('client_id', clientId);
  authorize.searchParams.set('redirect_uri', `${url.origin}/api/auth/kakao/callback`);
  authorize.searchParams.set('response_type', 'code');
  authorize.searchParams.set('scope', 'profile_nickname');
  // Carry the post-login destination through OAuth state.
  authorize.searchParams.set('state', next);

  return NextResponse.redirect(authorize.toString());
}
