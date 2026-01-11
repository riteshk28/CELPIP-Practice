
// This file runs as a Serverless Function on Vercel
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));

// Database Connection
// Vercel will inject process.env.DATABASE_URL automatically if configured
const pool = new Pool({
  connectionString: process.env.DATABASE_URL, 
});

// --- ROUTES ---

// 1. LOGIN
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];

    if (user && user.password_hash === password) {
      res.json({ id: user.id, email: user.email, role: user.role, name: user.name });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error: ' + err.message });
  }
});

// 2. GET SETS
app.get('/api/sets', async (req, res) => {
  try {
    const query = `
      SELECT 
        s.id, s.title, s.description, s.is_published as "isPublished",
        COALESCE((
          SELECT json_agg(json_build_object(
            'id', sec.id,
            'setId', sec.set_id,
            'type', sec.type,
            'title', sec.title,
            'parts', COALESCE((
              SELECT json_agg(json_build_object(
                'id', p.id,
                'sectionId', p.section_id,
                'contentText', p.content_text,
                'imageData', p.image_data,
                'instructions', p.instructions,
                'timerSeconds', p.timer_seconds,
                'questions', COALESCE((
                  SELECT json_agg(json_build_object(
                    'id', q.id,
                    'partId', q.part_id,
                    'text', q.text,
                    'type', q.type,
                    'options', q.options,
                    'correctAnswer', q.correct_answer,
                    'weight', q.weight
                  )) FROM questions q WHERE q.part_id = p.id
                ), '[]'::json)
              )) FROM parts p WHERE p.section_id = sec.id
            ), '[]'::json)
          )) FROM sections sec WHERE sec.set_id = s.id
        ), '[]'::json) as sections
      FROM practice_sets s;
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// 3. SAVE SET
app.post('/api/sets', async (req, res) => {
  const set = req.body;
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM practice_sets WHERE id = $1', [set.id]);
    await client.query(
      'INSERT INTO practice_sets (id, title, description, is_published) VALUES ($1, $2, $3, $4)',
      [set.id, set.title, set.description, set.isPublished]
    );

    for (const sec of set.sections) {
      await client.query(
        'INSERT INTO sections (id, set_id, type, title) VALUES ($1, $2, $3, $4)',
        [sec.id, set.id, sec.type, sec.title]
      );

      for (const part of sec.parts) {
        await client.query(
          'INSERT INTO parts (id, section_id, content_text, image_data, instructions, timer_seconds) VALUES ($1, $2, $3, $4, $5, $6)',
          [part.id, sec.id, part.contentText, part.imageData, part.instructions, part.timerSeconds]
        );

        for (const q of part.questions) {
          await client.query(
            'INSERT INTO questions (id, part_id, text, type, options, correct_answer, weight) VALUES ($1, $2, $3, $4, $5, $6, $7)',
            [q.id, part.id, q.text, q.type, JSON.stringify(q.options || []), q.correctAnswer, q.weight]
          );
        }
      }
    }

    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// 4. DELETE SET
app.delete('/api/sets/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM practice_sets WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. SAVE ATTEMPT
app.post('/api/attempts', async (req, res) => {
  const att = req.body;
  try {
    await pool.query(
      'INSERT INTO attempts (id, user_id, set_id, set_title, date, section_scores, band_score) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [att.id, att.userId, att.setId, att.setTitle, att.date, JSON.stringify(att.sectionScores), att.bandScore]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. GET ATTEMPTS
app.get('/api/attempts/:userId', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM attempts WHERE user_id = $1', [req.params.userId]);
    const attempts = result.rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      setId: row.set_id,
      setTitle: row.set_title,
      date: row.date,
      sectionScores: row.section_scores,
      bandScore: row.band_score
    }));
    res.json(attempts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Vercel Serverless Export (No app.listen!)
module.exports = app;
