"use client";

import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { KakaoLoginButton } from '@/design-system/KakaoLoginButton';

const ERROR_MESSAGES: Record<string, string> = {
  access_denied: '로그인을 취소했어요.',
  kakao_token_failed: '카카오 토큰 발급에 실패했어요.',
  kakao_user_failed: '카카오 사용자 정보를 가져오지 못했어요.',
  kakao_config_missing: '서버 설정에 문제가 있어요. 관리자에게 문의해주세요.',
  user_create_failed: '계정 생성에 실패했어요.',
  link_failed: '세션 발급에 실패했어요.',
  verify_failed: '세션 검증에 실패했어요.',
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

  function handleKakaoLogin() {
    // Self-managed Kakao OAuth (see /api/auth/kakao/start). We can't use Supabase's
    // hosted Kakao provider because GoTrue requires account_email which the app's
    // Kakao Developers account isn't 비즈앱-verified to request.
    setStatus('redirecting');
    setErrorMsg('');
    window.location.href = `/api/auth/kakao/start?next=${encodeURIComponent(redirectTo)}`;
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
