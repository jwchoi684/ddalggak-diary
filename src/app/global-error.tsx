"use client";

import React, { useEffect } from 'react';

/**
 * Last-resort error boundary. Catches errors raised in the root layout itself
 * (and anything not handled by a route-segment error.tsx). Must render its own
 * <html>/<body> because the layout never mounted.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[global-error]', error);
  }, [error]);

  return (
    <html lang="ko">
      <body style={{ background: '#FAF6EE', color: '#2A2A2A', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{
          minHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          textAlign: 'center',
        }}>
          <h1 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '8px' }}>
            치명적 오류가 발생했어요
          </h1>
          <p style={{ color: '#888', fontSize: '14px', maxWidth: '24rem', marginBottom: '16px' }}>
            앱의 가장 바깥쪽에서 오류가 났습니다. 아래 메시지를 캡처해서 알려주세요.
          </p>
          <pre style={{
            background: '#fff',
            color: '#2A2A2A',
            fontSize: '12px',
            textAlign: 'left',
            borderRadius: '8px',
            padding: '12px',
            maxWidth: '24rem',
            width: '100%',
            overflowX: 'auto',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            marginBottom: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          }}>
            {error.message || '알 수 없는 오류'}
            {error.digest ? `\n\n[digest] ${error.digest}` : ''}
          </pre>
          <button
            type="button"
            onClick={reset}
            style={{
              minHeight: '44px',
              padding: '0 16px',
              borderRadius: '9999px',
              background: '#F5C896',
              color: '#2A2A2A',
              fontSize: '14px',
              fontWeight: 500,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            다시 시도
          </button>
        </div>
      </body>
    </html>
  );
}
