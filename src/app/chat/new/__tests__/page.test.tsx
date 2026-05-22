// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import {
  mockRouter,
  mockUseRouter,
  mockUseParams,
  mockUsePathname,
  resetNavigationMocks,
} from '@/lib/navigation/__tests__/setupNextNavigation';
import { PERSONAS } from '@/design-system/personas';

vi.mock('next/navigation', () => ({
  useRouter: () => mockUseRouter(),
  useSearchParams: () => new URLSearchParams(),
  useParams: () => mockUseParams(),
  usePathname: () => mockUsePathname(),
}));

import PersonaPickerPage from '../page';

beforeEach(() => {
  cleanup();
  resetNavigationMocks();
});

describe('PersonaPickerPage (REQ-016)', () => {
  it('PC1: renders all 14 personas', () => {
    render(<PersonaPickerPage />);
    expect(PERSONAS).toHaveLength(14);
    PERSONAS.forEach((p) => {
      expect(screen.getByTestId(`persona-card-${p.id}`)).toBeTruthy();
    });
  });

  it('PC2: tapping a card calls router.push with personaId', () => {
    render(<PersonaPickerPage />);
    const first = PERSONAS[0];
    fireEvent.click(screen.getByTestId(`persona-card-${first.id}`));
    expect(mockRouter.push).toHaveBeenCalledWith(`/chat/session?personaId=${first.id}`);
  });

  it('PC3: close button fires router.back', () => {
    render(<PersonaPickerPage />);
    fireEvent.click(screen.getByRole('button', { name: '닫기' }));
    expect(mockRouter.back).toHaveBeenCalled();
  });

  it('PC4: each card has correct aria-label', () => {
    render(<PersonaPickerPage />);
    PERSONAS.forEach((p) => {
      expect(screen.getByLabelText(`${p.label} 페르소나로 시작`)).toBeTruthy();
    });
  });
});
