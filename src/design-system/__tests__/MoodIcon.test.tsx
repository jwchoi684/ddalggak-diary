// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import type { MoodId } from '@/lib/storage';
import { MOOD_MAP } from '@/design-system/moods';
import { MoodIcon } from '@/design-system/MoodIcon';

afterEach(() => {
  cleanup();
});

describe('MoodIcon — valid id', () => {
  it('renders an <img> with role=img for a valid id', () => {
    render(<MoodIcon id="joy" size={32} />);
    const imgs = screen.getAllByRole('img');
    expect(imgs).toHaveLength(1);
    expect((imgs[0] as HTMLImageElement).tagName).toBe('IMG');
  });

  it('img src points to the illustrated PNG asset', () => {
    render(<MoodIcon id="joy" size={32} />);
    const img = screen.getByRole('img') as HTMLImageElement;
    expect(img.getAttribute('src')).toBe('/moods/joy.png');
  });

  it('alt text equals the Korean Mood.label', () => {
    render(<MoodIcon id="joy" size={32} />);
    expect(screen.getByRole('img').getAttribute('alt')).toBe(MOOD_MAP['joy'].label);
  });

  it('inline width and height equal the size prop — tested at size=32 and size=80', () => {
    const { rerender } = render(<MoodIcon id="joy" size={32} />);
    let el = screen.getByRole('img') as HTMLElement;
    expect(el.style.width).toBe('32px');
    expect(el.style.height).toBe('32px');

    rerender(<MoodIcon id="joy" size={80} />);
    el = screen.getByRole('img') as HTMLElement;
    expect(el.style.width).toBe('80px');
    expect(el.style.height).toBe('80px');
  });

  it('className prop is forwarded to the rendered element', () => {
    render(<MoodIcon id="joy" size={32} className="test-class" />);
    expect(screen.getByRole('img').classList.contains('test-class')).toBe(true);
  });
});

describe('MoodIcon — unknown id fallback', () => {
  it('unknown id at runtime renders the fallback span', () => {
    render(<MoodIcon id={'unknown' as unknown as MoodId} size={48} />);
    const fallback = screen.getByTestId('mood-icon-fallback') as HTMLElement;
    expect(fallback).toBeTruthy();
    expect(fallback.getAttribute('aria-label')).toBe('알 수 없는 기분');
  });
});
