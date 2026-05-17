// Pure server component — no use-client directive

import React from 'react';

/**
 * EmptyState — centered column layout for zero-content screens.
 *
 * @property icon        - Optional ReactNode icon (emoji, SVG, image).
 * @property title       - Required. String → wrapped in <p> with standard styling.
 *                         ReactNode → rendered as-is (caller controls element type).
 * @property description - Optional subtitle string.
 * @property action      - Optional CTA slot (touch target is caller's responsibility).
 * @property className   - Optional layout classes on root <div>.
 */
export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center text-center gap-3 ${className}`}
    >
      {icon != null && <div>{icon}</div>}

      {typeof title === 'string' ? (
        <p className="text-lg font-medium text-charcoal">{title}</p>
      ) : (
        title
      )}

      {description != null && (
        <p className="text-sm text-meta">{description}</p>
      )}

      {action != null && <div>{action}</div>}
    </div>
  );
}
