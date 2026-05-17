// @vitest-environment happy-dom
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { Card } from '@/design-system/Card';

afterEach(() => {
  cleanup();
});

describe('Card', () => {
  it('renders children inside a div', () => {
    render(
      <Card>
        <span data-testid="child" />
      </Card>,
    );
    expect(screen.getByTestId('child')).toBeTruthy();
  });

  it('boxShadow style equals var(--shadow-card)', () => {
    render(<Card><span /></Card>);
    const cardEl = document.querySelector('[style]') as HTMLElement;
    expect(cardEl?.style.boxShadow).toBe('var(--shadow-card)');
  });

  it('default radius references --radius-card; large prop switches to --radius-card-lg', () => {
    const { rerender } = render(<Card><span /></Card>);
    let cardEl = document.querySelector('[style]') as HTMLElement;
    expect(cardEl?.className).toContain('--radius-card');

    rerender(<Card large><span /></Card>);
    cardEl = document.querySelector('[style]') as HTMLElement;
    expect(cardEl?.className).toContain('--radius-card-lg');
  });

  it('merges extra className onto root element', () => {
    render(<Card className="extra-class"><span /></Card>);
    const cardEl = document.querySelector('.extra-class') as HTMLElement;
    expect(cardEl).toBeTruthy();
  });

  it('source-guard: no "use client" directive', () => {
    const src = fs.readFileSync(
      path.resolve(process.cwd(), 'src/design-system/Card.tsx'),
      'utf8',
    );
    expect(src).not.toContain('"use client"');
  });
});
