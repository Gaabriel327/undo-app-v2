require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./db');

const { router: authRouter } = require('./routes/auth');
const reflectionsRouter = require('./routes/reflections');
const groupsRouter = require('./routes/groups');
const tokensRouter = require('./routes/tokens');
const { router: pushRouter, sendDailyNotifications } = require('./routes/push');

const app = express();
const PORT = process.env.PORT || 5001;

const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000').split(',').map((s) => s.trim());

app.use(express.json());
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) callback(null, true);
      else callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);

app.use('/api/auth', authRouter);
app.use('/api/reflections', reflectionsRouter);
app.use('/api/groups', groupsRouter);
app.use('/api/tokens', tokensRouter);
app.use('/api/push', pushRouter);

app.get('/healthz', (_req, res) => res.json({ status: 'ok', version: '2.0.0' }));

app.use((_req, res) => res.status(404).json({ error: 'Route nicht gefunden' }));

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Interner Serverfehler' });
});

// ── Push notification scheduler ─────────────────────────────────────────────
// Runs every minute, checks who has a notification due right now
async function ensurePushTable() {
  await db.run(`CREATE TABLE IF NOT EXISTS push_subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    endpoint TEXT UNIQUE NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    morning_time TEXT DEFAULT '08:00',
    evening_time TEXT DEFAULT '20:00',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
}

ensurePushTable().then(() => {
  // Fire every 60 seconds
  setInterval(async () => {
    const now = new Date();
    const h = now.getHours();
    const type = (h >= 5 && h < 18) ? 'morning' : 'evening';
    await sendDailyNotifications(type);
  }, 60 * 1000);
});
// ────────────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`Undo App v2 Backend läuft auf Port ${PORT}`);
});
