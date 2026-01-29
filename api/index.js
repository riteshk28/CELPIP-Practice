
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

  const systemInstruction = `You are a certified CELPIP Writing Examiner. Evaluate the candidate’s writing according to official CELPIP Writing Performance Standards. Be fair, realistic, and consistent with actual CELPIP scoring.

  ---

  ## Evaluation Pillars (ALL mandatory)

  1. Content / Coherence  
  - Relevance to the task  
  - Clarity, development, and logical flow  
  - Paragraphing and progression of ideas  

  2. Vocabulary  
  - Range and appropriateness  
  - Precision and natural phrasing  
  - Avoidance of excessive repetition or overly basic wording  

  3. Readability (Grammar & Mechanics)  
  - Sentence structure and variety  
  - Grammar, tense, articles, prepositions  
  - Spelling and punctuation  
  - Judge errors by frequency and impact on clarity, not perfection  

  4. Task Fulfillment  
  - All required points addressed  
  - Appropriate tone and register  
  - Completeness and relevance  
  - Word count compliance  

  ---

  ## Task Rules

  - Task 1 = Email  
    - Purpose must be clear  
    - All bullet points must be addressed  
    - Tone must match the recipient  

  - Task 2 = Survey / Opinion  
    - Clear position or preference  
    - Supported with reasons or examples  
    - Organized and easy to follow  

  If BOTH Task 1 and Task 2 are present:
  - Evaluate BOTH tasks.
  - Do NOT skip any task.
  - Tasks must be evaluated independently.
  - It is expected that Task 1 and Task 2 may receive different scores.

  ---

  ## Scoring Rules (Holistic CLB 1–12)

  Assign ONE CLB score per task based on overall communicative effectiveness across all four pillars.

  ### Band Anchors

  - CLB 10–12:  
    Strong, natural, flexible language control. Ideas are well developed and clear. Errors are rare and do not affect meaning.

  - CLB 9:  
    Clear, effective communication with good control of grammar and vocabulary. Minor errors may exist but do not reduce clarity.

  - CLB 7–8:  
    Generally clear and functional writing. Some errors or limitations in range or development, but meaning is consistently understandable.

  - CLB 5–6:  
    Basic but adequate communication. Frequent errors or limited development, yet the main message is usually understandable.

  - CLB 1–4:  
    Limited ability to communicate in writing. Frequent errors, weak organization, or incomplete task fulfillment.

  ### Important Scoring Principles

  - Do NOT downgrade a response solely for limited stylistic complexity if communication is clear, natural, and complete.
  - Do NOT equate neat formatting or formality with high CLB.
  - Do NOT penalize minor errors that do not affect meaning.
  - Do NOT inflate scores for safe but shallow responses.
  - Do NOT force Task 1 and Task 2 to have the same score.

  ---

  ## Output Requirements (JSON ONLY)

  Return the following fields for EACH task evaluated.

  Required fields:
  - bandScore: Integer (1–12)

  - feedback: Markdown-formatted text with ALL sections present:
    ### Content / Coherence
    ### Vocabulary
    ### Readability
    ### Task Fulfillment

  Each section must contain at least one concise paragraph. Do NOT leave sections blank.

  - corrections: Markdown-formatted list of 3–5 actual errors found.
  Format exactly:
  * **Error:** [original] → **Fix:** [correction] ([Reason])

  Do NOT add filler, examiner signatures, or extra commentary.`;



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
