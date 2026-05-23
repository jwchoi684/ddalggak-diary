"use client";

import React, { Suspense, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useDiaries } from '@/lib/storage/useDiaries';
import { Routes } from '@/lib/navigation';
import { EmptyState } from '@/design-system/EmptyState';
import { BottomNav } from '@/design-system/BottomNav';
import { ListHeader } from './_components/ListHeader';
import { DiaryListCard } from './_components/DiaryListCard';

const LOADING = (
  <div className="text-center text-meta py-8">불러오는 중…</div>
);

function ListPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const today = new Date();
  const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const activeMonth = searchParams.get('month') ?? currentMonth;

  const [sort, setSort] = useState<'asc' | 'desc'>('desc');
  const { entries, isReady } = useDiaries();

  // Prefetch editor for every entry shown in this month so taps feel instant.
  useEffect(() => {
    if (!isReady) return;
    for (const e of entries) {
      if (e.date.slice(0, 7) === activeMonth) router.prefetch(Routes.diary(e.date));
    }
  }, [isReady, entries, activeMonth, router]);

  const filtered = isReady
    ? entries.filter((e) => e.date.slice(0, 7) === activeMonth)
    : [];
  const sorted = [...filtered].sort((a, b) =>
    sort === 'desc'
      ? b.date.localeCompare(a.date)
      : a.date.localeCompare(b.date),
  );

  return (
    <div className="min-h-[100dvh] bg-cream flex flex-col">
      <ListHeader
        month={activeMonth}
        sort={sort}
        onBack={() => router.back()}
        onMonthChange={(m) => router.push(Routes.listWithFilter({ month: m }))}
        onSortToggle={() => setSort((s) => (s === 'desc' ? 'asc' : 'desc'))}
      />
      <main className="flex-1 px-4 pt-4 pb-8">
        {!isReady && LOADING}
        {isReady && sorted.length === 0 && (
          <EmptyState
            className="mt-16"
            title="이 달에는 작성된 일기가 없어요"
            action={
              <button
                type="button"
                onClick={() => router.push(Routes.calendar)}
                className="px-4 py-2 rounded-full bg-peach text-charcoal text-sm font-medium"
              >
                캘린더로 가기
              </button>
            }
          />
        )}
        {isReady && sorted.length > 0 && (
          <div className="space-y-3" key={activeMonth}>
            {sorted.map((e) => (
              <DiaryListCard
                key={e.date}
                entry={e}
                onTap={() => router.push(Routes.diary(e.date))}
              />
            ))}
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
}

export default function ListPage() {
  return (
    <Suspense fallback={LOADING}>
      <ListPageContent />
    </Suspense>
  );
}
