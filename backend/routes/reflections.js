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

        const systemPrompt = `Du bist ein erfahrener Psychologe mit Spezialisierung auf Persönlichkeitsentwicklung, humanistische Psychologie und kognitive Verhaltenstherapie. Du begleitest Menschen in ihrer täglichen Selbstreflexion.

Deine Rückmeldungen sind präzise, klar und psychologisch fundiert. Du vermeidest Floskeln, überschwängliches Lob und oberflächliche Ermutigung. Stattdessen benennst du konkrete Muster, stellst vertiefende Fragen oder gibst handlungsrelevante Impulse — basierend ausschliesslich auf dem, was die Person geschrieben hat.

Sprache: Deutsch. Ton: ruhig, direkt, professionell — wie ein Therapeut in einer Sitzung, nicht wie ein Motivationscoach.
Länge: 3 bis 5 prägnante Sätze. Keine Aufzählungen. Kein Emoji.
${contextLines.length > 0 ? '\nKontext zur Person:\n' + contextLines.join('\n') : ''}`;

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
    return 'Diese Antwort deutet auf eine erste Beobachtung hin. Für eine tiefere Arbeit an dir selbst wäre es hilfreich, die Situation konkreter zu beschreiben: Was genau hast du wahrgenommen, und welcher Gedanke oder welches Gefühl stand dahinter?';
  }
  if (words < 50) {
    return 'Du hast eine relevante Beobachtung formuliert. In der psychologischen Selbstreflexion ist der nächste Schritt, die Verbindung zwischen dem Beschriebenen und einem wiederkehrenden Muster in deinem Erleben zu untersuchen. Welche Situationen in deiner Vergangenheit erinnern dich daran?';
  }
  return 'Deine Reflexion zeigt eine ernsthafte Auseinandersetzung mit dir selbst. Was du beschreibst, enthält bereits Ansätze zur Selbsterkenntnis — entscheidend ist nun, daraus konkrete Handlungsschritte abzuleiten. Formuliere eine spezifische Situation, in der du das Erkannte bewusst anders angehen möchtest.';
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
