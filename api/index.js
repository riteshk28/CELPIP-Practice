
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

// 2. SIGNUP
app.post('/api/signup', async (req, res) => {
  const { email, password, name } = req.body;
  const client = await pool.connect();

  try {
    const check = await client.query('SELECT id FROM users WHERE email = $1', [email]);
    if (check.rows.length > 0) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    const newId = `user-${Date.now()}`;
    const role = 'user'; 
    
    await client.query(
      'INSERT INTO users (id, email, password_hash, role, name) VALUES ($1, $2, $3, $4, $5)',
      [newId, email, password, role, name]
    );

    res.json({ id: newId, email, role, name });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error: ' + err.message });
  } finally {
    client.release();
  }
});

// 3. GET SETS
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
                'timerSeconds', p.timer_seconds || 600,
                'questions', COALESCE((
                  SELECT json_agg(json_build_object(
                    'id', q.id,
                    'partId', q.part_id,
                    'text', q.question_text,
                    'type', q.type,
                    'options', q.options,
                    'correctAnswer', q.correct_answer,
                    'weight', q.weight
                  ) ORDER BY q.order_index ASC) FROM questions q WHERE q.part_id = p.id
                ), '[]'::json)
              ) ORDER BY p.order_index ASC) FROM parts p WHERE p.section_id = sec.id
            ), '[]'::json)
          ) ORDER BY sec.order_index ASC) FROM sections sec WHERE sec.set_id = s.id
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

// 4. SAVE SET
app.post('/api/sets', async (req, res) => {
  const set = req.body;
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    // Using simple replace strategy
    await client.query('DELETE FROM practice_sets WHERE id = $1', [set.id]);
    
    await client.query(
      'INSERT INTO practice_sets (id, title, description, is_published) VALUES ($1, $2, $3, $4)',
      [set.id, set.title, set.description, set.isPublished]
    );

    let secOrder = 0;
    for (const sec of set.sections) {
      await client.query(
        'INSERT INTO sections (id, set_id, type, title, timer_seconds, order_index) VALUES ($1, $2, $3, $4, $5, $6)',
        [sec.id, set.id, sec.type, sec.title, 600, secOrder++]
      );

      let partOrder = 0;
      for (const part of sec.parts) {
        await client.query(
          'INSERT INTO parts (id, section_id, content_text, image_data, instructions, timer_seconds, order_index) VALUES ($1, $2, $3, $4, $5, $6, $7)',
          [part.id, sec.id, part.contentText, part.imageData, part.instructions, part.timerSeconds, partOrder++]
        );

        let qOrder = 0;
        for (const q of part.questions) {
          await client.query(
            'INSERT INTO questions (id, part_id, question_text, type, options, correct_answer, weight, order_index) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
            [q.id, part.id, q.text, q.type, JSON.stringify(q.options || []), q.correctAnswer, q.weight, qOrder++]
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

// 5. DELETE SET
app.delete('/api/sets/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM practice_sets WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. SAVE ATTEMPT
app.post('/api/attempts', async (req, res) => {
  const att = req.body;
  try {
    // Note: 'att.setTitle' is sent from frontend but not stored in user_attempts in this schema.
    // It will be retrieved via JOIN in GET request.
    await pool.query(
      'INSERT INTO user_attempts (id, user_id, set_id, section_scores, total_band_score, completed_at) VALUES ($1, $2, $3, $4, $5, $6)',
      [att.id, att.userId, att.setId, JSON.stringify(att.sectionScores), att.bandScore, new Date()]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 7. GET ATTEMPTS
app.get('/api/attempts/:userId', async (req, res) => {
  try {
    // JOIN to get the set title
    const query = `
      SELECT ua.*, ps.title as set_title 
      FROM user_attempts ua 
      LEFT JOIN practice_sets ps ON ua.set_id = ps.id 
      WHERE ua.user_id = $1
      ORDER BY ua.completed_at DESC
    `;
    const result = await pool.query(query, [req.params.userId]);
    
    const attempts = result.rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      setId: row.set_id,
      setTitle: row.set_title || 'Unknown Set',
      date: new Date(row.completed_at).toLocaleDateString(),
      sectionScores: row.section_scores,
      bandScore: parseFloat(row.total_band_score)
    }));
    res.json(attempts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = app;
