import { describe, it, expect } from 'vitest';
import type { PickerId } from '@/lib/storage';
import { getPickerItem, isActivityId } from '@/design-system/picker';
import { MOOD_MAP } from '@/design-system/moods';
import { ACTIVITY_MAP } from '@/design-system/activities';

describe('getPickerItem', () => {
  it('PC1: getPickerItem("joy") returns the joy Mood', () => {
    const item = getPickerItem('joy');
    expect(item).toEqual(MOOD_MAP['joy']);
    expect(item.label).toBe('기쁨');
  });

  it('PC2: getPickerItem("meal") returns the meal Activity', () => {
    const item = getPickerItem('meal');
    expect(item).toEqual(ACTIVITY_MAP['meal']);
    expect(item.label).toBe('식사');
  });

  it('throws on unknown id', () => {
    expect(() => getPickerItem('unknown' as unknown as PickerId)).toThrow(
      'Unknown PickerId: unknown',
    );
  });
});

describe('isActivityId', () => {
  it('PC3: isActivityId("joy") returns false', () => {
    expect(isActivityId('joy')).toBe(false);
  });

  it('PC3: isActivityId("meal") returns true', () => {
    expect(isActivityId('meal')).toBe(true);
  });

  it('returns false for all 10 MoodIds', () => {
    const moodIds: PickerId[] = [
      'joy', 'love', 'excited', 'calm', 'grateful',
      'sad', 'angry', 'anxious', 'tired', 'embarrassed',
    ];
    for (const id of moodIds) {
      expect(isActivityId(id)).toBe(false);
    }
  });

  it('returns true for all 8 ActivityIds', () => {
    const activityIds: PickerId[] = [
      'meal', 'exercise', 'study', 'cafe', 'walk', 'travel', 'rest', 'work',
    ];
    for (const id of activityIds) {
      expect(isActivityId(id)).toBe(true);
    }
  });
});
