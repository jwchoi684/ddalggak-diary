"use client";

import React from 'react';
import type { MoodId } from '@/lib/storage';
import { MoodIcon } from '@/design-system/MoodIcon';

const DATE_FMT = new Intl.DateTimeFormat('ko-KR', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});

function formatDate(date: string): string {
  try {
    const d = new Date(date + 'T00:00:00');
    if (isNaN(d.getTime())) return date;
    return DATE_FMT.format(d);
  } catch {
    return date;
  }
}

interface EditorBodyProps {
  date: string;
  mood: MoodId | undefined;
  text: string;
  textAlign: 'left' | 'center';
  onMoodTap: () => void;
  onTextChange: (text: string) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
}

export function EditorBody({
  date,
  mood,
  text,
  textAlign,
  onMoodTap,
  onTextChange,
  textareaRef,
}: EditorBodyProps) {
  const alignClass = textAlign === 'center' ? 'text-center' : 'text-left';

  return (
    <div className="flex flex-col flex-1 overflow-y-auto px-6 pt-2 pb-4">
      {/* Mood area */}
      <div className="flex flex-col items-center mb-4">
        <button
          type="button"
          aria-label={mood ? '기분 변경' : '기분을 선택해요'}
          onClick={onMoodTap}
          className="flex flex-col items-center gap-2 min-h-[44px] min-w-[44px]"
        >
          {mood ? (
            <MoodIcon id={mood} size={72} />
          ) : (
            <span
              className="flex items-center justify-center rounded-full border-2 border-dashed border-meta text-meta text-sm"
              style={{ width: 72, height: 72 }}
            >
              기분을 선택해요
            </span>
          )}
        </button>
      </div>

      {/* Date label (▾ is inert — REQ-010 hooks in here) */}
      <p className="text-sm text-meta text-center mb-4">
        {formatDate(date)} ▾
      </p>

      {/* Diary body textarea */}
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => onTextChange(e.target.value)}
        placeholder="오늘 어떤 하루였나요?"
        maxLength={5000}
        className={`w-full flex-1 resize-none bg-transparent outline-none text-charcoal text-base placeholder:text-meta leading-relaxed ${alignClass}`}
        style={{ minHeight: '200px' }}
      />
    </div>
  );
}
