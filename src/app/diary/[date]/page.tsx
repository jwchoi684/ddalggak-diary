import React from 'react';
import { notFound } from 'next/navigation';
import { Editor } from './_components/Editor';

interface PageProps {
  params: Promise<{ date: string }>;
}

export default async function DiaryPage({ params }: PageProps) {
  const { date } = await params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) notFound();
  return <Editor date={date} />;
}
