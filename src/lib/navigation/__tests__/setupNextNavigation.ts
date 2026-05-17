import { vi } from 'vitest';

export const mockRouter = {
  push: vi.fn(),
  replace: vi.fn(),
  back: vi.fn(),
  prefetch: vi.fn(),
  refresh: vi.fn(),
  forward: vi.fn(),
};

export const mockNotFound = vi.fn(() => {
  throw new Error('NEXT_NOT_FOUND');
});

export function mockUseRouter() { return mockRouter; }
export function mockUseSearchParams() { return new URLSearchParams(); }
export function mockUseParams(): Record<string, string> { return {}; }
export function mockUsePathname(): string { return '/'; }

export function resetNavigationMocks() {
  mockRouter.push.mockReset();
  mockRouter.replace.mockReset();
  mockRouter.back.mockReset();
  mockRouter.prefetch.mockReset();
  mockRouter.refresh.mockReset();
  mockRouter.forward.mockReset();
  mockNotFound.mockReset().mockImplementation(() => {
    throw new Error('NEXT_NOT_FOUND');
  });
}
