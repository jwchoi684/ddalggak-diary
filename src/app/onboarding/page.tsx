"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSettings } from '@/lib/storage/useSettings';
import type { Settings } from '@/lib/storage';

type Gender = NonNullable<Settings['gender']>;

const GENDER_OPTIONS: Array<{ value: Gender; label: string }> = [
  { value: 'female', label: '여성' },
  { value: 'male', label: '남성' },
  { value: 'neutral', label: '선택 안 함' },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { update } = useSettings();
  const [name, setName] = useState('');
  const [gender, setGender] = useState<Gender>('neutral');

  // No "already onboarded" auto-redirect — OnboardingGate handles that. Doing it
  // here too caused a navigation race with the gate when settings hadn't
  // propagated yet across hook instances.

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    update({
      userName: trimmed,
      gender,
      onboardingCompleted: true,
    });
    router.replace('/');
  }

  return (
    <div className="min-h-[100dvh] bg-cream flex flex-col items-center justify-center px-6">
      <h1 className="text-2xl font-bold text-charcoal mb-2">환영합니다</h1>
      <p className="text-meta text-sm mb-8 text-center">
        AI가 부를 호칭과 성별을 알려주세요.<br />언제든 설정에서 바꿀 수 있어요.
      </p>

      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-5">
        <div>
          <label htmlFor="onboarding-name" className="block text-charcoal text-sm font-medium mb-2">
            호칭
          </label>
          <input
            id="onboarding-name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="예: 지영, 선생님, 주인님"
            maxLength={30}
            data-testid="onboarding-name-input"
            className="w-full min-h-[48px] px-4 rounded-xl border border-meta/30 bg-paper text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-peach"
          />
        </div>

        <fieldset>
          <legend className="block text-charcoal text-sm font-medium mb-2">성별</legend>
          <div className="grid grid-cols-3 gap-2" role="radiogroup">
            {GENDER_OPTIONS.map((opt) => {
              const active = gender === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  data-testid={`onboarding-gender-${opt.value}`}
                  onClick={() => setGender(opt.value)}
                  className={`min-h-[48px] rounded-xl text-sm font-medium border transition-colors ${
                    active
                      ? 'bg-peach text-charcoal border-peach'
                      : 'bg-paper text-charcoal border-meta/30'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </fieldset>

        <button
          type="submit"
          disabled={!name.trim()}
          data-testid="onboarding-submit"
          className="w-full min-h-[48px] px-4 rounded-xl bg-charcoal text-paper text-sm font-medium disabled:opacity-60"
        >
          시작하기
        </button>
      </form>
    </div>
  );
}
