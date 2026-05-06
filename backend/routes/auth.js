const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'change-me';
const JWT_EXPIRY = '7d';
const CATEGORIES = ['selbstbild', 'emotion', 'gewohnheit', 'beziehung', 'mindset', 'vision', 'zukunft'];

const authenticateToken = async (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Kein Token' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = await db.get('SELECT * FROM users WHERE id = ?', [payload.id]);
    if (!req.user) return res.status(401).json({ error: 'Benutzer nicht gefunden' });
    next();
  } catch {
    return res.status(403).json({ error: 'Ungültiger Token' });
  }
};

router.post('/register', async (req, res) => {
  const { username, email, password, first_name } = req.body;
  if (!username || !email || !password)
    return res.status(400).json({ error: 'Username, Email und Passwort sind Pflichtfelder' });
  if (password.length < 6)
    return res.status(400).json({ error: 'Passwort muss mindestens 6 Zeichen haben' });

  try {
    const existing = await db.get(
      'SELECT id FROM users WHERE username = ? OR email = ?',
      [username, email]
    );
    if (existing) return res.status(409).json({ error: 'Username oder Email bereits vergeben' });

    const hash = await bcrypt.hash(password, 12);
    const result = await db.run(
      'INSERT INTO users (username, email, password_hash, first_name, tokens) VALUES (?, ?, ?, ?, 10)',
      [username.trim(), email.trim().toLowerCase(), hash, first_name || null]
    );

    for (const cat of CATEGORIES) {
      await db.run(
        'INSERT INTO user_category_scores (user_id, category, score) VALUES (?, ?, 50)',
        [result.id, cat]
      );
    }

    const user = await db.get(
      'SELECT id, username, email, first_name, tokens, streak, motive, chance, profile_completed, subscription, language FROM users WHERE id = ?',
      [result.id]
    );
    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
    res.status(201).json({ token, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Serverfehler' });
  }
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: 'Username und Passwort erforderlich' });

  try {
    const user = await db.get(
      'SELECT * FROM users WHERE username = ? OR email = ?',
      [username, username.toLowerCase()]
    );
    if (!user) return res.status(401).json({ error: 'Ungültige Anmeldedaten' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Ungültige Anmeldedaten' });

    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    let newStreak = user.streak || 0;
    let tokensEarned = 0;

    if (user.last_active !== today) {
      newStreak = user.last_active === yesterday ? newStreak + 1 : 1;

      if (newStreak === 3) tokensEarned = 1;
      else if (newStreak === 5) tokensEarned = 2;
      else if (newStreak === 7) { tokensEarned = 3; newStreak = 0; }

      await db.run(
        'UPDATE users SET last_active = ?, streak = ?, tokens = tokens + ? WHERE id = ?',
        [today, newStreak, tokensEarned, user.id]
      );
      if (tokensEarned > 0) {
        await db.run(
          'INSERT INTO token_transactions (user_id, amount, reason) VALUES (?, ?, ?)',
          [user.id, tokensEarned, `Streak Tag ${newStreak}`]
        );
      }
    }

    const updated = await db.get(
      'SELECT id, username, email, first_name, tokens, streak, streak_count, motive, chance, profile_completed, subscription, language, last_reflection_date FROM users WHERE id = ?',
      [user.id]
    );
    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
    res.json({ token, user: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Serverfehler' });
  }
});

router.get('/me', authenticateToken, (req, res) => {
  const { password_hash, ...user } = req.user;
  res.json(user);
});

router.put('/profile', authenticateToken, async (req, res) => {
  const { first_name, birth_date, motive, chance, language } = req.body;
  try {
    await db.run(
      'UPDATE users SET first_name = ?, birth_date = ?, motive = ?, chance = ?, language = ?, profile_completed = 1 WHERE id = ?',
      [first_name || null, birth_date || null, motive || null, chance || null, language || 'de', req.user.id]
    );
    const user = await db.get(
      'SELECT id, username, email, first_name, birth_date, motive, chance, tokens, streak, profile_completed, subscription, language FROM users WHERE id = ?',
      [req.user.id]
    );
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Serverfehler' });
  }
});

router.put('/password', authenticateToken, async (req, res) => {
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password)
    return res.status(400).json({ error: 'Aktuelles und neues Passwort erforderlich' });
  if (new_password.length < 6)
    return res.status(400).json({ error: 'Neues Passwort muss mindestens 6 Zeichen haben' });

  try {
    const user = await db.get('SELECT password_hash FROM users WHERE id = ?', [req.user.id]);
    const valid = await bcrypt.compare(current_password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Aktuelles Passwort falsch' });

    const hash = await bcrypt.hash(new_password, 12);
    await db.run('UPDATE users SET password_hash = ? WHERE id = ?', [hash, req.user.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Serverfehler' });
  }
});

module.exports = { router, authenticateToken };
