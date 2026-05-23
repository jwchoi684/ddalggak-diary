"use client";

import { createSupabaseBrowserClient } from '@/lib/supabase/client';

const BUCKET = 'diary-photos';

/**
 * Uploads a photo file to Supabase Storage under the user's folder and returns
 * the public URL of the stored object plus its storage path.
 *
 * Path layout: `<user_id>/<photo_id>.<ext>` — user_id prefix keeps each user
 * isolated to their own folder. The bucket is public so callers can render
 * the URL directly in an <img>; access control is by URL obscurity (uuid
 * filenames). Phase 3.5 may swap to signed URLs if we need stricter privacy.
 */
export interface UploadedPhoto {
  storagePath: string;
  publicUrl: string;
}

export async function uploadPhotoToStorage(
  file: File,
  photoId: string,
): Promise<UploadedPhoto> {
  const supabase = createSupabaseBrowserClient();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;
  if (!userId) throw new Error('not authenticated');

  const ext = (file.name.split('.').pop() ?? 'jpg').toLowerCase();
  const path = `${userId}/${photoId}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: true,
    contentType: file.type || 'image/jpeg',
  });
  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { storagePath: path, publicUrl: data.publicUrl };
}

export async function removePhotoFromStorage(storagePath: string): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.storage.from(BUCKET).remove([storagePath]);
  if (error) {
    console.warn('[photos-remote] remove failed', error.message);
  }
}
