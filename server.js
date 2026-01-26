const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const bodyParser = require('body-parser');
const { GoogleGenAI, Type } = require("@google/genai");

const app = express();
const port = 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' })); 

// Database Connection
const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_LQglPOITy69A@ep-steep-wildflower-ahck6uyl-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require',
});

// Initialize Gemini Client Conditionally
// Note: In local development, ensure process.env.API_KEY is set or passed when running the server
const apiKey = process.env.API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

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
    res.status(500).json({ error: 'Database error' });
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
                'audioData', p.audio_data,
                'instructions', p.instructions,
                'timerSeconds', COALESCE(p.timer_seconds, 600),
                'questions', COALESCE((
                  SELECT json_agg(json_build_object(
                    'id', q.id,
                    'partId', q.part_id,
                    'text', q.question_text,
                    'type', q.type,
                    'options', q.options,
                    'correctAnswer', q.correct_answer,
                    'weight', q.weight,
                    'audioData', q.audio_data
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
          'INSERT INTO parts (id, section_id, content_text, image_data, audio_data, instructions, timer_seconds, order_index) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
          [part.id, sec.id, part.contentText, part.imageData, part.audioData, part.instructions, part.timerSeconds, partOrder++]
        );

        let qOrder = 0;
        for (const q of part.questions) {
          await client.query(
            'INSERT INTO questions (id, part_id, question_text, type, options, correct_answer, weight, audio_data, order_index) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
            [q.id, part.id, q.text, q.type, JSON.stringify(q.options || []), q.correctAnswer, q.weight, q.audioData, qOrder++]
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
      'INSERT INTO user_attempts (id, user_id, set_id, section_scores, total_band_score, completed_at, ai_feedback) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [att.id, att.userId, att.setId, JSON.stringify(att.sectionScores), att.bandScore, new Date(), JSON.stringify(att.aiFeedback || {})]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 7. GET ATTEMPTS
app.get('/api/attempts/:userId', async (req, res) => {
  try {
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
      bandScore: parseFloat(row.total_band_score),
      aiFeedback: row.ai_feedback || {}
    }));
    res.json(attempts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 8. EVALUATE WRITING (New Endpoint)
app.post('/api/evaluate-writing', async (req, res) => {
  const { questionText, userResponse } = req.body;
  
  // If no API key configured, return mock data to prevent crash
  if (!ai) {
      return res.json({
          bandScore: 7,
          feedback: "API Key missing. This is a mock evaluation.\n\nYour writing is clear but needs better vocabulary.",
          corrections: "Ensure the Gemini API Key is set in Vercel environment variables."
      });
  }

  try {
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `You are an expert CELPIP Examiner. Evaluate the student response based on the official 4 CELPIP categories.
        
        === PROMPT ===
        ${questionText}

        === STUDENT RESPONSE ===
        ${userResponse}

        === EXAMINER GUIDANCE ===
        **For Task 1 (Email):**
        * Focus heavily on **Tone/Register**. If writing to a boss, it must be formal. If to a friend, informal.
        * Ensure every bullet point in the prompt is addressed.

        **For Task 2 (Opinion Survey):**
        * **Crucial:** Do not penalize the student for "factual" contradictions against the prompt's background information.
        * If the prompt says "Option B is expensive," but the student argues "Option B saves money," **accept this as a valid opinion**. The student is allowed to invent reasons or challenge premises to support their choice.
        * Focus entirely on how **persuasively and clearly** they express that opinion in English, not on the real-world logic of their argument.

        === EVALUATION CRITERIA ===
        1. **Content/Coherence**: Logical flow of sentences, paragraphing, and clarity of the argument (regardless of factual accuracy).
        2. **Vocabulary**: Word choice, range, precision, naturalness.
        3. **Readability**: Grammar, punctuation, spelling, sentence structure variety.
        4. **Task Fulfillment**: Word count compliance, tone appropriateness, and relevance to the topic.

        === OUTPUT FORMAT INSTRUCTIONS ===
        You must return valid JSON.
        
        Fields:
        - bandScore: An integer from 0 to 12.
        - feedback: A formatted string using simple Markdown headers (###) for each category. Be very specific about what they did well and what they missed. Example: "### Vocabulary\nGood use of..."
        - corrections: A formatted string listing specific errors. Use the format: "**Original Text** -> **Better Version**: Explanation". separating each error with a newline.

        Be strict on Grammar and Vocabulary, but lenient on the Logic of the opinion.
        `,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    bandScore: { type: Type.NUMBER, description: "CELPIP Level 0-12" },
                    feedback: { type: Type.STRING, description: "Detailed Markdown feedback categorized by criteria." },
                    corrections: { type: Type.STRING, description: "List of specific errors and improvements." }
                }
            }
        }
    });
    
    let text = response.text;
    if (!text) {
        throw new Error("Gemini returned empty response. It might have been blocked by safety settings.");
    }

    // Clean up potential markdown formatting if the model adds it despite mimeType
    if (text.startsWith('```json')) {
        text = text.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (text.startsWith('```')) {
        text = text.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    const jsonResponse = JSON.parse(text);
    res.json(jsonResponse);

  } catch (err) {
    console.error("Gemini Error:", err);
    res.status(500).json({ error: "Failed to evaluate writing." });
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});