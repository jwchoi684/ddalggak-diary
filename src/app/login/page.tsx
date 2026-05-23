"use client";

import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { KakaoLoginButton } from '@/design-system/KakaoLoginButton';

const ERROR_MESSAGES: Record<string, string> = {
  otp_expired: '링크가 만료됐어요. 다시 시도해주세요.',
  access_denied: '로그인을 취소했어요.',
  provider_email_needs_verification: '카카오 이메일 인증이 필요해요.',
};
const FALLBACK_ERROR = '로그인에 실패했어요. 잠시 후 다시 시도해주세요.';

function parseHashError(hash: string): string | null {
  if (!hash || hash.length < 2) return null;
  const params = new URLSearchParams(hash.slice(1));
  const errorCode = params.get('error_code') ?? params.get('error');
  if (!errorCode) return null;
  return ERROR_MESSAGES[errorCode] ?? FALLBACK_ERROR;
}

function LoginPageInner() {
  const search = useSearchParams();
  const redirectTo = search.get('redirectTo') ?? '/';
  const [status, setStatus] = useState<'idle' | 'redirecting' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string>('');

  useEffect(() => {
    const msg = parseHashError(window.location.hash);
    if (msg) {
      setErrorMsg(msg);
      setStatus('error');
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  }, []);

  async function handleKakaoLogin() {
    setStatus('redirecting');
    setErrorMsg('');

    const supabase = createSupabaseBrowserClient();
    const origin = window.location.origin;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: {
        redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
      },
    });

    if (error) {
      setStatus('error');
      setErrorMsg(error.message || FALLBACK_ERROR);
    }
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
