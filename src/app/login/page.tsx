"use client";

import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { KakaoLoginButton } from '@/design-system/KakaoLoginButton';

const ERROR_MESSAGES: Record<string, string> = {
  otp_expired: '링크가 만료됐어요. 다시 시도해주세요.',
  access_denied: '로그인을 취소했어요.',
  provider_email_needs_verification: '카카오 이메일 인증이 필요해요.',
  exchange_failed: '세션 발급에 실패했어요. 다시 시도해주세요.',
  callback_failed: '인증 콜백에 실패했어요. 다시 시도해주세요.',
  missing_code: '인증 코드가 비어있어요. 다시 시도해주세요.',
};
const FALLBACK_ERROR = '로그인에 실패했어요. 잠시 후 다시 시도해주세요.';

function lookupError(code: string | null): string | null {
  if (!code) return null;
  return ERROR_MESSAGES[code] ?? FALLBACK_ERROR;
}

function parseHashError(hash: string): string | null {
  if (!hash || hash.length < 2) return null;
  const params = new URLSearchParams(hash.slice(1));
  return lookupError(params.get('error_code') ?? params.get('error'));
}

function LoginPageInner() {
  const search = useSearchParams();
  const redirectTo = search.get('redirectTo') ?? '/';
  const [status, setStatus] = useState<'idle' | 'redirecting' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string>('');

  useEffect(() => {
    // Errors arrive in either the hash fragment (Supabase implicit failures) or the
    // query string (our /auth/callback route on exchange/missing-code failures).
    const hashMsg = parseHashError(window.location.hash);
    const queryMsg = lookupError(search.get('error'));
    const msg = hashMsg ?? queryMsg;
    if (msg) {
      setErrorMsg(msg);
      setStatus('error');
      window.history.replaceState(null, '', '/login');
    }
  }, [search]);

  async function handleKakaoLogin() {
    setStatus('redirecting');
    setErrorMsg('');

    const supabase = createSupabaseBrowserClient();
    const origin = window.location.origin;
    // Supabase GoTrue forces `account_email profile_image profile_nickname` into the
    // outbound Kakao scope and the SDK has no way to remove items from it. account_email
    // is gated behind Kakao 비즈앱 인증 which this app does not have, so Kakao rejects
    // with KOE205. We work around it by asking Supabase to produce the OAuth URL but not
    // navigate, then rewrite the `scope` query param to only what Kakao 동의항목 covers
    // (profile_nickname). PKCE state / redirect_uri / client_id stay intact so the
    // Supabase callback still validates and exchanges the code.
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: {
        redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
        skipBrowserRedirect: true,
      },
    });

    if (error || !data?.url) {
      setStatus('error');
      setErrorMsg(error?.message || FALLBACK_ERROR);
      return;
    }

    const url = new URL(data.url);
    url.searchParams.set('scope', 'profile_nickname');
    window.location.href = url.toString();
  }

  return (
    <div className="min-h-[100dvh] bg-cream flex flex-col items-center justify-center px-6">
      <h1 className="text-3xl font-bold text-charcoal mb-2">딸깍일기</h1>
      <p className="text-meta text-sm mb-8">카카오로 간편하게 시작하세요</p>

      <div className="w-full max-w-sm">
        <KakaoLoginButton
          onClick={handleKakaoLogin}
          disabled={status === 'redirecting'}
        />
      </div>

      {status === 'error' && (
        <p className="text-[#C04040] text-xs mt-4 max-w-sm text-center" role="alert">
          {errorMsg || FALLBACK_ERROR}
        </p>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-[100dvh] bg-cream" />}>
      <LoginPageInner />
    </Suspense>
  );
}
