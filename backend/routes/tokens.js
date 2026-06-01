const express = require('express');
const db = require('../db');
const { authenticateToken } = require('./auth');

const router = express.Router();

// GET /api/tokens
router.get('/', authenticateToken, async (req, res) => {
  try {
    const user = await db.get(
      'SELECT tokens, streak, subscription, pro_until FROM users WHERE id = ?',
      [req.user.id]
    );
    const history = await db.all(
      'SELECT * FROM token_transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 30',
      [req.user.id]
    );
    res.json({ ...user, history });
  } catch (err) {
    res.status(500).json({ error: 'Serverfehler' });
  }
});

// POST /api/tokens/redeem
router.post('/redeem', authenticateToken, async (req, res) => {
  const { code } = req.body;
  if (!code?.trim()) return res.status(400).json({ error: 'Code erforderlich' });

  try {
    const promo = await db.get(
      `SELECT * FROM promo_codes
       WHERE code = ? AND active = 1
       AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
       AND used_count < max_uses`,
      [code.trim().toUpperCase()]
    );
    if (!promo) return res.status(404).json({ error: 'Ungültiger oder abgelaufener Code' });

    await db.run(
      `UPDATE users
       SET tokens = tokens + 30,
           subscription = 'pro',
           pro_until = DATE('now', '+' || ? || ' days')
       WHERE id = ?`,
      [promo.duration_days, req.user.id]
    );
    await db.run(
      'UPDATE promo_codes SET used_count = used_count + 1 WHERE id = ?',
      [promo.id]
    );
    await db.run(
      'INSERT INTO token_transactions (user_id, amount, reason) VALUES (?, ?, ?)',
      [req.user.id, 30, `Promo Code: ${code.trim().toUpperCase()}`]
    );

    const user = await db.get(
      'SELECT tokens, subscription, pro_until FROM users WHERE id = ?',
      [req.user.id]
    );
    res.json({ success: true, ...user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Serverfehler' });
  }
});

// POST /api/tokens/spend
router.post('/spend', authenticateToken, async (req, res) => {
  const { reason } = req.body;
  if (!reason) return res.status(400).json({ error: 'Reason fehlt' });
  try {
    const user = await db.get('SELECT tokens FROM users WHERE id = ?', [req.user.id]);
    if (!user || user.tokens < 1) return res.status(402).json({ error: 'Nicht genug Tokens' });
    await db.run('UPDATE users SET tokens = tokens - 1 WHERE id = ?', [req.user.id]);
    await db.run(
      'INSERT INTO token_transactions (user_id, amount, reason) VALUES (?, ?, ?)',
      [req.user.id, -1, reason]
    );
    const updated = await db.get('SELECT tokens FROM users WHERE id = ?', [req.user.id]);
    res.json({ tokens: updated.tokens });
  } catch (err) {
    res.status(500).json({ error: 'Serverfehler' });
  }
});

module.exports = router;
