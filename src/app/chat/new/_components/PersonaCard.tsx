"use client";

import React from 'react';
import { Card } from '@/design-system/Card';
import type { Persona, PersonaId } from '@/lib/storage';

export interface PersonaCardProps {
  persona: Persona;
  onSelect: (id: PersonaId) => void;
}

export function PersonaCard({ persona, onSelect }: PersonaCardProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(persona.id)}
      aria-label={`${persona.label} 페르소나로 시작`}
      data-testid={`persona-card-${persona.id}`}
      className="w-full text-left"
    >
      <Card className="p-4 h-full flex flex-col items-center text-center">
        <span className="text-3xl">{persona.emoji}</span>
        <span className="text-charcoal font-medium mt-2">{persona.label}</span>
        <span className="text-meta text-xs mt-1 leading-tight">{persona.shortDesc}</span>
      </Card>
    </button>
  );
}
