import { supabase } from './supabase.js';

export interface PublicProfile {
  userId: string;
  displayName: string;
  timezone: string;
}

export async function resolveSlug(slug: string): Promise<PublicProfile | null> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('user_id, public_display_name, timezone')
    .eq('public_slug', slug)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    userId: data.user_id,
    displayName: data.public_display_name ?? slug,
    timezone: data.timezone ?? 'America/New_York',
  };
}
