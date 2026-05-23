"use client";

import React, { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

/**
 * Magic-link login screen.
 *
 * User enters an email, we call signInWithOtp, and Supabase emails them a link
 * that routes back to /auth/callback. On success the middleware lets them through.
 */
function LoginPageInner() {
  const search = useSearchParams();
  const redirectTo = search.get('redirectTo') ?? '/';
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string>('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;

    setStatus('sending');
    setErrorMsg('');

    const supabase = createSupabaseBrowserClient();
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const { error } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: {
        emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
      },
    });

    if (error) {
      setStatus('error');
      setErrorMsg(error.message);
      return;
    }
    setStatus('sent');
  }

  return (
    <div className="min-h-[100dvh] bg-cream flex flex-col items-center justify-center px-6">
      <h1 className="text-3xl font-bold text-charcoal mb-2">딸깍일기</h1>
      <p className="text-meta text-sm mb-8">이메일로 로그인 링크를 받으세요</p>

      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-3">
        <input
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={status === 'sending' || status === 'sent'}
          data-testid="login-email-input"
          className="w-full min-h-[48px] px-4 rounded-xl border border-meta/30 bg-paper text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-peach"
        />
        <button
          type="submit"
          disabled={status === 'sending' || status === 'sent'}
          data-testid="login-submit"
          className="w-full min-h-[48px] px-4 rounded-xl bg-charcoal text-paper text-sm font-medium disabled:opacity-60"
        >
          {status === 'sending' ? '보내는 중…' : status === 'sent' ? '확인 메일을 보냈어요' : '로그인 링크 받기'}
        </button>
      </form>

      {status === 'sent' && (
        <p className="text-meta text-xs mt-4 max-w-sm text-center">
          {email} 로 보낸 메일의 링크를 눌러주세요. 이 탭은 닫아도 됩니다.
        </p>
      )}
      {status === 'error' && (
        <p className="text-[#C04040] text-xs mt-4 max-w-sm text-center" role="alert">
          {errorMsg || '로그인 메일을 보내지 못했어요. 잠시 후 다시 시도해주세요.'}
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
