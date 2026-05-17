import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import path from 'path';

const SRC_ROOT = path.resolve(__dirname, '../../../../../src');

describe('localStorage access constraint', () => {
  it('no file outside src/lib/storage/ references localStorage directly', () => {
    // Pattern matches window.localStorage or a bare localStorage. access
    // Excludes the storage module itself (which is the only allowed location)
    let stdout = '';
    let exitCode = 0;

    try {
      stdout = execSync(
        `grep -r --include="*.ts" --include="*.tsx" -l "localStorage" "${SRC_ROOT}" | grep -v "src/lib/storage"`,
        { encoding: 'utf8' },
      );
    } catch (err: unknown) {
      // grep exits with code 1 when no matches are found (expected success case)
      if (
        err !== null &&
        typeof err === 'object' &&
        'status' in err &&
        (err as { status: number }).status === 1
      ) {
        exitCode = 1;
        stdout = '';
      } else {
        throw err;
      }
    }

    // exitCode 1 means no matches — the constraint is satisfied
    // exitCode 0 means grep found matches — the constraint is violated
    if (exitCode === 0 && stdout.trim().length > 0) {
      throw new Error(
        `Files outside src/lib/storage/ reference localStorage directly:\n${stdout}`,
      );
    }

    expect(stdout.trim()).toBe('');
  });
});
