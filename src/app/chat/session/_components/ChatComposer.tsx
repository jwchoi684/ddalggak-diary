"use client";

import React, { useRef, useEffect } from 'react';

interface ChatComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  disabled?: boolean;
}

function SendIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
      <path
        d="M3 10 L17 10 M11 4 L17 10 L11 16"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

/**
 * ChatComposer — message input bar with auto-growing textarea and send button.
 *
 * Send is triggered by button click or Enter (without Shift).
 * Shift+Enter inserts a newline.
 * Disabled during loading / AI response in-flight.
 */
export function ChatComposer({
  value,
  onChange,
  onSend,
  disabled = false,
}: ChatComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!disabled && value.trim()) {
        onSend();
      }
    }
  };

  const canSend = !disabled && value.trim().length > 0;

  return (
    <div
      className="flex items-end gap-2 px-4 py-3 bg-paper border-t border-meta/10"
      data-testid="chat-composer"
    >
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="메시지 입력"
        disabled={disabled}
        rows={1}
        aria-label="메시지 입력"
        className="flex-1 resize-none bg-cream rounded-xl px-3 py-2 text-sm text-charcoal placeholder:text-meta outline-none min-h-[40px] max-h-[120px] overflow-y-auto"
      />
      <button
        type="button"
        aria-label="전송"
        onClick={onSend}
        disabled={!canSend}
        className={`flex items-center justify-center rounded-full bg-peach transition-opacity ${
          canSend ? 'opacity-100' : 'opacity-40 cursor-not-allowed'
        }`}
        style={{ width: 40, height: 40, flexShrink: 0 }}
      >
        <SendIcon />
      </button>
    </div>
  );
}
