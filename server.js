
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const port = 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' })); // Increased limit for image uploads

// Database Connection
const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_LQglPOITy69A@ep-steep-wildflower-ahck6uyl-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require',
});

// --- ROUTES ---

// 1. LOGIN
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    // SECURITY NOTE: In production, use bcrypt.compare(password, user.password_hash)
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];

    if (user && user.password_hash === password) {
      res.json({ id: user.id, email: user.email, role: user.role, name: user.name });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// 2. SIGNUP
app.post('/api/signup', async (req, res) => {
  const { email, password, name } = req.body;
  const client = await pool.connect();

  try {
    // Check if user exists
    const check = await client.query('SELECT id FROM users WHERE email = $1', [email]);
    if (check.rows.length > 0) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    // Insert new user
    const newId = `user-${Date.now()}`;
    const role = 'user'; // Default role
    
    // NOTE: In production, password must be hashed!
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

// 3. GET SETS (With full hierarchy)
app.get('/api/sets', async (req, res) => {
  try {
    // Complex query to construct the nested JSON object for PracticeSet -> Section -> Part -> Question
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

// 4. SAVE SET (Create or Update - Full Replace Strategy for simplicity)
app.post('/api/sets', async (req, res) => {
  const set = req.body;
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // 1. Delete existing set (Cascade triggers deletion of sections, parts, questions)
    // We use upsert logic: delete if exists, then insert fresh.
    await client.query('DELETE FROM practice_sets WHERE id = $1', [set.id]);

    // 2. Insert Set
    await client.query(
      'INSERT INTO practice_sets (id, title, description, is_published) VALUES ($1, $2, $3, $4)',
      [set.id, set.title, set.description, set.isPublished]
    );

    // 3. Insert Sections
    for (const sec of set.sections) {
      await client.query(
        'INSERT INTO sections (id, set_id, type, title) VALUES ($1, $2, $3, $4)',
        [sec.id, set.id, sec.type, sec.title]
      );

      // 4. Insert Parts
      for (const part of sec.parts) {
        await client.query(
          'INSERT INTO parts (id, section_id, content_text, image_data, instructions, timer_seconds) VALUES ($1, $2, $3, $4, $5, $6)',
          [part.id, sec.id, part.contentText, part.imageData, part.instructions, part.timerSeconds]
        );

        // 5. Insert Questions
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
    await pool.query(
      'INSERT INTO attempts (id, user_id, set_id, set_title, date, section_scores, band_score) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [att.id, att.userId, att.setId, att.setTitle, att.date, JSON.stringify(att.sectionScores), att.bandScore]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 7. GET ATTEMPTS
app.get('/api/attempts/:userId', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM attempts WHERE user_id = $1', [req.params.userId]);
    // Format response to match Attempt interface
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

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
