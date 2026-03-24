import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { sessionMiddleware } from './middleware/session.js';
import { initDatabase } from './services/database.js';
import authRoutes from './routes/auth.js';
import glucoseRoutes from './routes/glucose.js';
import patternsRoutes from './routes/patterns.js';
import insightsRoutes from './routes/insights.js';
import dexcomRoutes from './routes/dexcom.js';
import publicRoutes from './routes/public.js';

initDatabase();

const app = express();

app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(sessionMiddleware);

app.use('/api/auth', authRoutes);
app.use('/api/glucose', glucoseRoutes);
app.use('/api/patterns', patternsRoutes);
app.use('/api/insights', insightsRoutes);
app.use('/api/dexcom', dexcomRoutes);
app.use('/api/public', publicRoutes);

app.listen(config.port, () => {
  console.log(`Server running on http://localhost:${config.port}`);
});
