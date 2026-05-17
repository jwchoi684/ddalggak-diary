// @vitest-environment happy-dom
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { FAB } from '@/design-system/FAB';

afterEach(() => {
  cleanup();
});

describe('FAB', () => {
  it('renders <button type="button"> with correct aria-label', () => {
    render(<FAB icon={<span>+</span>} label="새 일기 작성" onClick={vi.fn()} />);
    const btn = screen.getByRole('button', { name: '새 일기 작성' });
    expect(btn).toBeTruthy();
    expect(btn.getAttribute('type')).toBe('button');
  });

  it('touch-target dimensions are 56x56', () => {
    render(<FAB icon={<span>+</span>} label="새 일기 작성" onClick={vi.fn()} />);
    const btn = screen.getByRole('button') as HTMLElement;
    expect(btn.style.width).toBe('56px');
    expect(btn.style.height).toBe('56px');
  });

  it('onClick fires on click', () => {
    const onClick = vi.fn();
    render(<FAB icon={<span>+</span>} label="새 일기 작성" onClick={onClick} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('default fixed positioning and charcoal background classes', () => {
    render(<FAB icon={<span>+</span>} label="새 일기 작성" onClick={vi.fn()} />);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('fixed');
    expect(btn.className).toContain('bottom-6');
    expect(btn.className).toContain('right-6');
    expect(btn.className).toContain('bg-charcoal');
  });

  it('source-guard: has "use client" directive', () => {
    const src = fs.readFileSync(
      path.resolve(process.cwd(), 'src/design-system/FAB.tsx'),
      'utf8',
    );
    expect(src).toContain('"use client"');
  });
});
