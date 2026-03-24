import { Router, Request, Response } from 'express';
import { authGuard } from '../middleware/authGuard.js';
import { authenticateAccount, loginById } from '../../../lib/dexcom.js';
import { upsertProfile, saveDexcomSession, getDexcomSession, clearDexcomCredentials } from '../../../lib/profileStore.js';

const router = Router();

router.use(authGuard);

router.post('/connect', async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { username, password } = req.body ?? {};
    if (!username || !password) {
      res.status(400).json({ error: 'Dexcom username and password required' });
      return;
    }

    const { accountId, baseUrl } = await authenticateAccount(username, password);
    const sessionId = await loginById(accountId, password, baseUrl);

    await upsertProfile(userId, {
      dexcomUsername: username,
      dexcomPassword: password,
    });
    await saveDexcomSession(userId, sessionId, accountId, baseUrl);

    res.json({ success: true });
  } catch (err: any) {
    console.error('Dexcom connect error:', err);
    res.status(500).json({ error: 'Failed to connect to Dexcom' });
  }
});

router.get('/status', async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const session = await getDexcomSession(userId);
    res.json({ connected: session !== null });
  } catch (err: any) {
    console.error('Dexcom status error:', err);
    res.status(500).json({ error: 'Failed to check Dexcom status' });
  }
});

router.post('/disconnect', async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    await clearDexcomCredentials(userId);
    res.json({ success: true });
  } catch (err: any) {
    console.error('Dexcom disconnect error:', err);
    res.status(500).json({ error: 'Failed to disconnect Dexcom' });
  }
});

export default router;
