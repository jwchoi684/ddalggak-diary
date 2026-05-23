import React from 'react';
import { MoodIcon } from '@/design-system/MoodIcon';
import { EmptyState } from '@/design-system/EmptyState';
import { getPickerItem } from '@/design-system/picker';
import type { MoodStats } from './useMoodStats';

interface MoodBarChartProps {
  stats: MoodStats;
}

/**
 * Renders the mood distribution for a selected month:
 * - Summary icon row (64px) for moods that appear at least once.
 * - Horizontal bar chart rows (40px icon + color bar + count) sorted count DESC.
 * - Empty state when hasData is false.
 */
export function MoodBarChart({ stats }: MoodBarChartProps) {
  if (!stats.hasData) {
    return <EmptyState title="이 달에는 기록이 없어요" className="mt-16" />;
  }

  return (
    <div>
      <div
        data-testid="mood-summary-row"
        className="flex flex-row justify-center gap-2 px-4 py-3"
      >
        {stats.counts.map(({ mood }) => (
          <MoodIcon key={mood} id={mood} size={64} />
        ))}
      </div>

      <div className="mt-2">
        {stats.counts.map(({ mood: moodId, count }) => {
          const mood = getPickerItem(moodId);
          const pct = Math.max(8, (count / stats.maxCount) * 100);
          return (
            <div
              key={moodId}
              data-testid={`mood-bar-${moodId}`}
              className="flex items-center gap-3 py-2 px-4"
            >
              <MoodIcon id={moodId} size={40} />
              <div className="flex-1 h-7 bg-[#EBEBEB] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${pct}%`, backgroundColor: mood.color }}
                />
              </div>
              <span className="text-charcoal text-sm tabular-nums w-8 text-right">
                {count}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
