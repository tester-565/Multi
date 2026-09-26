import React, { useState } from 'react';
import { OverlayConfig, TranslationRecord, Language } from '../../types';
import { Volume2, Copy, Check, Star, Eye, EyeOff, Maximize2, Move, Sparkles } from 'lucide-react';
import { ttsService } from '../../utils/ttsService';

interface GameOverlayProps {
  currentRecord: TranslationRecord | null;
  config: OverlayConfig;
  targetLangObj: Language;
  onBookmark?: (recordId: string) => void;
  onPopOutPiP?: () => void;
  isPiPActive?: boolean;
}

export const GameOverlay: React.FC<GameOverlayProps> = ({
  currentRecord,
  config,
  targetLangObj,
  onBookmark,
  onPopOutPiP,
  isPiPActive,
}) => {
  const [copied, setCopied] = useState(false);
  const [showOriginalOverride, setShowOriginalOverride] = useState(false);

  if (!currentRecord) {
    return (
      <div className="pointer-events-none select-none absolute bottom-6 inset-x-8 flex justify-center z-30">
        <div className="bg-slate-950/70 backdrop-blur-md border border-slate-800 text-slate-400 text-xs px-4 py-2 rounded-lg text-center shadow-lg">
          <span className="font-mono text-cyan-400">HUD Standby:</span> Select an ROI area or click "Translate Frame"
        </div>
      </div>
    );
  }

  const isRtl = targetLangObj.rtl;
  const showOriginal = showOriginalOverride || config.showOriginal;

  const handleSpeak = () => {
    if (!currentRecord.translatedText) return;
    ttsService.speak({
      text: currentRecord.translatedText,
      langCode: currentRecord.targetLanguage,
      rate: config.ttsRate,
      pitch: config.ttsPitch,
      voiceName: config.ttsVoiceName,
    });
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(currentRecord.translatedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Theme style classes
  const getThemeClasses = () => {
    switch (config.theme) {
      case 'cyber_cyan':
        return {
          container: 'bg-slate-950/85 border border-cyan-500/50 shadow-lg shadow-cyan-950/50',
          speaker: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
          text: 'text-cyan-50',
          original: 'text-cyan-300/60',
          notes: 'text-cyan-400/80',
        };
      case 'fantasy_gold':
        return {
          container: 'bg-stone-950/85 border border-amber-500/50 shadow-lg shadow-amber-950/40',
          speaker: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
          text: 'text-amber-50',
          original: 'text-amber-300/60',
          notes: 'text-amber-400/80',
        };
      case 'glass_blur':
        return {
          container: 'bg-slate-900/60 backdrop-blur-xl border border-white/20 shadow-2xl',
          speaker: 'bg-white/10 text-slate-100 border-white/20',
          text: 'text-white',
          original: 'text-slate-300/70',
          notes: 'text-slate-300/80',
        };
      case 'clean_high_contrast':
        return {
          container: 'bg-black/95 border border-white/30 shadow-2xl',
          speaker: 'bg-zinc-800 text-yellow-300 border-zinc-700',
          text: 'text-white font-bold',
          original: 'text-zinc-400',
          notes: 'text-yellow-400/90',
        };
      case 'stealth_dark':
      default:
        return {
          container: 'bg-slate-950/90 border border-slate-800 shadow-xl',
          speaker: 'bg-slate-800 text-slate-200 border-slate-700',
          text: 'text-slate-100',
          original: 'text-slate-400',
          notes: 'text-slate-400',
        };
    }
  };

  const themeStyles = getThemeClasses();

  return (
    <div
      className={`absolute bottom-4 inset-x-4 md:inset-x-12 z-30 transition-all duration-200 pointer-events-auto select-text`}
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <div
        className={`rounded-xl p-4 md:p-5 ${themeStyles.container} ${
          config.backdropBlur ? 'backdrop-blur-md' : ''
        }`}
        style={{
          backgroundColor: `rgba(15, 23, 42, ${config.bgOpacity})`,
        }}
      >
        {/* Header row: Speaker, Detected Language, Engine, Actions */}
        <div className="flex items-center justify-between gap-3 mb-2.5 pb-2 border-b border-slate-800/60">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Speaker Tag */}
            {config.showSpeaker && currentRecord.speaker && (
              <div
                className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-semibold uppercase tracking-wider border ${themeStyles.speaker}`}
              >
                <span>{currentRecord.speaker}</span>
              </div>
            )}

            {/* Language Transition Indicator */}
            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
              <span className="text-slate-400">{currentRecord.detectedLanguage}</span>
              <span>→</span>
              <span className="text-cyan-400 font-semibold">{targetLangObj.name}</span>
            </div>

            {/* Confidence / Engine badge */}
            <span className="hidden sm:inline text-xs text-slate-500 font-mono">
              ({currentRecord.engine === 'gemini' ? 'Gemini 3.8 Flash' : 'Lexicon'} ·{' '}
              {Math.round(currentRecord.confidence * 100)}% match)
            </span>
          </div>

          {/* Quick HUD Actions */}
          <div className="flex items-center gap-1" dir="ltr">
            {/* TTS Listen */}
            <button
              onClick={handleSpeak}
              title="Speak translated dialogue (TTS)"
              className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            >
              <Volume2 className="w-3.5 h-3.5" />
            </button>

            {/* Copy button */}
            <button
              onClick={handleCopy}
              title="Copy translation"
              className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>

            {/* Bookmark */}
            {onBookmark && (
              <button
                onClick={() => onBookmark(currentRecord.id)}
                title="Save line to backlog bookmarks"
                className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-amber-400 transition-colors"
              >
                <Star className={`w-3.5 h-3.5 ${currentRecord.bookmarked ? 'fill-amber-400 text-amber-400' : ''}`} />
              </button>
            )}

            {/* Show / Hide Original */}
            <button
              onClick={() => setShowOriginalOverride(!showOriginal)}
              title={showOriginal ? 'Hide original text' : 'Show original text'}
              className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            >
              {showOriginal ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>

            {/* PiP Button */}
            {onPopOutPiP && (
              <button
                onClick={onPopOutPiP}
                title="Pop out to Floating Picture-in-Picture window"
                className={`p-1.5 rounded-lg border transition-colors ${
                  isPiPActive
                    ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300'
                    : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:text-white'
                }`}
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Original Game Text (if enabled) */}
        {showOriginal && (
          <div className={`mb-2 text-xs font-mono tracking-wide ${themeStyles.original}`} dir="auto">
            {currentRecord.originalText}
          </div>
        )}

        {/* Primary Translated Game Text */}
        <div
          className={`leading-relaxed tracking-wide font-medium ${themeStyles.text} ${
            isRtl ? 'font-arabic text-right' : ''
          } ${config.textOutline ? 'text-shadow-game-dark' : ''}`}
          style={{ fontSize: `${config.fontSize}px` }}
        >
          {currentRecord.translatedText}
        </div>

        {/* Nuance / Glossary note if available */}
        {currentRecord.notes && (
          <div className={`mt-2 text-xs flex items-center gap-1.5 font-mono ${themeStyles.notes}`} dir="ltr">
            <Sparkles className="w-3 h-3 text-cyan-400 shrink-0" />
            <span className="truncate">{currentRecord.notes}</span>
          </div>
        )}
      </div>
    </div>
  );
};
