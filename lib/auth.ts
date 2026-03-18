import type { VercelRequest } from '@vercel/node';
import { supabaseAuth } from './supabase.js';

export class AuthError extends Error {
  status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.name = 'AuthError';
    this.status = status;
  }
}

/**
 * Extracts and verifies a Supabase JWT from the Authorization header.
 * Returns the authenticated user's ID or throws AuthError.
 */
export async function requireAuth(req: VercelRequest): Promise<string> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    throw new AuthError('Missing or invalid Authorization header');
  }

  const token = authHeader.slice(7);
  const { data, error } = await supabaseAuth.auth.getUser(token);

  if (error || !data.user) {
    throw new AuthError('Invalid or expired token');
  }

  return data.user.id;
}
