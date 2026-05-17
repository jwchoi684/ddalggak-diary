// @vitest-environment happy-dom
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { IconButton } from '@/design-system/IconButton';

afterEach(() => {
  cleanup();
});

describe('IconButton', () => {
  it('renders <button type="button"> with correct aria-label', () => {
    render(<IconButton icon={<span>X</span>} label="닫기" onClick={vi.fn()} />);
    const btn = screen.getByRole('button', { name: '닫기' });
    expect(btn).toBeTruthy();
    expect(btn.getAttribute('type')).toBe('button');
  });

  it('touch-target dimensions are 44x44', () => {
    render(<IconButton icon={<span>X</span>} label="닫기" onClick={vi.fn()} />);
    const btn = screen.getByRole('button') as HTMLElement;
    expect(btn.style.width).toBe('44px');
    expect(btn.style.height).toBe('44px');
  });

  it('onClick fires on click', () => {
    const onClick = vi.fn();
    render(<IconButton icon={<span>X</span>} label="닫기" onClick={onClick} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('disabled prevents onClick from firing', () => {
    const onClick = vi.fn();
    render(
      <IconButton icon={<span>X</span>} label="닫기" onClick={onClick} disabled />,
    );
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('disabled adds opacity-40 and cursor-not-allowed classes', () => {
    render(
      <IconButton icon={<span>X</span>} label="닫기" onClick={vi.fn()} disabled />,
    );
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('opacity-40');
    expect(btn.className).toContain('cursor-not-allowed');
  });

  it('source-guard: has "use client" directive', () => {
    const src = fs.readFileSync(
      path.resolve(process.cwd(), 'src/design-system/IconButton.tsx'),
      'utf8',
    );
    expect(src).toContain('"use client"');
  });
});
