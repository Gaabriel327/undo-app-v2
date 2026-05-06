const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authenticateToken } = require('./auth');

const router = express.Router();

// GET /api/groups
router.get('/', authenticateToken, async (req, res) => {
  try {
    const groups = await db.all(
      `SELECT g.*, COUNT(gm.user_id) as member_count
       FROM groups g
       JOIN group_members gm ON g.id = gm.group_id
       WHERE g.id IN (SELECT group_id FROM group_members WHERE user_id = ?)
       GROUP BY g.id
       ORDER BY g.created_at DESC`,
      [req.user.id]
    );
    res.json(groups);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Serverfehler' });
  }
});

// POST /api/groups
router.post('/', authenticateToken, async (req, res) => {
  const { name, motive, chance } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Name ist Pflichtfeld' });

  try {
    const id = uuidv4();
    await db.run(
      'INSERT INTO groups (id, name, created_by, motive, chance) VALUES (?, ?, ?, ?, ?)',
      [id, name.trim(), req.user.id, motive || null, chance || null]
    );
    await db.run('INSERT INTO group_members (group_id, user_id) VALUES (?, ?)', [id, req.user.id]);

    const group = await db.get('SELECT * FROM groups WHERE id = ?', [id]);
    res.status(201).json({ ...group, member_count: 1 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Serverfehler' });
  }
});

// GET /api/groups/:id
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const isMember = await db.get(
      'SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (!isMember) return res.status(403).json({ error: 'Kein Zugriff' });

    const group = await db.get('SELECT * FROM groups WHERE id = ?', [req.params.id]);
    if (!group) return res.status(404).json({ error: 'Gruppe nicht gefunden' });

    const members = await db.all(
      `SELECT u.id, u.username, u.first_name, u.streak
       FROM users u
       JOIN group_members gm ON u.id = gm.user_id
       WHERE gm.group_id = ?
       ORDER BY gm.joined_at ASC`,
      [req.params.id]
    );

    const recentReflections = await db.all(
      `SELECT gr.*, u.username, u.first_name
       FROM group_reflections gr
       JOIN users u ON gr.user_id = u.id
       WHERE gr.group_id = ?
       ORDER BY gr.created_at DESC
       LIMIT 20`,
      [req.params.id]
    );

    res.json({ ...group, members, recentReflections });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Serverfehler' });
  }
});

// POST /api/groups/:id/join
router.post('/:id/join', authenticateToken, async (req, res) => {
  try {
    const group = await db.get('SELECT id FROM groups WHERE id = ?', [req.params.id]);
    if (!group) return res.status(404).json({ error: 'Gruppe nicht gefunden' });

    await db.run(
      'INSERT OR IGNORE INTO group_members (group_id, user_id) VALUES (?, ?)',
      [req.params.id, req.user.id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Serverfehler' });
  }
});

// POST /api/groups/:id/leave
router.post('/:id/leave', authenticateToken, async (req, res) => {
  try {
    await db.run(
      'DELETE FROM group_members WHERE group_id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Serverfehler' });
  }
});

// PUT /api/groups/:id
router.put('/:id', authenticateToken, async (req, res) => {
  const { name, motive, chance } = req.body;
  try {
    const group = await db.get('SELECT * FROM groups WHERE id = ?', [req.params.id]);
    if (!group) return res.status(404).json({ error: 'Gruppe nicht gefunden' });
    if (group.created_by !== req.user.id)
      return res.status(403).json({ error: 'Nur der Ersteller kann die Gruppe bearbeiten' });

    await db.run(
      'UPDATE groups SET name = ?, motive = ?, chance = ? WHERE id = ?',
      [name || group.name, motive ?? group.motive, chance ?? group.chance, req.params.id]
    );
    const updated = await db.get('SELECT * FROM groups WHERE id = ?', [req.params.id]);
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Serverfehler' });
  }
});

// POST /api/groups/:id/reflections
router.post('/:id/reflections', authenticateToken, async (req, res) => {
  const { question, answer } = req.body;
  if (!question || !answer)
    return res.status(400).json({ error: 'Frage und Antwort erforderlich' });

  try {
    const isMember = await db.get(
      'SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (!isMember) return res.status(403).json({ error: 'Kein Zugriff' });

    const result = await db.run(
      'INSERT INTO group_reflections (group_id, user_id, question, answer) VALUES (?, ?, ?, ?)',
      [req.params.id, req.user.id, question, answer.trim()]
    );

    await db.run(
      "UPDATE groups SET last_q_text = ?, last_q_day = DATE('now') WHERE id = ?",
      [question, req.params.id]
    );

    const reflection = await db.get('SELECT * FROM group_reflections WHERE id = ?', [result.id]);
    res.status(201).json(reflection);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Serverfehler' });
  }
});

module.exports = router;
