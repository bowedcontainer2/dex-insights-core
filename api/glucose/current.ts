import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth, AuthError } from '../../lib/auth.js';
import { fetchLatestReadings, loginById } from '../../lib/dexcom.js';
import { getDexcomSession, getProfile, saveDexcomSession } from '../../lib/profileStore.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const userId = await requireAuth(req);

    const dexSession = await getDexcomSession(userId);
    if (!dexSession) {
      return res.status(400).json({ error: 'Dexcom not connected' });
    }

    let data;
    try {
      data = await fetchLatestReadings(dexSession.sessionId, dexSession.baseUrl, 30, 1);
    } catch (fetchErr: any) {
      // If session expired, re-auth and retry once
      if (fetchErr.message?.includes('500')) {
        const profile = await getProfile(userId);
        if (profile?.dexcomPassword && profile?.dexcomAccountId) {
          const newSessionId = await loginById(profile.dexcomAccountId, profile.dexcomPassword, dexSession.baseUrl);
          await saveDexcomSession(userId, newSessionId, dexSession.accountId, dexSession.baseUrl);
          data = await fetchLatestReadings(newSessionId, dexSession.baseUrl, 30, 1);
        } else {
          throw fetchErr;
        }
      } else {
        throw fetchErr;
      }
    }

    if (data.egvs.length === 0) {
      return res.json({ reading: null });
    }

    const latest = data.egvs[data.egvs.length - 1];
    res.json({ reading: latest });
  } catch (err: any) {
    if (err instanceof AuthError) {
      return res.status(err.status).json({ error: err.message });
    }
    console.error('Current reading error:', err);
    if (err.message?.includes('500')) {
      return res.status(401).json({ error: 'Session expired' });
    }
    res.status(500).json({ error: 'Failed to fetch current reading' });
  }
}
