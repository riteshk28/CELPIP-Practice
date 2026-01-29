
// This file runs as a Serverless Function on Vercel
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const bodyParser = require('body-parser');
const { GoogleGenAI, Type } = require("@google/genai");

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));

// Database Connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL, 
});

// Initialize Gemini Client Conditionally
const apiKey = process.env.API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

// --- HELPERS ---

// Convert Raw PCM to WAV (Essential for browser playback)
function addWavHeader(pcmData, sampleRate = 24000, numChannels = 1) {
    const header = Buffer.alloc(44);
    const byteRate = sampleRate * numChannels * 2; // 16-bit = 2 bytes
    const blockAlign = numChannels * 2;
    const dataSize = pcmData.length;
    const totalSize = 36 + dataSize;

    header.write('RIFF', 0);
    header.writeUInt32LE(totalSize, 4);
    header.write('WAVE', 8);
    header.write('fmt ', 12);
    header.writeUInt32LE(16, 16); // Subchunk1Size
    header.writeUInt16LE(1, 20); // AudioFormat (1 = PCM)
    header.writeUInt16LE(numChannels, 22);
    header.writeUInt32LE(sampleRate, 24);
    header.writeUInt32LE(byteRate, 28);
    header.writeUInt16LE(blockAlign, 32);
    header.writeUInt16LE(16, 34); // BitsPerSample
    header.write('data', 36);
    header.writeUInt32LE(dataSize, 40);

    return Buffer.concat([header, pcmData]);
}

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

// 8. EVALUATE WRITING
app.post('/api/evaluate-writing', async (req, res) => {
  const { questionText, userResponse } = req.body;
  if (!ai) return res.json({ bandScore: 0, feedback: "API Key missing.", corrections: "System Error" });

  const systemInstruction = `You are a certified CELPIP Writing Examiner. Evaluate the candidate's response based on the 4 pillars of the CELPIP Performance Standards.

  **Evaluation Pillars:**
  1. **Content/Coherence:** Quality of ideas, depth, logical organization, paragraphing, and flow.
  2. **Vocabulary:** Range, precision, and suitability of word choice.
  3. **Readability:** Grammar, sentence structure (simple vs complex), punctuation, and spelling.
  4. **Task Fulfillment:** Relevance, completeness (addressing all bullet points/requirements), word count, and tone consistency.

  **Task Specific Context:**
  - **Task 1 (Email):** Check for appropriate Tone (Formal vs Informal) based on the recipient. Ensure all 3 bullet points are fully addressed.
  - **Task 2 (Survey):** Check for a clear opinion and strong supporting justifications.

**Scoring Rule (Very Important):**
- Assign a holistic **CLB Level (1–12)** using the band anchors below.
- Evaluate all 4 pillars, but DO NOT over-penalize minor weaknesses if overall communication quality is high.
- If a response clearly meets the description of a higher band, do NOT downgrade it due to isolated or minor errors.
- Use the **highest band that the response consistently meets**, not the lowest.

  **CLB Band Anchors (Writing):**

  - **CLB 12:** Near-native control. Sophisticated ideas, precise vocabulary, varied complex sentence structures, flawless task fulfillment, and virtually no errors.
  - **CLB 11:** Highly polished and professional. Strong argumentation or message clarity, advanced vocabulary, excellent cohesion, and only trivial, barely noticeable errors.
  - **CLB 10:** Clear, well-developed, and effective throughout. Strong vocabulary, frequent complex sentences, clear organization, and minor non-disruptive errors only.
  - **CLB 9:** Very effective communication. Ideas are well supported and organized. Vocabulary is varied and appropriate. Some minor errors may appear but do not reduce clarity or quality.
  - **CLB 8:** Generally clear and competent. Task is fully addressed. Vocabulary and grammar are adequate with noticeable but manageable errors. Meaning is never unclear.
  - **CLB 7:** Adequate and functional writing. Main ideas are clear, task requirements are mostly met, but errors and limited complexity reduce overall quality.
  - **CLB 6:** Limited effectiveness. Ideas may be underdeveloped or repetitive. Frequent grammar or vocabulary issues, but the message is still understandable.
  - **CLB 5:** Basic communication. Meaning is sometimes unclear due to errors, weak organization, or incomplete task fulfillment.
  - **CLB 4:** Very limited writing ability. Frequent errors, weak coherence, and poor task fulfillment significantly affect understanding.
  - **CLB 3:** Minimal control. Ideas are difficult to follow. Vocabulary and grammar are extremely limited.
  - **CLB 2:** Fragmented or memorized language. Meaning is mostly unclear.
  - **CLB 1:** Incomprehensible or irrelevant response.

  **Anti-Downgrading Rule (Critical):**
  - If the response is clearly stronger than CLB 7 quality, DO NOT assign CLB 7.
  - If the response matches CLB 9 characteristics overall, assign CLB 9 even if minor issues exist.
  - Minor grammar, spelling, or repetition issues alone must NOT prevent a CLB 9 or 10 score.


  **Output Requirements (JSON):**
  - **bandScore**: Integer (1-12).
  - **feedback**: A Markdown-formatted string. Use headers like "### Content/Coherence" to structure the feedback. Be specific about strengths and weaknesses for each pillar.
  - **corrections**: A Markdown-formatted string. List 3-5 specific errors found in the text with corrections. Format: "* **Error:** [original] -> **Fix:** [correction] ([Reason])"`;

  try {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Task Instructions: ${questionText}\n\nCandidate Response: ${userResponse}`,
        config: {
            systemInstruction: systemInstruction,
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    bandScore: { type: Type.NUMBER },
                    feedback: { type: Type.STRING },
                    corrections: { type: Type.STRING }
                }
            }
        }
    });
    let text = response.text;
    if (text.startsWith('```json')) text = text.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    else if (text.startsWith('```')) text = text.replace(/^```\s*/, '').replace(/\s*```$/, '');
    res.json(JSON.parse(text));
  } catch (err) {
    console.error("Gemini Error:", err);
    res.status(500).json({ error: "Failed to evaluate writing." });
  }
});

// 9. GENERATE SPEECH (New Endpoint)
app.post('/api/generate-speech', async (req, res) => {
    const { text } = req.body;
    if (!ai) return res.status(500).json({ error: "API Key missing" });
    if (!text) return res.status(400).json({ error: "Text is required" });

    try {
        // Detect speakers
        const speakerRegex = /^([A-Za-z0-9 ]+):/gm;
        const speakers = new Set();
        let match;
        while ((match = speakerRegex.exec(text)) !== null) {
            speakers.add(match[1].trim());
        }
        const uniqueSpeakers = Array.from(speakers);

        let config = {};

        // If 2 or more speakers detected, use multi-speaker config
        if (uniqueSpeakers.length >= 2) {
            // Assign specific voices to the first few unique speakers found
            // Voices: Fenrir (M), Kore (F), Puck (M), Charon (M)
            const voices = ['Fenrir', 'Kore', 'Puck', 'Charon'];
            
            const speakerConfigs = uniqueSpeakers.slice(0, 4).map((speakerName, index) => ({
                speaker: speakerName,
                voiceConfig: { prebuiltVoiceConfig: { voiceName: voices[index % voices.length] } }
            }));

            config = {
                responseModalities: ["AUDIO"],
                speechConfig: {
                    multiSpeakerVoiceConfig: {
                        speakerVoiceConfigs: speakerConfigs
                    }
                }
            };
        } else {
            // Single speaker fallback
            config = {
                responseModalities: ["AUDIO"],
                speechConfig: {
                    voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Fenrir' } }
                }
            };
        }

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: { parts: [{ text: text }] },
            config: config
        });

        const rawPcmBase64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!rawPcmBase64) throw new Error("No audio generated.");

        const pcmBuffer = Buffer.from(rawPcmBase64, 'base64');
        const wavBuffer = addWavHeader(pcmBuffer, 24000); 
        const wavBase64 = wavBuffer.toString('base64');

        res.json({ audioData: `data:audio/wav;base64,${wavBase64}` });

    } catch (err) {
        console.error("TTS Error:", err);
        res.status(500).json({ error: err.message || "Failed to generate speech" });
    }
});

module.exports = app;
