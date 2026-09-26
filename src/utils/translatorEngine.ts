import { GameProfile, TranslationRecord } from '../types';
import { SUPPORTED_LANGUAGES } from '../data/languages';

// Cache for translated lines to prevent redundant requests
const translationCache = new Map<string, TranslationRecord>();

// Common gaming phrasebook for instant local / offline fallback
interface PhraseEntry {
  patterns: (string | RegExp)[];
  translations: Record<string, string>;
  speaker?: string;
}

const LOCAL_PHRASEBOOK: PhraseEntry[] = [
  {
    patterns: [
      /find the ancient temple before sunset/i,
      /日没前に古代の寺院を見つけてください/,
      /найдите древний храм до заката/i,
      /在日落之前找到古老的神庙/,
      /finde den alten tempel vor sonnenuntergang/i,
    ],
    translations: {
      ar: 'اعثر على المعبد القديم قبل غروب الشمس.',
      ru: 'Найдите древний храм до заката.',
      ja: '日没前に古代の寺院を見つけてください。',
      zh: '在日落之前找到古老的神庙。',
      'zh-TW': '在日落之前找到古老的神廟。',
      de: 'Finde den alten Tempel vor Sonnenuntergang.',
      en: 'Find the ancient temple before sunset.',
      ko: '일몰 전에 고대 사원을 찾으십시오.',
      fr: "Trouvez l'ancien temple avant le coucher du soleil.",
      es: 'Encuentra el templo antiguo antes del atardecer.',
      pt: 'Encontre o templo antigo antes do pôr do sol.',
      it: 'Trova il tempio antico prima del tramonto.',
      tr: 'Gün batımından önce antik tapınağı bulun.',
      pl: 'Znajdź starożytną świątynię przed zachodem słońca.',
    },
  },
  {
    patterns: [
      /the syndicate operative is waiting at the lower docks/i,
      /シンジケートの工作員が下部ドックで待っています/,
    ],
    translations: {
      ar: 'عميل المنظمة السرية ينتظرك عند الأرصفة السفلية.',
      ru: 'Оперативник синдиката ждет в нижних доках.',
      ja: 'シンジケートの工作員が下層ドックで待機しています。',
      zh: '辛迪加特工正在下层码头等待。',
      de: 'Der Syndikatsagent wartet an den unteren Docks.',
      en: 'The syndicate operative is waiting at the lower docks.',
      es: 'El operativo del sindicato está esperando en los muelles inferiores.',
      fr: "L'agent du syndicat vous attend aux quais inférieurs.",
    },
  },
  {
    patterns: [
      /黄昏の光が消える前に急がねばなりません/,
      /we must hurry before the twilight fades/i,
    ],
    translations: {
      ar: 'يجب أن نسرع قبل أن يتلاشى نور الغسق.',
      ru: 'Мы должны спешить, пока свет сумерек не угас.',
      ja: '黄昏の光が消える前に急がねばなりません。',
      zh: '我们必须在暮光消逝之前抓紧时间。',
      de: 'Wir müssen uns beeilen, bevor das Dämmerlicht schwindet.',
      en: 'We must hurry before the twilight fades.',
      es: 'Debemos darnos prisa antes de que la luz del crepúsculo se desvanezca.',
    },
  },
  {
    patterns: [
      /祝福の導きはかすかに揺らいでいます/i,
      /guidance of grace/i,
    ],
    translations: {
      ar: 'نور الإرشاد والنعمة يتلاشى ببطء، انطلق بلا خوف.',
      ru: 'Путеводная благодать слабо мерцает.',
      ja: '祝福の導きはかすかに揺らいでいます。',
      zh: '赐福的指引正在微弱地闪烁。',
      en: 'The guidance of grace flickers faintly.',
      de: 'Die Führung der Gnade flackert schwach.',
    },
  },
  {
    patterns: [
      /quest updated/i,
      /neue quest/i,
      /новая задача/i,
    ],
    translations: {
      ar: 'تم تحديث المهمة الكبرى ⚔️',
      ru: 'Задание обновлено ⚔️',
      ja: 'クエストが更新されました ⚔️',
      zh: '任务已更新 ⚔️',
      de: 'Quest aktualisiert ⚔️',
      en: 'Quest Updated ⚔️',
      es: 'Misión actualizada ⚔️',
      fr: 'Quête mise à jour ⚔️',
    },
  },
];

// Helper to apply custom glossary substitutions
export function applyGlossarySubstitutions(text: string, glossary: GameProfile['glossary']): { text: string; replacedTerms: string[] } {
  if (!glossary || glossary.length === 0) return { text, replacedTerms: [] };
  let result = text;
  const replacedTerms: string[] = [];

  for (const entry of glossary) {
    if (!entry.source || !entry.target) continue;
    const regex = new RegExp(`\\b${escapeRegExp(entry.source)}\\b`, 'gi');
    if (regex.test(result)) {
      result = result.replace(regex, entry.target);
      replacedTerms.push(`${entry.source} -> ${entry.target}`);
    }
  }

  return { text: result, replacedTerms };
}

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Local heuristic translation function
export function localTranslate(
  text: string,
  targetLang: string,
  profile: GameProfile
): { translatedText: string; speaker: string; detectedLanguage: string; notes: string } {
  // Check for speaker pattern: "Name: Text" or "Name\nText" or "[Name] Text"
  let speaker = '';
  let cleanText = text.trim();

  const colonMatch = cleanText.match(/^([A-Za-z0-9_\u0600-\u06FF\u3040-\u30FF\u4E00-\u9FFF\u0400-\u04FF\s()\-]+)[:：]\s*(.*)$/s);
  if (colonMatch) {
    speaker = colonMatch[1].trim();
    cleanText = colonMatch[2].trim();
  } else {
    const bracketMatch = cleanText.match(/^\[([A-Za-z0-9_\s()\-]+)\]\s*(.*)$/s);
    if (bracketMatch) {
      speaker = bracketMatch[1].trim();
      cleanText = bracketMatch[2].trim();
    }
  }

  // Check phrasebook
  for (const entry of LOCAL_PHRASEBOOK) {
    for (const pattern of entry.patterns) {
      if (typeof pattern === 'string' ? cleanText.toLowerCase().includes(pattern.toLowerCase()) : pattern.test(cleanText)) {
        let matched = entry.translations[targetLang] || entry.translations['en'] || cleanText;
        const glossaryResult = applyGlossarySubstitutions(matched, profile.glossary);
        return {
          translatedText: glossaryResult.text,
          speaker: speaker || entry.speaker || '',
          detectedLanguage: detectLanguageSimple(cleanText),
          notes: glossaryResult.replacedTerms.length > 0 ? `Glossary applied: ${glossaryResult.replacedTerms.join(', ')}` : 'Instant Game Lexicon match',
        };
      }
    }
  }

  // Fallback: apply glossary substitutions and word-level RPG dictionary
  let result = cleanText;
  const glossaryResult = applyGlossarySubstitutions(result, profile.glossary);
  result = glossaryResult.text;

  // Detect script
  const detectedLang = detectLanguageSimple(cleanText);

  // Common quick word mapping if not in phrasebook
  const wordReplacements: Record<string, Record<string, string>> = {
    ar: {
      Quest: 'المهمة',
      Temple: 'المعبد',
      Sunset: 'غروب الشمس',
      Ancient: 'القديم',
      Before: 'قبل',
      Find: 'اعثر على',
      The: 'الـ',
      Danger: 'خطر',
      Level: 'المستوى',
      Health: 'نقاط الحياة',
      Mana: 'الطاقة السحرية',
      Inventory: 'الحقيبة',
      Attack: 'هجوم',
      Defend: 'دفاع',
    },
    ru: {
      Quest: 'Задание',
      Temple: 'Храм',
      Sunset: 'Закат',
      Ancient: 'Древний',
      Find: 'Найдите',
      Level: 'Уровень',
    },
    ja: {
      Quest: 'クエスト',
      Temple: '寺院',
      Sunset: '日没',
      Ancient: '古代の',
      Find: '見つけてください',
    },
    de: {
      Quest: 'Quest',
      Temple: 'Tempel',
      Sunset: 'Sonnenuntergang',
      Ancient: 'Uralt',
      Find: 'Finde',
    },
  };

  const dict = wordReplacements[targetLang];
  if (dict) {
    for (const [w, trans] of Object.entries(dict)) {
      const reg = new RegExp(`\\b${w}\\b`, 'gi');
      result = result.replace(reg, trans);
    }
  }

  return {
    translatedText: result,
    speaker,
    detectedLanguage: detectedLang,
    notes: glossaryResult.replacedTerms.length > 0 ? `Preserved gaming terms: ${glossaryResult.replacedTerms.join(', ')}` : 'Local Heuristic Engine',
  };
}

export function detectLanguageSimple(text: string): string {
  if (/[\u3040-\u309F\u30A0-\u30FF]/.test(text)) return 'Japanese';
  if (/[\u4E00-\u9FFF]/.test(text)) return 'Chinese';
  if (/[\u0400-\u04FF]/.test(text)) return 'Russian';
  if (/[\u0600-\u06FF]/.test(text)) return 'Arabic';
  if (/[\uAC00-\uD7AF]/.test(text)) return 'Korean';
  if (/[äöüßÄÖÜ]/.test(text)) return 'German';
  return 'English / Latin';
}

export async function translateGameText({
  text,
  sourceLang = 'auto',
  targetLang = 'ar',
  gameProfile,
  contextHistory = [],
  engine = 'gemini',
}: {
  text: string;
  sourceLang?: string;
  targetLang?: string;
  gameProfile: GameProfile;
  contextHistory?: Array<{ speaker?: string; text: string }>;
  engine?: 'gemini' | 'local_heuristic' | 'hybrid';
}): Promise<TranslationRecord> {
  const targetLangObj = SUPPORTED_LANGUAGES.find((l) => l.code === targetLang) || SUPPORTED_LANGUAGES[0];
  const cacheKey = `${text.trim()}_${sourceLang}_${targetLang}_${gameProfile.id}`;

  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey)!;
  }

  // If local engine requested or offline test
  if (engine === 'local_heuristic') {
    const local = localTranslate(text, targetLang, gameProfile);
    const record: TranslationRecord = {
      id: 'rec_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      timestamp: Date.now(),
      originalText: text,
      translatedText: local.translatedText,
      detectedLanguage: local.detectedLanguage,
      targetLanguage: targetLang,
      speaker: local.speaker,
      gameProfileId: gameProfile.id,
      confidence: 0.92,
      notes: local.notes,
      engine: 'local_heuristic',
    };
    translationCache.set(cacheKey, record);
    return record;
  }

  // Server-side Gemini translation
  try {
    const response = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        sourceLang,
        targetLang,
        targetLangName: targetLangObj.name,
        gameName: gameProfile.name,
        glossary: gameProfile.glossary,
        characterNames: gameProfile.characterNames,
        contextHistory,
        tone: gameProfile.tone,
      }),
    });

    if (!response.ok) {
      throw new Error(`Server returned HTTP ${response.status}`);
    }

    const data = await response.json();
    if (data.success) {
      const record: TranslationRecord = {
        id: 'rec_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        timestamp: Date.now(),
        originalText: text,
        translatedText: data.translatedText,
        detectedLanguage: data.detectedLanguage || 'Auto Detected',
        targetLanguage: targetLang,
        speaker: data.speaker || '',
        gameProfileId: gameProfile.id,
        confidence: 0.98,
        notes: data.notes || '',
        engine: 'gemini',
      };
      translationCache.set(cacheKey, record);
      return record;
    } else {
      throw new Error(data.error || 'Translation failed');
    }
  } catch (error) {
    console.warn('Gemini endpoint error, falling back to local heuristic:', error);
    const local = localTranslate(text, targetLang, gameProfile);
    const record: TranslationRecord = {
      id: 'rec_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      timestamp: Date.now(),
      originalText: text,
      translatedText: local.translatedText,
      detectedLanguage: local.detectedLanguage,
      targetLanguage: targetLang,
      speaker: local.speaker,
      gameProfileId: gameProfile.id,
      confidence: 0.85,
      notes: `Offline Heuristic Engine (${local.notes})`,
      engine: 'local_heuristic',
    };
    translationCache.set(cacheKey, record);
    return record;
  }
}

// Multimodal Game Screen Crop OCR & Translation
export async function ocrAndTranslateImage({
  imageBase64,
  sourceLang = 'auto',
  targetLang = 'ar',
  gameProfile,
  contextHistory = [],
}: {
  imageBase64: string;
  sourceLang?: string;
  targetLang?: string;
  gameProfile: GameProfile;
  contextHistory?: Array<{ speaker?: string; text: string }>;
}): Promise<TranslationRecord> {
  const targetLangObj = SUPPORTED_LANGUAGES.find((l) => l.code === targetLang) || SUPPORTED_LANGUAGES[0];

  try {
    const response = await fetch('/api/ocr-translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageBase64,
        sourceLang,
        targetLang,
        targetLangName: targetLangObj.name,
        gameName: gameProfile.name,
        glossary: gameProfile.glossary,
        characterNames: gameProfile.characterNames,
        contextHistory,
        tone: gameProfile.tone,
      }),
    });

    if (!response.ok) {
      throw new Error(`Server returned HTTP ${response.status}`);
    }

    const data = await response.json();
    if (data.success && data.translatedText) {
      return {
        id: 'rec_ocr_' + Date.now(),
        timestamp: Date.now(),
        originalText: data.originalText || '(Extracted from screen graphics)',
        translatedText: data.translatedText,
        detectedLanguage: data.detectedLanguage || 'Detected',
        targetLanguage: targetLang,
        speaker: data.speaker || '',
        gameProfileId: gameProfile.id,
        confidence: data.confidence || 0.95,
        notes: 'Gemini Vision Screen OCR & Contextual Localization',
        engine: 'gemini',
      };
    } else {
      throw new Error('OCR translation returned empty');
    }
  } catch (err) {
    console.error('Vision OCR failed, attempting client fallback:', err);
    throw err;
  }
}
