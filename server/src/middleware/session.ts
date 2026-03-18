import session from 'express-session';
import { config } from '../config.js';

declare module 'express-session' {
  interface SessionData {
    sessionId?: string;
    accountId?: string;
  }
}

export const sessionMiddleware = session({
  secret: config.session.secret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
  },
});
