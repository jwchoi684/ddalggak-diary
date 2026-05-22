"use client";

import React from 'react';
import { BottomSheet } from '@/design-system/BottomSheet';
import { Card } from '@/design-system/Card';
import { PERSONAS } from '@/design-system/personas';
import type { PersonaId } from '@/lib/storage';

interface PersonaChangeSheetProps {
  open: boolean;
  currentPersonaId: PersonaId;
  onSelect: (personaId: PersonaId) => void;
  onClose: () => void;
}

/**
 * PersonaChangeSheet — bottom sheet for mid-session persona swaps.
 *
 * Tap a persona → onSelect fires with the new id; sheet closes immediately.
 * Same row of 14 personas as /chat/new, but in a bottom-sheet wrapper instead
 * of a fullscreen page since the user is staying in the current session.
 */
export function PersonaChangeSheet({
  open,
  currentPersonaId,
  onSelect,
  onClose,
}: PersonaChangeSheetProps) {
  return (
    <BottomSheet open={open} onClose={onClose}>
      <h2 className="text-lg font-semibold text-charcoal text-center mb-4">
        톤 바꾸기
      </h2>
      <div className="grid grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pb-2">
        {PERSONAS.map((p) => {
          const active = p.id === currentPersonaId;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onSelect(p.id)}
              aria-label={`${p.label} 페르소나로 바꾸기`}
              aria-pressed={active}
              data-testid={`persona-change-card-${p.id}`}
              className="w-full text-left"
            >
              <Card
                className={`p-3 h-full flex flex-col items-center text-center ${
                  active ? 'ring-2 ring-peach' : ''
                }`}
              >
                <span className="text-2xl" aria-hidden="true">{p.emoji}</span>
                <span className="text-charcoal text-sm font-medium mt-1">{p.label}</span>
                <span className="text-meta text-[11px] mt-0.5 leading-tight">{p.shortDesc}</span>
              </Card>
            </button>
          );
        })}
      </div>
    </BottomSheet>
  );
}
