import React from 'react';
import { notFound } from 'next/navigation';

interface PageProps {
  params: Promise<{ date: string }>;
}

export default async function DiaryPage({ params }: PageProps) {
  const { date } = await params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) notFound();
  return (
    <main className="px-6 py-8 text-charcoal">
      <h1 className="text-3xl">{date} 일기</h1>
      <p className="mt-2 text-meta">REQ-009에서 채워집니다.</p>
    </main>
  );
}
