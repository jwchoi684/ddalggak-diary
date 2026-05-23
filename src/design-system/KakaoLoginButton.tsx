"use client";

import React from 'react';

interface KakaoLoginButtonProps {
  onClick: () => void;
  disabled?: boolean;
  label?: string;
  'data-testid'?: string;
}

/**
 * Kakao-branded sign-in button.
 *
 * Follows the Kakao Login design guideline (https://developers.kakao.com/docs/latest/ko/kakaologin/design-guide):
 * background #FEE500, label color rgba(0,0,0,0.85), inline speech-bubble icon.
 */
export function KakaoLoginButton({
  onClick,
  disabled = false,
  label = '카카오로 시작하기',
  'data-testid': testId = 'kakao-login-button',
}: KakaoLoginButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      data-testid={testId}
      aria-label={label}
      className="w-full min-h-[48px] px-4 rounded-xl flex items-center justify-center gap-2 text-sm font-medium disabled:opacity-60 transition-opacity"
      style={{ backgroundColor: '#FEE500', color: 'rgba(0,0,0,0.85)' }}
    >
      <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
        <path
          d="M10 3C5.58 3 2 5.86 2 9.39c0 2.27 1.5 4.27 3.78 5.41-.17.6-.6 2.18-.69 2.52-.1.42.15.42.32.31.13-.09 2.07-1.41 2.9-1.98.55.08 1.12.13 1.69.13 4.42 0 8-2.86 8-6.39S14.42 3 10 3z"
          fill="currentColor"
        />
      </svg>
      {label}
    </button>
  );
}
