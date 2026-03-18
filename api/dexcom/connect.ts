import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth, AuthError } from '../../lib/auth.js';
import { authenticateAccount, loginById } from '../../lib/dexcom.js';
import { upsertProfile, saveDexcomSession } from '../../lib/profileStore.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const userId = await requireAuth(req);

    const { username, password } = req.body ?? {};
    if (!username || !password) {
      return res.status(400).json({ error: 'Dexcom username and password required' });
    }

    const { accountId, baseUrl } = await authenticateAccount(username, password);
    const sessionId = await loginById(accountId, password, baseUrl);

    // Store credentials + session in user profile
    await upsertProfile(userId, {
      dexcomUsername: username,
      dexcomPassword: password,
    });
    await saveDexcomSession(userId, sessionId, accountId, baseUrl);

    res.json({ success: true });
  } catch (err: any) {
    if (err instanceof AuthError) {
      return res.status(err.status).json({ error: err.message });
    }
    console.error('Dexcom connect error:', err);
    res.status(500).json({ error: 'Failed to connect to Dexcom' });
  }
}
