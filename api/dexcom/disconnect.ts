import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth, AuthError } from '../../lib/auth.js';
import { clearDexcomCredentials } from '../../lib/profileStore.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const userId = await requireAuth(req);
    await clearDexcomCredentials(userId);

    res.json({ success: true });
  } catch (err: any) {
    if (err instanceof AuthError) {
      return res.status(err.status).json({ error: err.message });
    }
    console.error('Dexcom disconnect error:', err);
    res.status(500).json({ error: 'Failed to disconnect Dexcom' });
  }
}
