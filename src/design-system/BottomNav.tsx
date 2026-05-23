"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Routes } from '@/lib/navigation';

/**
 * BottomNav — persistent 5-tab bottom navigation for the main app screens.
 *
 * Tabs (left → right): 캘린더 / 리스트 / 통계 / 채팅 / 설정
 *
 * Rendered only on the main top-level screens. Focused workflows (editor,
 * persona picker, active chat session, read-only past conversation) deliberately
 * omit it so they're not interrupted; those screens have their own back/close
 * affordances.
 *
 * Active tab matches via the longest pathname prefix that is one of the five
 * tab roots — so /list?month=2026-05 still highlights 리스트, etc.
 */

interface Tab {
  href: string;
  label: string;
  icon: React.ReactNode;
}

const CalendarIcon = (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const ListIcon = (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="8" y1="6" x2="21" y2="6" />
    <line x1="8" y1="12" x2="21" y2="12" />
    <line x1="8" y1="18" x2="21" y2="18" />
    <line x1="3" y1="6" x2="3.01" y2="6" />
    <line x1="3" y1="12" x2="3.01" y2="12" />
    <line x1="3" y1="18" x2="3.01" y2="18" />
  </svg>
);

const StatsIcon = (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="18" y="3" width="4" height="18" />
    <rect x="11" y="9" width="4" height="12" />
    <rect x="4" y="14" width="4" height="7" />
  </svg>
);

const ChatIcon = (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
  </svg>
);

const SettingsIcon = (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const TABS: Tab[] = [
  { href: Routes.calendar, label: '캘린더', icon: CalendarIcon },
  { href: Routes.list, label: '리스트', icon: ListIcon },
  { href: Routes.stats, label: '통계', icon: StatsIcon },
  { href: Routes.chat, label: '채팅', icon: ChatIcon },
  { href: Routes.settings, label: '설정', icon: SettingsIcon },
];

function isActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`) || pathname.startsWith(`${href}?`);
}

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="주 메뉴"
      data-testid="bottom-nav"
      className="sticky bottom-0 z-20 bg-paper border-t border-meta/20 flex items-stretch justify-around"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      {TABS.map((tab) => {
        const active = isActive(pathname, tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-label={tab.label}
            aria-current={active ? 'page' : undefined}
            data-testid={`bottom-nav-tab-${tab.label}`}
            data-active={active}
            className={`flex flex-col items-center justify-center gap-0.5 flex-1 min-h-[56px] px-1 ${
              active ? 'text-peach-dark' : 'text-meta'
            }`}
          >
            <span aria-hidden="true">{tab.icon}</span>
            <span className={`text-[11px] ${active ? 'font-semibold' : 'font-normal'}`}>
              {tab.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
