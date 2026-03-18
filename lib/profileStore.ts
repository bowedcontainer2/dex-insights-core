import { supabase } from './supabase.js';

export interface UserProfile {
  userId: string;
  dexcomUsername: string | null;
  dexcomPassword: string | null;
  dexcomSessionId: string | null;
  dexcomAccountId: string | null;
  dexcomBaseUrl: string | null;
  timezone: string;
}

export async function getProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('user_id, dexcom_username, dexcom_password, dexcom_session_id, dexcom_account_id, dexcom_base_url, timezone')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    userId: data.user_id,
    dexcomUsername: data.dexcom_username,
    dexcomPassword: data.dexcom_password,
    dexcomSessionId: data.dexcom_session_id,
    dexcomAccountId: data.dexcom_account_id,
    dexcomBaseUrl: data.dexcom_base_url,
    timezone: data.timezone ?? 'America/New_York',
  };
}

export async function upsertProfile(
  userId: string,
  data: Partial<Omit<UserProfile, 'userId'>>
): Promise<void> {
  const row: Record<string, unknown> = { user_id: userId, updated_at: new Date().toISOString() };

  if (data.dexcomUsername !== undefined) row.dexcom_username = data.dexcomUsername;
  if (data.dexcomPassword !== undefined) row.dexcom_password = data.dexcomPassword;
  if (data.dexcomSessionId !== undefined) row.dexcom_session_id = data.dexcomSessionId;
  if (data.dexcomAccountId !== undefined) row.dexcom_account_id = data.dexcomAccountId;
  if (data.dexcomBaseUrl !== undefined) row.dexcom_base_url = data.dexcomBaseUrl;
  if (data.timezone !== undefined) row.timezone = data.timezone;

  const { error } = await supabase
    .from('user_profiles')
    .upsert(row, { onConflict: 'user_id' });

  if (error) throw error;
}

export async function getDexcomSession(
  userId: string
): Promise<{ sessionId: string; accountId: string; baseUrl: string } | null> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('dexcom_session_id, dexcom_account_id, dexcom_base_url')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  if (!data?.dexcom_session_id || !data?.dexcom_account_id) return null;

  return {
    sessionId: data.dexcom_session_id,
    accountId: data.dexcom_account_id,
    baseUrl: data.dexcom_base_url ?? 'https://share2.dexcom.com/ShareWebServices/Services',
  };
}

export async function saveDexcomSession(
  userId: string,
  sessionId: string,
  accountId: string,
  baseUrl: string
): Promise<void> {
  await upsertProfile(userId, {
    dexcomSessionId: sessionId,
    dexcomAccountId: accountId,
    dexcomBaseUrl: baseUrl,
  });
}

export async function clearDexcomCredentials(userId: string): Promise<void> {
  const { error } = await supabase
    .from('user_profiles')
    .update({
      dexcom_username: null,
      dexcom_password: null,
      dexcom_session_id: null,
      dexcom_account_id: null,
      dexcom_base_url: null,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  if (error) throw error;
}
