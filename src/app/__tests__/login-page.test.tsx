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
  signInWithOAuth.mockResolvedValue({ data: { provider: 'kakao', url: 'x' }, error: null });
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

  it('invokes supabase OAuth with provider=kakao on click', () => {
    searchParams = new URLSearchParams('redirectTo=/diary/2026-01-01');
    render(<LoginPage />);
    fireEvent.click(screen.getByTestId('kakao-login-button'));
    expect(signInWithOAuth).toHaveBeenCalledWith({
      provider: 'kakao',
      options: {
        redirectTo: expect.stringContaining('/auth/callback?next=%2Fdiary%2F2026-01-01'),
        scopes: 'profile_nickname',
      },
    });
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
