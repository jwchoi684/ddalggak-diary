"use client";

import React, { useEffect } from 'react';
import Link from 'next/link';

/**
 * Route-segment error boundary. Renders when any client component thrown error
 * isn't handled by a deeper boundary. Shows the actual error message + digest
 * so the user (and we, when they screenshot it) can see what broke instead of
 * the generic "Application error" wall.
 */
export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface to the browser console / Vercel logs too.
    console.error('[route-error]', error);
  }, [error]);

  return (
    <div className="min-h-[100dvh] bg-cream flex flex-col items-center justify-center px-6 text-center">
      <h1 className="text-xl font-semibold text-charcoal mb-2">문제가 발생했어요</h1>
      <p className="text-meta text-sm mb-4 max-w-sm">
        화면을 그리는 중 오류가 났습니다. 아래 메시지를 캡처해서 알려주시면 더 빨리 해결할 수 있어요.
      </p>

      <pre className="bg-paper text-charcoal text-xs text-left rounded-lg p-3 max-w-sm w-full overflow-x-auto whitespace-pre-wrap break-words mb-3"
        style={{ boxShadow: 'var(--shadow-card)' }}>
        {error.message || '알 수 없는 오류'}
        {error.digest ? `\n\n[digest] ${error.digest}` : ''}
      </pre>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={reset}
          className="min-h-[44px] px-4 rounded-full bg-peach text-charcoal text-sm font-medium"
        >
          다시 시도
        </button>
        <Link
          href="/"
          className="min-h-[44px] px-4 rounded-full border border-meta text-charcoal text-sm font-medium flex items-center"
        >
          처음 화면으로
        </Link>
      </div>
    </div>
  );
}
