// @vitest-environment happy-dom
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import NotFound from '@/app/not-found';

afterEach(() => cleanup());

describe('NotFound page', () => {
  it('renders the Korean message "찾을 수 없는 페이지입니다."', () => {
    render(<NotFound />);
    expect(screen.getByText('찾을 수 없는 페이지입니다.')).toBeTruthy();
  });

  it('renders an anchor with href="/" and text content "캘린더로 돌아가세요"', () => {
    render(<NotFound />);
    const anchor = screen.getByRole('link', { name: '캘린더로 돌아가세요' });
    expect(anchor.getAttribute('href')).toBe('/');
  });

  it('source-guard: src/app/not-found.tsx contains no "use client" directive', () => {
    const src = fs.readFileSync(
      path.resolve(process.cwd(), 'src/app/not-found.tsx'),
      'utf8',
    );
    expect(src).not.toContain('"use client"');
  });
});
