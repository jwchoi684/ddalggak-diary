import { describe, it, expect } from 'vitest';
import type { PersonaId } from '@/lib/storage';
import {
  PERSONAS,
  PERSONA_MAP,
  getPersona,
  COMMON_BASE,
  PERSONA_LOCK_GUARD,
  SAFETY_FOOTER,
  SHAMAN_GUARD,
} from '@/design-system/personas';

const EXPECTED_IDS: PersonaId[] = [
  'friend',
  'lover',
  'sibling',
  'junior',
  'senior',
  'employee',
  'boss',
  'king',
  'mother',
  'father',
  'grandma',
  'therapist',
  'daoist',
  'shaman',
];

// ─── Block 1: Data integrity ──────────────────────────────────────────────────

describe('PERSONAS master data', () => {
  it('has exactly 14 entries', () => {
    expect(PERSONAS.length).toBe(14);
  });

  it('PERSONAS order matches PRD §3.8 sequence', () => {
    expect(PERSONAS.map((p) => p.id)).toEqual(EXPECTED_IDS);
  });

  it('contains every PersonaId literal exactly once — no duplicates', () => {
    const ids = PERSONAS.map((p) => p.id);
    const idSet = new Set(ids);
    expect(idSet.size).toBe(14);
    for (const id of EXPECTED_IDS) {
      expect(idSet.has(id)).toBe(true);
    }
  });

  it('every required Persona field is a non-empty string for all records', () => {
    for (const persona of PERSONAS) {
      expect(persona.id.length).toBeGreaterThan(0);
      expect(persona.emoji.length).toBeGreaterThan(0);
      expect(persona.label.length).toBeGreaterThan(0);
      expect(persona.shortDesc.length).toBeGreaterThan(0);
      expect(persona.systemPrompt.length).toBeGreaterThan(0);
      expect(persona.sampleGreeting.length).toBeGreaterThan(0);
    }
  });
});

describe('PERSONA_MAP', () => {
  it('has exactly 14 keys, all valid PersonaId values', () => {
    const keys = Object.keys(PERSONA_MAP);
    expect(keys.length).toBe(14);
    for (const key of keys) {
      expect(EXPECTED_IDS).toContain(key as PersonaId);
    }
  });

  it('PERSONA_MAP[id] is the same reference as the matching PERSONAS entry', () => {
    for (const id of EXPECTED_IDS) {
      expect(PERSONA_MAP[id]).toBe(PERSONAS.find((p) => p.id === id));
    }
  });
});

// ─── Block 2: Helper function ─────────────────────────────────────────────────

describe('getPersona', () => {
  it('returns the friend record as a spot check', () => {
    expect(getPersona('friend')).toBe(PERSONA_MAP['friend']);
  });

  it('does not throw for all 14 valid ids', () => {
    for (const id of EXPECTED_IDS) {
      expect(() => getPersona(id)).not.toThrow();
    }
  });

  it('throws "Unknown PersonaId: <id>" for an unrecognised id', () => {
    expect(() =>
      getPersona('not-a-real-id' as unknown as PersonaId),
    ).toThrow('Unknown PersonaId: not-a-real-id');
  });
});

// ─── Block 3: Drift-guard ─────────────────────────────────────────────────────

describe('system prompt drift guard', () => {
  it('every systemPrompt contains COMMON_BASE', () => {
    for (const persona of PERSONAS) {
      expect(persona.systemPrompt).toContain(COMMON_BASE);
    }
  });

  it('every systemPrompt contains PERSONA_LOCK_GUARD', () => {
    for (const persona of PERSONAS) {
      expect(persona.systemPrompt).toContain(PERSONA_LOCK_GUARD);
    }
  });

  it('every systemPrompt contains SAFETY_FOOTER', () => {
    for (const persona of PERSONAS) {
      expect(persona.systemPrompt).toContain(SAFETY_FOOTER);
    }
  });

  it('only shaman systemPrompt contains SHAMAN_GUARD; all others do not', () => {
    expect(PERSONA_MAP.shaman.systemPrompt).toContain(SHAMAN_GUARD);
    for (const persona of PERSONAS) {
      if (persona.id !== 'shaman') {
        expect(persona.systemPrompt).not.toContain(SHAMAN_GUARD);
      }
    }
  });

  it('no field of any persona contains an unresolved {token}', () => {
    const tokenPattern = /\{[^}]+\}/;
    const fields = [
      'emoji',
      'label',
      'shortDesc',
      'systemPrompt',
      'sampleGreeting',
    ] as const;
    for (const persona of PERSONAS) {
      for (const field of fields) {
        expect(persona[field]).not.toMatch(tokenPattern);
      }
    }
  });
});

// ─── Block 4: Honorific defaults ─────────────────────────────────────────────

describe('honorific defaults', () => {
  it('sibling systemPrompt uses hardcoded honorific "언니"', () => {
    expect(PERSONA_MAP.sibling.systemPrompt).toContain('언니');
  });

  it('mother systemPrompt uses hardcoded address "우리 아이"', () => {
    expect(PERSONA_MAP.mother.systemPrompt).toContain('우리 아이');
  });
});

// ─── Block 5: Korean language smoke ──────────────────────────────────────────

describe('Korean language labels', () => {
  it('king label is "왕" and shaman label is "무당" — no accidental English leak', () => {
    expect(PERSONA_MAP.king.label).toBe('왕');
    expect(PERSONA_MAP.shaman.label).toBe('무당');
  });
});
