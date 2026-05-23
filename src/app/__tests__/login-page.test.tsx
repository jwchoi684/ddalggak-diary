// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';

let searchParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useSearchParams: () => searchParams,
}));

const { default: LoginPage } = await import('@/app/login/page');

beforeEach(() => {
  searchParams = new URLSearchParams();
  window.history.replaceState(null, '', '/login');
});
afterEach(() => cleanup());

describe('LoginPage (self-managed Kakao OAuth)', () => {
  it('renders Kakao button with Korean label', () => {
    render(<LoginPage />);
    const btn = screen.getByTestId('kakao-login-button');
    expect(btn.textContent).toContain('카카오로 시작하기');
  });

  it('does not render an email input (regression guard)', () => {
    render(<LoginPage />);
    expect(screen.queryByTestId('login-email-input')).toBeNull();
  });

  it('navigates to /api/auth/kakao/start with next param on click', () => {
    searchParams = new URLSearchParams('redirectTo=/diary/2026-01-01');
    const hrefSetter = vi.fn();
    const originalLocation = window.location;
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        ...originalLocation,
        set href(v: string) { hrefSetter(v); },
      },
    });
    try {
      render(<LoginPage />);
      fireEvent.click(screen.getByTestId('kakao-login-button'));
      expect(hrefSetter).toHaveBeenCalledTimes(1);
      expect(hrefSetter.mock.calls[0][0]).toBe('/api/auth/kakao/start?next=%2Fdiary%2F2026-01-01');
    } finally {
      Object.defineProperty(window, 'location', {
        configurable: true,
        value: originalLocation,
      });
    }
  });

  it('shows Korean message when query has kakao_token_failed error', async () => {
    searchParams = new URLSearchParams('error=kakao_token_failed');
    render(<LoginPage />);
    await waitFor(() => {
      const alert = screen.getByRole('alert');
      expect(alert.textContent).toContain('카카오 토큰 발급에 실패했어요');
    });
  });

  it('falls back to generic Korean message for unknown error_code', async () => {
    searchParams = new URLSearchParams('error=mystery_code');
    render(<LoginPage />);
    await waitFor(() => {
      const alert = screen.getByRole('alert');
      expect(alert.textContent).toContain('로그인에 실패했어요');
    });
  });
});
