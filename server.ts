import express from 'express';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '25mb' }));

// Initialize Google GenAI client
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;
if (apiKey) {
  ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', hasGeminiKey: !!apiKey });
});

// Translation API endpoint
app.post('/api/translate', async (req, res) => {
  try {
    const {
      text,
      sourceLang = 'auto',
      targetLang = 'ar',
      targetLangName = 'Arabic',
      gameName = 'Generic RPG',
      glossary = [],
      characterNames = [],
      contextHistory = [],
      tone = 'fantasy',
    } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text is required for translation.' });
    }

    if (!ai) {
      return res.status(503).json({
        error: 'Gemini API key is not configured on the server.',
        fallback: true,
      });
    }

    // Build rich contextual instructions
    const glossaryPrompt = glossary.length > 0
      ? `\nGame-specific Glossary (MANDATORY SUBSTITUTIONS):\n${glossary
          .map((g: { source: string; target: string; note?: string }) => `- "${g.source}" MUST be translated as "${g.target}"${g.note ? ` (${g.note})` : ''}`)
          .join('\n')}`
      : '';

    const charPrompt = characterNames.length > 0
      ? `\nPreserved Characters & Locations (keep these recognizable or transliterated respectfully):\n${characterNames.join(', ')}`
      : '';

    const contextPrompt = contextHistory.length > 0
      ? `\nPrevious Dialogue Context (for maintaining continuity and pronoun resolution):\n${contextHistory
          .slice(-4)
          .map((c: { speaker?: string; text: string }) => `${c.speaker ? c.speaker + ': ' : ''}${c.text}`)
          .join('\n')}`
      : '';

    const systemInstruction = `You are an expert video game localization director and dialogue translator specialized in RPGs, fantasy, action, and sci-fi games.
Your task is to translate in-game text into ${targetLangName} (Language code: ${targetLang}).
Source language specified: ${sourceLang === 'auto' ? 'Auto-detect source language' : sourceLang}.
Tone guideline: ${tone}.
${glossaryPrompt}
${charPrompt}
${contextPrompt}

CRITICAL RULES:
1. Detect any speaker name if formatted like "Character: Dialogue" or "[Speaker] Line" or "Name\\nLine". Separate speaker and translated dialogue.
2. In RPGs, terms like "Quest", "Exp", "Mana", "Grace", "Maiden", "Sanctuary" must feel natural to gamers, never machine-translated robotically.
3. Preserve all placeholder tokens, numbers, markup tags (e.g. <color>, {0}, %d) exactly as in the original.
4. Output strict JSON matching the schema.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `Translate this game text into ${targetLangName}:\n"""\n${text}\n"""`,
      config: {
        systemInstruction,
        temperature: 0.2,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            detectedLanguage: {
              type: Type.STRING,
              description: 'The detected original language of the text (e.g. Japanese, English, Russian, etc.)',
            },
            speaker: {
              type: Type.STRING,
              description: 'The speaker name if present in the text, or empty string if narrator/general',
            },
            translatedText: {
              type: Type.STRING,
              description: 'The localized, natural translation in the target language',
            },
            notes: {
              type: Type.STRING,
              description: 'Brief note on cultural or gaming nuance applied (e.g., custom glossary term replaced)',
            },
          },
          required: ['detectedLanguage', 'translatedText'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json({
      success: true,
      originalText: text,
      translatedText: parsed.translatedText || text,
      detectedLanguage: parsed.detectedLanguage || 'Detected',
      speaker: parsed.speaker || '',
      notes: parsed.notes || '',
    });
  } catch (err: unknown) {
    const error = err as Error;
    console.error('Gemini translate error:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to translate game text',
    });
  }
});

// Multimodal Game Screen OCR + Translation Endpoint
app.post('/api/ocr-translate', async (req, res) => {
  try {
    const {
      imageBase64,
      mimeType = 'image/png',
      sourceLang = 'auto',
      targetLang = 'ar',
      targetLangName = 'Arabic',
      gameName = 'Generic RPG',
      glossary = [],
      characterNames = [],
      contextHistory = [],
      tone = 'fantasy',
    } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'Image base64 data is required.' });
    }

    if (!ai) {
      return res.status(503).json({
        error: 'Gemini API key is not configured on the server.',
        fallback: true,
      });
    }

    // Clean base64 if it has header
    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');

    const glossaryPrompt = glossary.length > 0
      ? `\nGame-specific Glossary:\n${glossary
          .map((g: { source: string; target: string }) => `- "${g.source}" -> "${g.target}"`)
          .join('\n')}`
      : '';

    const charPrompt = characterNames.length > 0
      ? `\nCharacter / Location Names:\n${characterNames.join(', ')}`
      : '';

    const systemInstruction = `You are a high-speed video game screen reader (OCR) and localization AI for real-time gaming HUDs.
An image of a video game screen area (dialogue box, quest tracker, speech bubble, or subtitle banner) is provided.
Your goals:
1. OCR: Accurately read all textual characters from the game graphics, including stylized gaming fonts, pixel art, or Japanese/Chinese kanji/hiragana/katakana, Cyrillic, Arabic, Latin, etc.
2. Filter out non-text graphical UI icons unless they are speaker icons.
3. Detect the game's source language.
4. Translate the extracted game text directly into ${targetLangName} (Language code: ${targetLang}).
Tone: ${tone}.
${glossaryPrompt}
${charPrompt}
5. Return strictly valid JSON matching the schema.`;

    const imagePart = {
      inlineData: {
        mimeType: mimeType,
        data: cleanBase64,
      },
    };

    const textPart = {
      text: `Analyze this cropped game screen area. Extract any visible game text, detect the original language, identify any speaker name, and provide an accurate, immersive translation in ${targetLangName}.`,
    };

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: { parts: [imagePart, textPart] },
      config: {
        systemInstruction,
        temperature: 0.1,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            ocrExtractedText: {
              type: Type.STRING,
              description: 'The raw text read from the game screenshot',
            },
            detectedLanguage: {
              type: Type.STRING,
              description: 'Original detected language in the image',
            },
            speaker: {
              type: Type.STRING,
              description: 'Speaker or character name if detected',
            },
            translatedText: {
              type: Type.STRING,
              description: 'The high quality game translation in the target language',
            },
            confidence: {
              type: Type.NUMBER,
              description: 'Confidence score between 0.0 and 1.0',
            },
          },
          required: ['ocrExtractedText', 'detectedLanguage', 'translatedText'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json({
      success: true,
      originalText: parsed.ocrExtractedText || '',
      translatedText: parsed.translatedText || '',
      detectedLanguage: parsed.detectedLanguage || 'Detected',
      speaker: parsed.speaker || '',
      confidence: parsed.confidence || 0.95,
    });
  } catch (err: unknown) {
    const error = err as Error;
    console.error('Gemini OCR translate error:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to OCR and translate game image',
    });
  }
});

// Production static file serving & Vite Dev Server integration
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`🎮 Multilingual Game Translator server running on http://localhost:${PORT}`);
  });
}

startServer();
