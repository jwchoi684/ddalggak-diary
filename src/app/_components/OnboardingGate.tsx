"use client";

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useSettings } from '@/lib/storage/useSettings';

// Paths the gate must not redirect away from. /onboarding itself, the login flow,
// our own Kakao OAuth endpoints, the Supabase callback shim, and api routes.
const EXEMPT_PREFIXES = ['/onboarding', '/login', '/auth/', '/api/'];

function isExempt(pathname: string): boolean {
  return EXEMPT_PREFIXES.some((p) => pathname === p.replace(/\/$/, '') || pathname.startsWith(p));
}

/**
 * Client-side gate. After login, the first time the user lands on any non-exempt
 * page we route them through /onboarding to capture 호칭 + 성별 before showing
 * the rest of the app. Runs only after useSettings has hydrated, so SSR and
 * the initial paint never flash a redirect.
 */
export function OnboardingGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { settings, isReady } = useSettings();

  useEffect(() => {
    if (!isReady) return;
    if (isExempt(pathname)) return;
    if (!settings.onboardingCompleted) {
      router.replace('/onboarding');
    }
  }, [isReady, pathname, settings.onboardingCompleted, router]);

  return <>{children}</>;
}
