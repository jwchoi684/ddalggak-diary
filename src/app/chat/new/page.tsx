"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { IconButton } from '@/design-system/IconButton';
import { PERSONAS } from '@/design-system/personas';
import type { PersonaId } from '@/lib/storage';
import { useSettings } from '@/lib/storage/useSettings';
import { PersonaCard } from './_components/PersonaCard';

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
      <path d="M5 5 L15 15 M15 5 L5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export default function PersonaPickerPage() {
  const router = useRouter();
  const { update } = useSettings();

  const handleSelect = (id: PersonaId) => {
    update({ lastPersonaId: id });
    router.push(`/chat/session?personaId=${id}`);
  };

  return (
    <div className="min-h-screen bg-cream px-4 pb-8" data-testid="persona-picker-page">
      <header className="flex justify-end pt-4">
        <IconButton icon={<CloseIcon />} label="닫기" onClick={() => router.back()} />
      </header>
      <h1 className="text-xl font-semibold text-charcoal text-center my-6">
        어떤 톤으로 대화할까요?
      </h1>
      <div className="grid grid-cols-2 gap-3" role="list">
        {PERSONAS.map((persona) => (
          <div key={persona.id} role="listitem">
            <PersonaCard persona={persona} onSelect={handleSelect} />
          </div>
        ))}
      </div>
    </div>
  );
}
