import { Router, Request, Response } from 'express';
import { config } from '../config.js';
import { authenticateAccount, loginById } from '../services/dexcom.js';

const router = Router();

router.post('/login', async (req: Request, res: Response) => {
  const username = req.body.username || config.dexcom.username;
  const password = req.body.password || config.dexcom.password;

  if (!username || !password) {
    res.status(400).json({ error: 'Dexcom credentials required' });
    return;
  }

  try {
    const accountId = await authenticateAccount(username, password);
    const sessionId = await loginById(accountId, password);

    req.session.sessionId = sessionId;
    req.session.accountId = accountId;

    res.json({ success: true });
  } catch (err: any) {
    console.error('Share login error:', err);
    res.status(500).json({ error: 'Failed to connect to Dexcom' });
  }
});

router.get('/status', (req: Request, res: Response) => {
  res.json({
    authenticated: !!req.session.sessionId,
    hasEnvCredentials: !!(config.dexcom.username && config.dexcom.password),
  });
});

router.post('/logout', (req: Request, res: Response) => {
  req.session.destroy((err) => {
    if (err) {
      res.status(500).json({ error: 'Logout failed' });
      return;
    }
    res.json({ success: true });
  });
});

export default router;
