"use client";

import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import type { DiaryEntry, Photo, PickerId } from '@/lib/storage';

/**
 * Supabase-backed diary CRUD. Replaces the localStorage implementation in
 * diaries.ts. All functions assume the user is authenticated; RLS filters by
 * auth.uid(). They return promises (vs the sync localStorage layer) so callers
 * must await and surface loading state.
 */

interface DiaryRow {
  id: string;
  user_id: string;
  date: string;
  mood: string;
  text: string;
  text_align: 'left' | 'center';
  photos: Photo[];
  created_at: string;
  updated_at: string;
}

function rowToEntry(r: DiaryRow): DiaryEntry {
  return {
    id: r.id,
    date: r.date,
    mood: r.mood as PickerId,
    text: r.text,
    textAlign: r.text_align,
    photos: Array.isArray(r.photos) ? r.photos : [],
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export async function listDiariesRemote(): Promise<DiaryEntry[]> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from('diaries')
    .select('id, user_id, date, mood, text, text_align, photos, created_at, updated_at')
    .order('date', { ascending: false });
  if (error) {
    console.error('[diaries-remote] list failed', error.message);
    return [];
  }
  return (data ?? []).map(rowToEntry);
}

export async function upsertDiaryRemote(entry: DiaryEntry): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;
  if (!userId) throw new Error('not authenticated');

  const row = {
    id: entry.id,
    user_id: userId,
    date: entry.date,
    mood: entry.mood,
    text: entry.text,
    text_align: entry.textAlign,
    photos: entry.photos,
    created_at: entry.createdAt,
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase.from('diaries').upsert(row, { onConflict: 'id' });
  if (error) {
    console.error('[diaries-remote] upsert failed', error.message);
    throw new Error(error.message);
  }
}

export async function removeDiaryRemote(id: string): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.from('diaries').delete().eq('id', id);
  if (error) {
    console.error('[diaries-remote] delete failed', error.message);
    throw new Error(error.message);
  }
}
