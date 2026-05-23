import { describe, it, expect } from 'vitest';
import type { ActivityId } from '@/lib/storage';
import { ACTIVITIES, ACTIVITY_MAP, getActivityItem } from '@/design-system/activities';

const EXPECTED_IDS: ActivityId[] = [
  'meal', 'exercise', 'study', 'cafe', 'walk', 'travel', 'rest', 'work',
];

describe('ACTIVITIES master data', () => {
  it('AC1: has exactly 8 unique ids', () => {
    expect(ACTIVITIES.length).toBe(8);
    const ids = ACTIVITIES.map((a) => a.id);
    expect(new Set(ids).size).toBe(8);
    for (const id of EXPECTED_IDS) {
      expect(ids).toContain(id);
    }
  });

  it('AC2: all colors are valid 7-char hex strings (#XXXXXX)', () => {
    for (const activity of ACTIVITIES) {
      expect(activity.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it('AC3: ACTIVITY_MAP completeness — same size as ACTIVITIES and each id maps correctly', () => {
    expect(Object.keys(ACTIVITY_MAP).length).toBe(ACTIVITIES.length);
    for (const activity of ACTIVITIES) {
      expect(ACTIVITY_MAP[activity.id]).toEqual(activity);
    }
  });

  it('AC4: getActivityItem throws on unknown id', () => {
    expect(() => getActivityItem('unknown' as unknown as ActivityId)).toThrow(
      'Unknown ActivityId: unknown',
    );
  });
});

describe('ACTIVITIES Korean labels', () => {
  it('has correct Korean labels for all 8 activities', () => {
    const labelMap: Record<ActivityId, string> = {
      meal: '식사',
      exercise: '운동',
      study: '공부',
      cafe: '카페',
      walk: '산책',
      travel: '여행',
      rest: '휴식',
      work: '일/업무',
    };
    for (const activity of ACTIVITIES) {
      expect(activity.label).toBe(labelMap[activity.id]);
    }
  });
});
