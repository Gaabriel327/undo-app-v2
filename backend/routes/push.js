const express = require('express');
const webpush = require('web-push');
const db = require('../db');
const { authenticateToken } = require('./auth');

const router = express.Router();

webpush.setVapidDetails(
  'mailto:hi@undo-app.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

// GET /api/push/vapid-public-key
router.get('/vapid-public-key', (req, res) => {
  res.json({ key: process.env.VAPID_PUBLIC_KEY });
});

// POST /api/push/subscribe
router.post('/subscribe', authenticateToken, async (req, res) => {
  const { subscription, morningTime = '08:00', eveningTime = '20:00' } = req.body;
  if (!subscription?.endpoint) return res.status(400).json({ error: 'Ungültige Subscription' });

  try {
    await db.run(
      `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, morning_time, evening_time)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(endpoint) DO UPDATE
       SET user_id = excluded.user_id,
           p256dh = excluded.p256dh,
           auth = excluded.auth,
           morning_time = excluded.morning_time,
           evening_time = excluded.evening_time,
           updated_at = CURRENT_TIMESTAMP`,
      [
        req.user.id,
        subscription.endpoint,
        subscription.keys.p256dh,
        subscription.keys.auth,
        morningTime,
        eveningTime,
      ]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Serverfehler' });
  }
});

// DELETE /api/push/unsubscribe
router.delete('/unsubscribe', authenticateToken, async (req, res) => {
  const { endpoint } = req.body;
  if (!endpoint) return res.status(400).json({ error: 'Endpoint fehlt' });
  await db.run('DELETE FROM push_subscriptions WHERE user_id = ? AND endpoint = ?', [req.user.id, endpoint]);
  res.json({ success: true });
});

// GET /api/push/status
router.get('/status', authenticateToken, async (req, res) => {
  const sub = await db.get('SELECT id, morning_time, evening_time FROM push_subscriptions WHERE user_id = ? LIMIT 1', [req.user.id]);
  res.json({ subscribed: !!sub, morningTime: sub?.morning_time || '08:00', eveningTime: sub?.evening_time || '20:00' });
});

// Internal: send notifications (called by scheduler)
async function sendDailyNotifications(type) {
  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
  const col = type === 'morning' ? 'morning_time' : 'evening_time';
  const title = type === 'morning' ? 'Guten Morgen ☀️' : 'Guten Abend 🌙';
  const body = type === 'morning'
    ? 'Deine Morgenreflexion wartet. 2 Minuten für dich.'
    : 'Wie war dein Tag? Deine Abendfrage wartet.';

  try {
    const subs = await db.all(
      `SELECT ps.endpoint, ps.p256dh, ps.auth, u.last_reflection_date
       FROM push_subscriptions ps
       JOIN users u ON u.id = ps.user_id
       WHERE ps.${col} = ?`,
      [timeStr]
    );

    for (const sub of subs) {
      const today = new Date().toISOString().split('T')[0];
      if (type === 'evening' && sub.last_reflection_date === today) continue; // already reflected today

      const payload = JSON.stringify({ title, body, url: '/' });
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        );
      } catch (e) {
        if (e.statusCode === 410) {
          // Subscription expired — clean up
          await db.run('DELETE FROM push_subscriptions WHERE endpoint = ?', [sub.endpoint]);
        }
      }
    }
  } catch (err) {
    console.error('Push scheduler error:', err.message);
  }
}

module.exports = { router, sendDailyNotifications };
