// @vitest-environment happy-dom
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { Toast } from '@/design-system/Toast';

afterEach(() => {
  cleanup();
});

describe('Toast', () => {
  it('renders element when open=true', () => {
    render(<Toast message="저장됨" open={true} onClose={() => {}} />);
    expect(screen.getByRole('status')).toBeTruthy();
    expect(screen.getByText('저장됨')).toBeTruthy();
  });

  it('renders nothing when open=false', () => {
    render(<Toast message="저장됨" open={false} onClose={() => {}} />);
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('default role is "status"', () => {
    render(<Toast message="저장됨" open={true} onClose={() => {}} />);
    const el = screen.getByRole('status');
    expect(el.getAttribute('role')).toBe('status');
  });

  it('role="alert" opt-in overrides default', () => {
    render(
      <Toast message="오류 발생" open={true} onClose={() => {}} role="alert" />,
    );
    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('source-guard: has "use client" directive', () => {
    const src = fs.readFileSync(
      path.resolve(process.cwd(), 'src/design-system/Toast.tsx'),
      'utf8',
    );
    expect(src).toContain('"use client"');
  });
});
