const express = require('express');
const OpenAI = require('openai');
const db = require('../db');
const { authenticateToken } = require('./auth');

const router = express.Router();

let openai = null;
if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

// GET /api/questions?mode=morning|evening|any
router.get('/questions', authenticateToken, async (req, res) => {
  const { mode = 'any' } = req.query;
  try {
    const recent = await db.all(
      'SELECT question_id FROM user_question_history WHERE user_id = ? ORDER BY asked_at DESC LIMIT 30',
      [req.user.id]
    );
    const excludeIds = recent.map((r) => r.question_id);
    const modeClause =
      mode === 'any'
        ? `mode IN ('morning','evening','any')`
        : `mode IN ('${mode}','any')`;
    const excludeClause =
      excludeIds.length > 0 ? `AND id NOT IN (${excludeIds.join(',')})` : '';

    let question = await db.get(
      `SELECT * FROM questions WHERE active = 1 AND ${modeClause} ${excludeClause} ORDER BY RANDOM() LIMIT 1`
    );

    if (!question) {
      question = await db.get(
        `SELECT * FROM questions WHERE active = 1 AND ${modeClause} ORDER BY RANDOM() LIMIT 1`
      );
    }

    res.json(question || null);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Serverfehler' });
  }
});

// POST /api/reflections
router.post('/', authenticateToken, async (req, res) => {
  const { mode, question, question_id, answer, category } = req.body;
  if (!mode || !question || !answer)
    return res.status(400).json({ error: 'mode, question und answer erforderlich' });
  if (answer.trim().length < 10)
    return res.status(400).json({ error: 'Antwort muss mindestens 10 Zeichen lang sein' });

  try {
    const result = await db.run(
      'INSERT INTO reflections (user_id, mode, question, question_id, answer, category) VALUES (?, ?, ?, ?, ?, ?)',
      [req.user.id, mode, question, question_id || null, answer.trim(), category || null]
    );

    if (question_id) {
      await db.run(
        'INSERT INTO user_question_history (user_id, question_id, mode, answered_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)',
        [req.user.id, question_id, mode]
      );
    }

    const wordCount = answer.trim().split(/\s+/).length;
    let tokensEarned = 0;
    if (wordCount >= 80) tokensEarned = 2;
    else if (wordCount >= 40) tokensEarned = 1;

    if (tokensEarned > 0) {
      await db.run('UPDATE users SET tokens = tokens + ? WHERE id = ?', [tokensEarned, req.user.id]);
      await db.run(
        'INSERT INTO token_transactions (user_id, amount, reason) VALUES (?, ?, ?)',
        [req.user.id, tokensEarned, 'Qualitätsantwort']
      );
    }

    await db.run(
      "UPDATE users SET last_reflection_date = DATE('now') WHERE id = ?",
      [req.user.id]
    );

    if (category) {
      await db.run(
        `INSERT INTO user_category_scores (user_id, category, score, last_seen)
         VALUES (?, ?, 55, CURRENT_TIMESTAMP)
         ON CONFLICT(user_id, category) DO UPDATE
         SET score = MIN(100, score + 3), last_seen = CURRENT_TIMESTAMP`,
        [req.user.id, category]
      );
    }

    const reflection = await db.get('SELECT * FROM reflections WHERE id = ?', [result.id]);
    res.status(201).json({ reflection, tokensEarned });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Serverfehler' });
  }
});

// POST /api/reflections/:id/feedback
router.post('/:id/feedback', authenticateToken, async (req, res) => {
  try {
    const reflection = await db.get(
      'SELECT * FROM reflections WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (!reflection) return res.status(404).json({ error: 'Reflexion nicht gefunden' });
    if (reflection.feedback) return res.json({ feedback: reflection.feedback });

    const user = await db.get(
      'SELECT tokens, subscription, motive, chance FROM users WHERE id = ?',
      [req.user.id]
    );
    if (user.subscription !== 'pro' && user.tokens < 1)
      return res.status(402).json({ error: 'Nicht genug Tokens. Verdiene mehr durch längere Antworten oder kaufe Tokens.' });

    let feedback = '';

    if (openai) {
      try {
        const contextLines = [
          user.motive ? `Persönliches Motiv: ${user.motive}` : null,
          user.chance ? `Grösstes Potenzial: ${user.chance}` : null,
        ].filter(Boolean);

        const systemPrompt = `Du bist die innere Stimme der Person — ehrlich, klar und ohne Umwege. Du sprichst sie direkt an, als würdest du ihr ins Gesicht schauen. Nicht als Therapeut, nicht als Coach, sondern als die ehrlichste Version ihrer selbst.

Du sagst, was wirklich dahintersteckt. Du erkennst, was sie vielleicht noch nicht ausgesprochen haben. Du machst ihnen kein schlechtes Gewissen, aber du beschönigst auch nichts. Du sprichst sie mit "du" an — persönlich, direkt, auf Augenhöhe.

Dein Feedback ist kurz und trifft. Keine Theorie, keine Fachbegriffe, keine Listen. Nur 3 bis 4 Sätze, die sitzen. Kein Emoji.
${contextLines.length > 0 ? '\nWas du über die Person weißt:\n' + contextLines.join('\n') : ''}`;

        const completion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            {
              role: 'user',
              content: `Reflexionsfrage: ${reflection.question}\n\nAntwort der Person: ${reflection.answer}`,
            },
          ],
          max_tokens: 400,
          temperature: 0.65,
        });
        feedback = completion.choices[0].message.content || '';
      } catch (aiErr) {
        console.error('OpenAI error:', aiErr.message);
        feedback = fallbackFeedback(reflection.answer);
      }
    } else {
      feedback = fallbackFeedback(reflection.answer);
    }

    if (user.subscription !== 'pro') {
      await db.run('UPDATE users SET tokens = tokens - 1 WHERE id = ?', [req.user.id]);
      await db.run(
        'INSERT INTO token_transactions (user_id, amount, reason) VALUES (?, ?, ?)',
        [req.user.id, -1, 'AI Feedback']
      );
    }

    await db.run('UPDATE reflections SET feedback = ? WHERE id = ?', [feedback, req.params.id]);
    res.json({ feedback });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Serverfehler' });
  }
});

function fallbackFeedback(answer) {
  const words = answer.trim().split(/\s+/).length;
  if (words < 20) {
    return 'Du hast etwas angetippt, aber noch nicht wirklich hingeschaut. Was genau ist da passiert — und was hast du dabei gespürt? Geh nochmal rein.';
  }
  if (words < 50) {
    return 'Du siehst es schon. Jetzt stell dir die Frage, ob das ein einmaliger Moment war oder ob du dieses Muster schon öfter kennst. Wahrscheinlich kennst du es.';
  }
  return 'Du bist ehrlich mit dir — das ist keine Kleinigkeit. Was du hier beschreibst, weißt du eigentlich schon. Die Frage ist nicht mehr was, sondern wann du anfängst, es wirklich anders zu machen.';
}

// GET /api/reflections
router.get('/', authenticateToken, async (req, res) => {
  const { page = 1, limit = 20, category } = req.query;
  const offset = (Number(page) - 1) * Number(limit);
  try {
    const whereBase = 'WHERE user_id = ?';
    const catClause = category ? ` AND category = ?` : '';
    const params = category
      ? [req.user.id, category, Number(limit), offset]
      : [req.user.id, Number(limit), offset];
    const countParams = category ? [req.user.id, category] : [req.user.id];

    const reflections = await db.all(
      `SELECT * FROM reflections ${whereBase}${catClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      params
    );
    const total = await db.get(
      `SELECT COUNT(*) as count FROM reflections ${whereBase}${catClause}`,
      countParams
    );
    res.json({ reflections, total: total.count });
  } catch (err) {
    res.status(500).json({ error: 'Serverfehler' });
  }
});

// GET /api/reflections/stats
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const scores = await db.all(
      'SELECT category, score FROM user_category_scores WHERE user_id = ?',
      [req.user.id]
    );
    const totalReflections = await db.get(
      'SELECT COUNT(*) as count FROM reflections WHERE user_id = ?',
      [req.user.id]
    );
    const streakData = await db.get(
      'SELECT streak, tokens, last_reflection_date FROM users WHERE id = ?',
      [req.user.id]
    );
    const byCategoryCount = await db.all(
      'SELECT category, COUNT(*) as count FROM reflections WHERE user_id = ? AND category IS NOT NULL GROUP BY category',
      [req.user.id]
    );
    res.json({
      scores,
      totalReflections: totalReflections.count,
      byCategoryCount,
      ...streakData,
    });
  } catch (err) {
    res.status(500).json({ error: 'Serverfehler' });
  }
});

// GET /api/reflections/growth  — "Damals vs. Heute"
router.get('/growth', authenticateToken, async (req, res) => {
  try {
    const first = await db.get(
      `SELECT answer, question, created_at FROM reflections WHERE user_id = ? ORDER BY created_at ASC LIMIT 1`,
      [req.user.id]
    );
    const latest = await db.get(
      `SELECT answer, question, created_at FROM reflections WHERE user_id = ? ORDER BY created_at DESC LIMIT 1`,
      [req.user.id]
    );
    const firstWords = first ? first.answer.trim().split(/\s+/).length : 0;
    const latestWords = latest ? latest.answer.trim().split(/\s+/).length : 0;

    // Average words per reflection — first 3 vs last 3
    const firstThree = await db.all(
      `SELECT answer FROM reflections WHERE user_id = ? ORDER BY created_at ASC LIMIT 3`,
      [req.user.id]
    );
    const lastThree = await db.all(
      `SELECT answer FROM reflections WHERE user_id = ? ORDER BY created_at DESC LIMIT 3`,
      [req.user.id]
    );
    const avgFirst = firstThree.length
      ? Math.round(firstThree.reduce((a, r) => a + r.answer.trim().split(/\s+/).length, 0) / firstThree.length)
      : 0;
    const avgLast = lastThree.length
      ? Math.round(lastThree.reduce((a, r) => a + r.answer.trim().split(/\s+/).length, 0) / lastThree.length)
      : 0;

    // Total word count
    const allAnswers = await db.all(
      `SELECT answer FROM reflections WHERE user_id = ?`,
      [req.user.id]
    );
    const totalWords = allAnswers.reduce((a, r) => a + r.answer.trim().split(/\s+/).length, 0);

    // Weekly stats
    const thisWeek = await db.get(
      `SELECT COUNT(*) as count FROM reflections
       WHERE user_id = ? AND created_at >= date('now', '-7 days')`,
      [req.user.id]
    );
    const topCategoryThisWeek = await db.get(
      `SELECT category, COUNT(*) as count FROM reflections
       WHERE user_id = ? AND category IS NOT NULL AND created_at >= date('now', '-7 days')
       GROUP BY category ORDER BY count DESC LIMIT 1`,
      [req.user.id]
    );

    // Days since first reflection
    const daysSinceStart = first
      ? Math.max(1, Math.floor((Date.now() - new Date(first.created_at).getTime()) / 86400000))
      : 0;

    res.json({
      first: first || null,
      latest: latest || null,
      firstWords,
      latestWords,
      avgFirst,
      avgLast,
      totalWords,
      thisWeekCount: thisWeek?.count ?? 0,
      topCategoryThisWeek: topCategoryThisWeek?.category || null,
      daysSinceStart,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Serverfehler' });
  }
});

// GET /api/reflections/:id
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const reflection = await db.get(
      'SELECT * FROM reflections WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (!reflection) return res.status(404).json({ error: 'Nicht gefunden' });
    res.json(reflection);
  } catch (err) {
    res.status(500).json({ error: 'Serverfehler' });
  }
});

module.exports = router;
