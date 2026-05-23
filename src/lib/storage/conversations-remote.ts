"use client";

import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import type { SearchConversation, PersonaId, ChatMessage } from '@/lib/storage/types';

interface ConversationRow {
  id: string;
  user_id: string;
  persona_id: string;
  title: string;
  messages: ChatMessage[];
  started_at: string;
  last_message_at: string;
  is_closed: boolean;
}

function rowToConversation(r: ConversationRow): SearchConversation {
  return {
    id: r.id,
    personaId: r.persona_id as PersonaId,
    title: r.title,
    messages: Array.isArray(r.messages) ? r.messages : [],
    startedAt: r.started_at,
    lastMessageAt: r.last_message_at,
    isClosed: r.is_closed,
  };
}

export async function listConversationsRemote(): Promise<SearchConversation[]> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from('conversations')
    .select('id, user_id, persona_id, title, messages, started_at, last_message_at, is_closed')
    .order('last_message_at', { ascending: false });
  if (error) {
    console.error('[conversations-remote] list failed', error.message);
    return [];
  }
  return (data ?? []).map(rowToConversation);
}

export async function upsertConversationRemote(conv: SearchConversation): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;
  if (!userId) throw new Error('not authenticated');

  const row = {
    id: conv.id,
    user_id: userId,
    persona_id: conv.personaId,
    title: conv.title,
    messages: conv.messages,
    started_at: conv.startedAt,
    last_message_at: conv.lastMessageAt,
    is_closed: conv.isClosed,
  };
  const { error } = await supabase
    .from('conversations')
    .upsert(row, { onConflict: 'id' });
  if (error) {
    console.error('[conversations-remote] upsert failed', error.message);
    throw new Error(error.message);
  }
}

export async function removeConversationRemote(id: string): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.from('conversations').delete().eq('id', id);
  if (error) {
    console.error('[conversations-remote] delete failed', error.message);
    throw new Error(error.message);
  }
}
