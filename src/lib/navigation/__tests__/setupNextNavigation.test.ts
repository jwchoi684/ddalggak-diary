// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import {
  mockRouter,
  mockNotFound,
  resetNavigationMocks,
} from '@/lib/navigation/__tests__/setupNextNavigation';

describe('setupNextNavigation helper', () => {
  it('mockRouter.push is a callable vi.fn (mock.calls is an array)', () => {
    mockRouter.push('/test');
    expect(Array.isArray(mockRouter.push.mock.calls)).toBe(true);
    expect(mockRouter.push.mock.calls.length).toBe(1);
    mockRouter.push.mockReset();
  });

  it('mockNotFound() throws Error with message "NEXT_NOT_FOUND"', () => {
    expect(() => mockNotFound()).toThrow('NEXT_NOT_FOUND');
    mockNotFound.mockReset().mockImplementation(() => { throw new Error('NEXT_NOT_FOUND'); });
  });

  it('resetNavigationMocks() clears mockRouter.push call history AND re-applies the throw behavior on mockNotFound after a manual mockReset()', () => {
    mockRouter.push('x');
    mockNotFound.mockReset(); // clears throw behavior
    resetNavigationMocks();
    expect(mockRouter.push.mock.calls).toHaveLength(0);
    expect(() => mockNotFound()).toThrow('NEXT_NOT_FOUND');
  });
});
