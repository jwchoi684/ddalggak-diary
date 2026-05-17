// @vitest-environment happy-dom
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { EmptyState } from '@/design-system/EmptyState';

afterEach(() => {
  cleanup();
});

describe('EmptyState', () => {
  it('renders all 4 slots when provided', () => {
    render(
      <EmptyState
        icon={<span data-testid="icon">🌸</span>}
        title="제목"
        description="설명입니다"
        action={<button data-testid="action">버튼</button>}
      />,
    );
    expect(screen.getByTestId('icon')).toBeTruthy();
    expect(screen.getByText('제목')).toBeTruthy();
    expect(screen.getByText('설명입니다')).toBeTruthy();
    expect(screen.getByTestId('action')).toBeTruthy();
  });

  it('omits absent optional slots', () => {
    render(<EmptyState title="제목만" />);
    expect(screen.queryByTestId('icon')).toBeNull();
    expect(screen.queryByText('설명')).toBeNull();
    expect(screen.queryByTestId('action')).toBeNull();
  });

  it('string title is wrapped in a <p> element', () => {
    render(<EmptyState title="빈 목록" />);
    const p = screen.getByText('빈 목록');
    expect(p.tagName).toBe('P');
  });

  it('ReactNode title rendered as-is without intermediate <p>', () => {
    render(<EmptyState title={<h2>제목</h2>} />);
    const h2 = screen.getByRole('heading', { level: 2 });
    expect(h2).toBeTruthy();
    expect(h2.closest('p')).toBeNull();
  });

  it('merges extra className onto root element', () => {
    render(<EmptyState title="테스트" className="my-layout" />);
    const root = document.querySelector('.my-layout') as HTMLElement;
    expect(root).toBeTruthy();
  });

  it('description text is present when provided', () => {
    render(<EmptyState title="제목" description="설명입니다" />);
    expect(screen.getByText('설명입니다')).toBeTruthy();
  });

  it('source-guard: no "use client" directive', () => {
    const src = fs.readFileSync(
      path.resolve(process.cwd(), 'src/design-system/EmptyState.tsx'),
      'utf8',
    );
    expect(src).not.toContain('"use client"');
  });
});
