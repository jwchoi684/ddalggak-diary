"use client";

import React, { Suspense, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useDiaries } from '@/lib/storage/useDiaries';
import { StatsHeader } from './_components/StatsHeader';
import { MoodBarChart } from './_components/MoodBarChart';
import { useMoodStats } from './_components/useMoodStats';

const LOADING = (
  <div className="text-center text-meta py-8">불러오는 중…</div>
);

function StatsPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const today = new Date();
  const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const [month, setMonth] = useState<string>(
    searchParams.get('month') ?? currentMonth,
  );

  const { entries, isReady } = useDiaries();
  const stats = useMoodStats(isReady ? entries : [], month);

  return (
    <div className="min-h-screen bg-cream">
      <StatsHeader
        month={month}
        onMonthChange={setMonth}
        onClose={() => router.back()}
      />
      <main className="pb-8">
        {!isReady && LOADING}
        {isReady && <MoodBarChart stats={stats} />}
      </main>
    </div>
  );
}

export default function StatsPage() {
  return (
    <Suspense fallback={LOADING}>
      <StatsPageContent />
    </Suspense>
  );
}
