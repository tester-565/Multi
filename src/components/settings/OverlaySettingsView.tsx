import React from 'react';
import { OverlayConfig, OverlayTheme, OverlayStyleMode, Language } from '../../types';
import { ttsService } from '../../utils/ttsService';
import {
  Sparkles,
  Type,
  Eye,
  Volume2,
  Sliders,
  Shield,
  Palette,
  Check,
  Zap,
} from 'lucide-react';

interface OverlaySettingsViewProps {
  config: OverlayConfig;
  onChangeConfig: (newConfig: OverlayConfig) => void;
  targetLang: string;
  targetLangObj: Language;
}

export const OverlaySettingsView: React.FC<OverlaySettingsViewProps> = ({
  config,
  onChangeConfig,
  targetLang,
  targetLangObj,
}) => {
  const themes: { id: OverlayTheme; name: string; color: string }[] = [
    { id: 'cyber_cyan', name: 'Cyberpunk Neon Cyan', color: 'bg-cyan-500' },
    { id: 'fantasy_gold', name: 'Epic Fantasy Gold', color: 'bg-amber-500' },
    { id: 'stealth_dark', name: 'Stealth Obsidian Dark', color: 'bg-slate-700' },
    { id: 'glass_blur', name: 'Frosted Glassmorphism', color: 'bg-indigo-400' },
    { id: 'clean_high_contrast', name: 'High-Contrast OLED', color: 'bg-white' },
  ];

  const styleModes: { id: OverlayStyleMode; name: string; desc: string }[] = [
    { id: 'subtitle_bar', name: 'Subtitle Bar', desc: 'Bottom letterbox layout for cinema and cutscenes' },
    { id: 'floating_box', name: 'Floating HUD Box', desc: 'Compact movable card positioned over dialogue boxes' },
    { id: 'comic_bubble', name: 'RPG Speech Bubble', desc: 'Stylized bubble with character title' },
    { id: 'full_hud', name: 'Full Gaming Banner', desc: 'Wide semi-transparent HUD bar across viewport' },
  ];

  const handleTestTTS = () => {
    const sampleText = targetLangObj.rtl
      ? 'اعثر على المعبد القديم قبل غروب الشمس.'
      : targetLang === 'ru'
      ? 'Найдите древний храм до заката.'
      : targetLang === 'ja'
      ? '日没前に古代の寺院を見つけてください。'
      : targetLang === 'de'
      ? 'Finde den alten Tempel vor Sonnenuntergang.'
      : 'Find the ancient temple before sunset.';

    ttsService.speak({
      text: sampleText,
      langCode: targetLang,
      rate: config.ttsRate,
      pitch: config.ttsPitch,
      voiceName: config.ttsVoiceName,
    });
  };

  const availableVoices = ttsService.getVoicesForLanguage(targetLang);

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            <Palette className="w-5 h-5 text-cyan-400" />
            <span>In-Game HUD & Subtitle Customizer</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Fine-tune subtitle size, text outline contrast, background opacity, and text-to-speech voice playback.
          </p>
        </div>
      </div>

      {/* Live HUD Overlay Preview */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 relative overflow-hidden flex flex-col items-center justify-center min-h-[220px]">
        {/* Mock background pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-40 pointer-events-none" />

        <div className="text-[11px] font-mono text-slate-500 absolute top-3 left-4">
          LIVE PREVIEW (Target: {targetLangObj.name})
        </div>

        {/* The Preview Box */}
        <div
          className={`w-full max-w-xl rounded-xl p-4 transition-all duration-200 ${
            config.theme === 'cyber_cyan'
              ? 'border border-cyan-500/50 shadow-lg shadow-cyan-950/40 text-cyan-50'
              : config.theme === 'fantasy_gold'
              ? 'border border-amber-500/50 shadow-lg shadow-amber-950/40 text-amber-50'
              : config.theme === 'glass_blur'
              ? 'border border-white/20 shadow-2xl backdrop-blur-md text-white'
              : config.theme === 'clean_high_contrast'
              ? 'border border-white/30 text-white font-bold'
              : 'border border-slate-700 shadow-xl text-slate-100'
          }`}
          style={{
            backgroundColor: `rgba(15, 23, 42, ${config.bgOpacity})`,
          }}
          dir={targetLangObj.rtl ? 'rtl' : 'ltr'}
        >
          {/* Speaker Tag */}
          {config.showSpeaker && (
            <div className="mb-1.5 flex items-center gap-2">
              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                  config.theme === 'fantasy_gold'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                }`}
              >
                アルウェン (Arwen)
              </span>
              <span className="text-[10px] text-slate-400 font-mono">Japanese → {targetLangObj.name}</span>
            </div>
          )}

          {/* Original line */}
          {config.showOriginal && (
            <div className="text-xs text-slate-400 font-mono mb-1">
              日没前に古代の寺院を見つけてください。
            </div>
          )}

          {/* Translated text */}
          <div
            className={`leading-relaxed ${targetLangObj.rtl ? 'font-arabic text-right' : ''} ${
              config.textOutline ? 'text-shadow-game-dark' : ''
            }`}
            style={{ fontSize: `${config.fontSize}px` }}
          >
            {targetLangObj.rtl
              ? 'اعثر على المعبد القديم قبل غروب الشمس.'
              : targetLang === 'ru'
              ? 'Найдите древний храм до заката.'
              : targetLang === 'ja'
              ? '日没前に古代の寺院を見つけてください。'
              : targetLang === 'de'
              ? 'Finde den alten Tempel vor Sonnenuntergang.'
              : targetLang === 'zh'
              ? '在日落之前找到古老的神庙。'
              : 'Find the ancient temple before sunset.'}
          </div>
        </div>
      </div>

      {/* Customization Controls Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Section 1: Themes & Styles */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
            <Palette className="w-4 h-4 text-cyan-400" />
            <span>Visual Theme</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {themes.map((t) => (
              <button
                key={t.id}
                onClick={() => onChangeConfig({ ...config, theme: t.id })}
                className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-xs text-left transition-all ${
                  config.theme === t.id
                    ? 'bg-slate-800 border-cyan-500 text-slate-100 font-semibold shadow-sm'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <span className={`w-3 h-3 rounded-full ${t.color}`} />
                <span>{t.name}</span>
              </button>
            ))}
          </div>

          <div className="pt-2 border-t border-slate-800">
            <div className="text-xs font-semibold text-slate-300 mb-2">Display Mode</div>
            <div className="grid grid-cols-2 gap-2">
              {styleModes.map((sm) => (
                <button
                  key={sm.id}
                  onClick={() => onChangeConfig({ ...config, styleMode: sm.id })}
                  className={`p-2.5 rounded-lg border text-left text-xs transition-colors ${
                    config.styleMode === sm.id
                      ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-300 font-semibold'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="font-medium text-slate-200">{sm.name}</div>
                  <div className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">{sm.desc}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Section 2: Typography & Legibility */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
            <Type className="w-4 h-4 text-cyan-400" />
            <span>Typography & Legibility</span>
          </div>

          {/* Font size slider */}
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>Font Size:</span>
              <span className="font-mono text-cyan-400 font-semibold">{config.fontSize}px</span>
            </div>
            <input
              type="range"
              min="14"
              max="34"
              step="1"
              value={config.fontSize}
              onChange={(e) => onChangeConfig({ ...config, fontSize: Number(e.target.value) })}
              className="w-full accent-cyan-400 cursor-pointer"
            />
          </div>

          {/* Background Opacity slider */}
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>Background Opacity:</span>
              <span className="font-mono text-cyan-400 font-semibold">
                {Math.round(config.bgOpacity * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0.2"
              max="1.0"
              step="0.05"
              value={config.bgOpacity}
              onChange={(e) => onChangeConfig({ ...config, bgOpacity: Number(e.target.value) })}
              className="w-full accent-cyan-400 cursor-pointer"
            />
          </div>

          {/* Toggles */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer">
              <span>Text Contrast Outline (Shadow for 3D game scenes)</span>
              <input
                type="checkbox"
                checked={config.textOutline}
                onChange={(e) => onChangeConfig({ ...config, textOutline: e.target.checked })}
                className="accent-cyan-500 w-4 h-4 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer">
              <span>Frosted Backdrop Blur Effect</span>
              <input
                type="checkbox"
                checked={config.backdropBlur}
                onChange={(e) => onChangeConfig({ ...config, backdropBlur: e.target.checked })}
                className="accent-cyan-500 w-4 h-4 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer">
              <span>Show Original Game Text (Dual Subtitles)</span>
              <input
                type="checkbox"
                checked={config.showOriginal}
                onChange={(e) => onChangeConfig({ ...config, showOriginal: e.target.checked })}
                className="accent-cyan-500 w-4 h-4 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer">
              <span>Show Speaker / Character Tag</span>
              <input
                type="checkbox"
                checked={config.showSpeaker}
                onChange={(e) => onChangeConfig({ ...config, showSpeaker: e.target.checked })}
                className="accent-cyan-500 w-4 h-4 cursor-pointer"
              />
            </label>
          </div>
        </div>

        {/* Section 3: Text-To-Speech (TTS) Voice Dubbing */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-4 md:col-span-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
              <Volume2 className="w-4 h-4 text-emerald-400" />
              <span>Voice Dubbing & Text-To-Speech (TTS)</span>
            </div>

            <button
              onClick={handleTestTTS}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-semibold transition-colors"
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>Test TTS Voice</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-slate-400 block mb-1">
                Auto-Speak (Dub new dialogue lines automatically):
              </label>
              <label className="flex items-center gap-2 text-xs text-slate-200 cursor-pointer mt-2">
                <input
                  type="checkbox"
                  checked={config.autoSpeak}
                  onChange={(e) => onChangeConfig({ ...config, autoSpeak: e.target.checked })}
                  className="accent-emerald-500 w-4 h-4 cursor-pointer"
                />
                <span>Auto-read translated text aloud</span>
              </label>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>Speech Speed:</span>
                <span className="font-mono text-emerald-400">{config.ttsRate}x</span>
              </div>
              <input
                type="range"
                min="0.7"
                max="1.4"
                step="0.1"
                value={config.ttsRate}
                onChange={(e) => onChangeConfig({ ...config, ttsRate: Number(e.target.value) })}
                className="w-full accent-emerald-400 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>Voice Pitch:</span>
                <span className="font-mono text-emerald-400">{config.ttsPitch}</span>
              </div>
              <input
                type="range"
                min="0.8"
                max="1.3"
                step="0.05"
                value={config.ttsPitch}
                onChange={(e) => onChangeConfig({ ...config, ttsPitch: Number(e.target.value) })}
                className="w-full accent-emerald-400 cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
