import React from 'react';

export default function NotFound() {
  return (
    <main className="px-6 py-8 text-charcoal">
      <h1 className="text-3xl">찾을 수 없는 페이지입니다.</h1>
      <p className="mt-2 text-meta">
        주소를 확인하거나{' '}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/" className="underline">
          캘린더로 돌아가세요
        </a>
        .
      </p>
    </main>
  );
}
