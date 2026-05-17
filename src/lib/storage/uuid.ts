/**
 * Cryptographically random UUID v4 generator.
 *
 * Requires a secure context (HTTPS or localhost).
 * `localhost` is a secure context per browser spec, so http://localhost:3000
 * (Next.js dev) works correctly. Non-localhost plain-HTTP origins will throw.
 */

/**
 * Generates a cryptographically random UUID v4 string.
 *
 * Wraps `crypto.randomUUID()`. Requires a secure context (HTTPS or localhost).
 * Not polyfilled for non-secure HTTP origins — MVP assumes Next.js dev/prod, both secure.
 *
 * @returns A UUID v4 string, e.g. "f47ac10b-58cc-4372-a567-0e02b2c3d479".
 * @throws  `TypeError` if called in a non-secure context where `crypto.randomUUID`
 *          is unavailable. This is a programming error, not a runtime condition
 *          in the expected deployment environment.
 */
export function generateId(): string {
  return crypto.randomUUID();
}
