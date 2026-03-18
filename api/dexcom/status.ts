import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth, AuthError } from '../../lib/auth.js';
import { getDexcomSession } from '../../lib/profileStore.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const userId = await requireAuth(req);
    const session = await getDexcomSession(userId);

    res.json({ connected: session !== null });
  } catch (err: any) {
    if (err instanceof AuthError) {
      return res.status(err.status).json({ error: err.message });
    }
    console.error('Dexcom status error:', err);
    res.status(500).json({ error: 'Failed to check Dexcom status' });
  }
}
