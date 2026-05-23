import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Run on Vercel's Seoul edge so Korean users don't pay a trans-Pacific round trip
// (default region is iad1 / Washington D.C.).
export const preferredRegion = 'icn1';
export const runtime = 'nodejs';

interface KakaoTokenResponse {
  access_token: string;
  refresh_token?: string;
  token_type?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
}

interface KakaoUserInfo {
  id: number;
  properties?: { nickname?: string; profile_image?: string };
  kakao_account?: { profile?: { nickname?: string; profile_image_url?: string } };
}

function fail(origin: string, code: string, detail?: string) {
  const params = new URLSearchParams({ error: code });
  if (detail) params.set('detail', detail);
  return NextResponse.redirect(new URL(`/login?${params.toString()}`, origin));
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('state') ?? '/';
  const kakaoError = url.searchParams.get('error');

  if (kakaoError) {
    return fail(url.origin, kakaoError, url.searchParams.get('error_description') ?? undefined);
  }
  if (!code) return fail(url.origin, 'missing_code');

  const clientId = process.env.KAKAO_REST_API_KEY;
  const clientSecret = process.env.KAKAO_CLIENT_SECRET;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!clientId || !clientSecret || !supabaseUrl || !anonKey || !serviceKey) {
    return fail(url.origin, 'kakao_config_missing');
  }

  // 1. Kakao code → access_token
  const tokenRes = await fetch('https://kauth.kakao.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: `${url.origin}/api/auth/kakao/callback`,
      code,
    }),
  });
  const tokenJson = (await tokenRes.json()) as KakaoTokenResponse;
  if (!tokenRes.ok || !tokenJson.access_token) {
    return fail(url.origin, 'kakao_token_failed', tokenJson.error_description ?? tokenJson.error);
  }

  // 2. access_token → Kakao user info
  const userRes = await fetch('https://kapi.kakao.com/v2/user/me', {
    headers: { Authorization: `Bearer ${tokenJson.access_token}` },
  });
  if (!userRes.ok) return fail(url.origin, 'kakao_user_failed');
  const kakaoUser = (await userRes.json()) as KakaoUserInfo;
  const kakaoId = String(kakaoUser.id);
  const nickname =
    kakaoUser.kakao_account?.profile?.nickname ?? kakaoUser.properties?.nickname ?? '';
  const pseudoEmail = `kakao_${kakaoId}@kakao.local`;

  // 3. Supabase admin: find-or-create user keyed by pseudoEmail
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Try to create first — Supabase returns a stable error code when the email
  // already exists, which lets us skip the expensive listUsers scan in the
  // common return-visit case.
  let userId: string | null = null;
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: pseudoEmail,
    email_confirm: true,
    user_metadata: { provider: 'kakao', kakao_id: kakaoId, nickname },
  });
  if (created?.user) {
    userId = created.user.id;
  } else if (createErr) {
    const isDup =
      (createErr.code && /(already|exist|registered|duplicate)/i.test(createErr.code)) ||
      /(already|exist|registered|duplicate)/i.test(createErr.message || '');
    if (!isDup) {
      return fail(url.origin, 'user_create_failed', createErr.message);
    }
    // Returning user — fall back to a paged scan only when create says "exists".
    const { data: existing } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const found = existing?.users.find((u) => u.email === pseudoEmail);
    if (!found) return fail(url.origin, 'user_lookup_failed');
    userId = found.id;
  } else {
    return fail(url.origin, 'user_create_failed');
  }

  // 4. Mint a one-time magic link, then verify it server-side so @supabase/ssr writes
  //    the session cookies onto our response.
  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: pseudoEmail,
  });
  const hashedToken = linkData?.properties?.hashed_token;
  if (linkErr || !hashedToken) {
    return fail(url.origin, 'link_failed', linkErr?.message);
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(supabaseUrl, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          cookieStore.set(name, value, options);
        }
      },
    },
  });
  const { error: verifyErr } = await supabase.auth.verifyOtp({
    type: 'magiclink',
    token_hash: hashedToken,
  });
  if (verifyErr) {
    return fail(url.origin, 'verify_failed', verifyErr.message);
  }

  return NextResponse.redirect(new URL(next.startsWith('/') ? next : '/', url.origin));
}
