// Pure server component — no use-client directive

import React from 'react';

/**
 * Card — white surface with PRD shadow token.
 *
 * @property children  - Card body content.
 * @property className - Optional layout classes (margin, flex, z-index).
 * @property large     - true → --radius-card-lg (20px); default --radius-card (16px).
 *
 * Shadow is applied via inline style because Tailwind 4 does not auto-generate
 * shadow-* utilities from @theme --shadow-* variables.
 */
export interface CardProps {
  children: React.ReactNode;
  className?: string;
  large?: boolean;
}

export function Card({ children, className = '', large = false }: CardProps) {
  const radiusClass = large
    ? 'rounded-[var(--radius-card-lg)]'
    : 'rounded-[var(--radius-card)]';

  return (
    <div
      className={`bg-paper ${radiusClass} ${className}`}
      style={{ boxShadow: 'var(--shadow-card)' }}
    >
      {children}
    </div>
  );
}
