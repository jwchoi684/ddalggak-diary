// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';

const signInWithOAuth = vi.fn();
let searchParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useSearchParams: () => searchParams,
}));

vi.mock('@/lib/supabase/client', () => ({
  createSupabaseBrowserClient: () => ({
    auth: { signInWithOAuth },
  }),
}));

const { default: LoginPage } = await import('@/app/login/page');

beforeEach(() => {
  signInWithOAuth.mockReset();
  // Default to a realistic Supabase-generated URL that includes the GoTrue default scope
  // we need to override on the client.
  signInWithOAuth.mockResolvedValue({
    data: {
      provider: 'kakao',
      url: 'https://kauth.kakao.com/oauth/authorize?client_id=abc&redirect_uri=https%3A%2F%2Fsb%2Fauth%2Fv1%2Fcallback&response_type=code&scope=account_email+profile_image+profile_nickname&state=xyz',
    },
    error: null,
  });
  searchParams = new URLSearchParams();
  window.history.replaceState(null, '', '/login');
});
afterEach(() => cleanup());

describe('LoginPage (Kakao-only)', () => {
  it('renders Kakao button with Korean label', () => {
    render(<LoginPage />);
    const btn = screen.getByTestId('kakao-login-button');
    expect(btn.textContent).toContain('카카오로 시작하기');
  });

  it('does not render an email input (regression guard)', () => {
    render(<LoginPage />);
    expect(screen.queryByTestId('login-email-input')).toBeNull();
  });

  it('invokes supabase OAuth with provider=kakao and skipBrowserRedirect on click', () => {
    searchParams = new URLSearchParams('redirectTo=/diary/2026-01-01');
    render(<LoginPage />);
    fireEvent.click(screen.getByTestId('kakao-login-button'));
    expect(signInWithOAuth).toHaveBeenCalledWith({
      provider: 'kakao',
      options: {
        redirectTo: expect.stringContaining('/auth/callback?next=%2Fdiary%2F2026-01-01'),
        skipBrowserRedirect: true,
      },
    });
  });

  it('rewrites the OAuth URL scope to profile_nickname only before redirecting', async () => {
    const hrefSetter = vi.fn();
    const originalLocation = window.location;
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        ...originalLocation,
        get origin() { return 'https://app.test'; },
        set href(v: string) { hrefSetter(v); },
      },
    });
    try {
      render(<LoginPage />);
      fireEvent.click(screen.getByTestId('kakao-login-button'));
      await waitFor(() => expect(hrefSetter).toHaveBeenCalledTimes(1));
      const sentUrl = new URL(hrefSetter.mock.calls[0][0]);
      expect(sentUrl.searchParams.get('scope')).toBe('profile_nickname');
      expect(sentUrl.searchParams.get('state')).toBe('xyz');
      expect(sentUrl.searchParams.get('client_id')).toBe('abc');
    } finally {
      Object.defineProperty(window, 'location', {
        configurable: true,
        value: originalLocation,
      });
    }
  });

  it('shows Korean message when hash contains otp_expired error', async () => {
    window.history.replaceState(null, '', '/login#error=access_denied&error_code=otp_expired');
    render(<LoginPage />);
    await waitFor(() => {
      const alert = screen.getByRole('alert');
      expect(alert.textContent).toContain('링크가 만료됐어요');
    });
  });

  it('falls back to generic Korean message for unknown error_code', async () => {
    window.history.replaceState(null, '', '/login#error=server_error&error_code=mystery_code');
    render(<LoginPage />);
    await waitFor(() => {
      const alert = screen.getByRole('alert');
      expect(alert.textContent).toContain('로그인에 실패했어요');
    });
  });
});
