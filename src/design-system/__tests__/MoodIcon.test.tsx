// @vitest-environment happy-dom
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
});
import type { MoodId } from '@/lib/storage';
import { MOOD_MAP } from '@/design-system/moods';
import { MoodIcon } from '@/design-system/MoodIcon';

describe('MoodIcon — valid id', () => {
  it('renders exactly one element with role="img" for a valid id', () => {
    render(<MoodIcon id="joy" size={32} />);
    expect(screen.getAllByRole('img')).toHaveLength(1);
  });

  it('aria-label equals the Korean Mood.label for the given id', () => {
    render(<MoodIcon id="joy" size={32} />);
    expect(screen.getByRole('img').getAttribute('aria-label')).toBe('기쁨');
  });

  it('inline style fontSize equals the size prop at size=32', () => {
    render(<MoodIcon id="joy" size={32} />);
    const el = screen.getByRole('img') as HTMLElement;
    expect(el.style.fontSize).toBe('32px');
  });

  it('inline style width and height equal the size prop — tested at size=32 and size=80', () => {
    const { rerender } = render(<MoodIcon id="joy" size={32} />);
    let el = screen.getByRole('img') as HTMLElement;
    expect(el.style.width).toBe('32px');
    expect(el.style.height).toBe('32px');

    rerender(<MoodIcon id="joy" size={80} />);
    el = screen.getByRole('img') as HTMLElement;
    expect(el.style.width).toBe('80px');
    expect(el.style.height).toBe('80px');
  });

  it('renders the correct emoji as text content for a valid id', () => {
    render(<MoodIcon id="joy" size={32} />);
    // Use MOOD_MAP so no raw emoji literal appears in this test file
    expect(screen.getByRole('img').textContent).toBe(MOOD_MAP['joy'].emoji);
  });

  it('className prop is forwarded to the rendered element', () => {
    render(<MoodIcon id="joy" size={32} className="test-class" />);
    expect(screen.getByRole('img').classList.contains('test-class')).toBe(true);
  });
});

describe('MoodIcon — unknown id fallback', () => {
  it('unknown id at runtime renders the fallback span with correct testid and aria-label', () => {
    render(<MoodIcon id={'unknown' as unknown as MoodId} size={48} />);
    const fallback = screen.getByTestId('mood-icon-fallback') as HTMLElement;
    expect(fallback).toBeTruthy();
    expect(fallback.getAttribute('aria-label')).toBe('알 수 없는 기분');
    expect(fallback.style.width).toBe('48px');
    expect(fallback.style.height).toBe('48px');
  });

  it('fallback span has no text content — no emoji character leaks through', () => {
    render(<MoodIcon id={'unknown' as unknown as MoodId} size={48} />);
    const fallback = screen.getByTestId('mood-icon-fallback');
    expect(fallback.textContent).toBe('');
  });
});

describe('MoodIcon — source guard', () => {
  it('MoodIcon source file contains no "use client" directive', () => {
    const src = fs.readFileSync(
      path.resolve(process.cwd(), 'src/design-system/MoodIcon.tsx'),
      'utf8',
    );
    expect(src).not.toContain('"use client"');
  });
});
