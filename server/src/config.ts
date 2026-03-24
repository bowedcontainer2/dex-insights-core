import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  dexcom: {
    username: process.env.DEXCOM_USERNAME || '',
    password: process.env.DEXCOM_PASSWORD || '',
    baseUrl: process.env.DEXCOM_BASE_URL || 'https://share2.dexcom.com/ShareWebServices/Services',
    applicationId: 'd89443d2-327c-4a6f-89e5-496bbb0317db',
  },
  session: {
    secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    model: process.env.OPENAI_MODEL || 'gpt-5-mini',
    maxTokens: 1024,
  },
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  timezone: process.env.TIMEZONE || 'America/New_York',
};
