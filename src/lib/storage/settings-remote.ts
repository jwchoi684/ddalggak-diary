"use client";

import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import type { Settings } from '@/lib/storage/types';

/**
 * settings table layout: one row per user, payload in a `data` jsonb column.
 * (See supabase/schema.sql.) We treat the entire row as a single document.
 */
interface SettingsRow {
  user_id: string;
  data: Settings;
}

export async function readSettingsRemote(): Promise<Settings> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from('settings')
    .select('user_id, data')
    .maybeSingle();
  if (error) {
    console.error('[settings-remote] read failed', error.message);
    return {};
  }
  return (data as SettingsRow | null)?.data ?? {};
}

export async function writeSettingsRemote(patch: Partial<Settings>): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;
  if (!userId) throw new Error('not authenticated');

  // Read-merge-write so we don't clobber other fields the caller didn't pass.
  const current = await readSettingsRemote();
  const merged = { ...current, ...patch };

  const { error } = await supabase
    .from('settings')
    .upsert({ user_id: userId, data: merged }, { onConflict: 'user_id' });
  if (error) {
    console.error('[settings-remote] write failed', error.message);
    throw new Error(error.message);
  }
}
