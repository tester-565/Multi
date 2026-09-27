import React from 'react';
import { SUPPORTED_LANGUAGES, SOURCE_LANGUAGES } from '../../data/languages';
import { OverlayConfig } from '../../types';
import { Settings2, X, Cpu, Eye, Zap, Keyboard, Check, RefreshCw, Download } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetLang: string;
  setTargetLang: (code: string) => void;
  engine: 'gemini' | 'local_heuristic' | 'hybrid';
  setEngine: (engine: 'gemini' | 'local_heuristic' | 'hybrid') => void;
  ocrEngine: 'vision_ai' | 'tesseract';
  setOcrEngine: (ocr: 'vision_ai' | 'tesseract') => void;
  scanIntervalMs: number;
  setScanIntervalMs: (ms: number) => void;
  overlayConfig: OverlayConfig;
  setOverlayConfig: (cfg: OverlayConfig) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  targetLang,
  setTargetLang,
  engine,
  setEngine,
  ocrEngine,
  setOcrEngine,
  scanIntervalMs,
  setScanIntervalMs,
  overlayConfig,
  setOverlayConfig,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <Settings2 className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-bold text-slate-100">Translator & Engine Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Engine Selection */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-200 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-cyan-400" />
              <span>Translation AI Engine</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setEngine('gemini')}
                className={`p-3 rounded-xl border text-left text-xs transition-colors ${
                  engine === 'gemini'
                    ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-200 font-semibold'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-slate-100">Gemini 3.8 Flash AI</span>
                  {engine === 'gemini' && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                </div>
                <p className="text-[11px] text-slate-400">
                  Contextual RPG localization, speaker detection, and glossary substitutions.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setEngine('local_heuristic')}
                className={`p-3 rounded-xl border text-left text-xs transition-colors ${
                  engine === 'local_heuristic'
                    ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-200 font-semibold'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-slate-100">Local Fast Heuristic</span>
                  {engine === 'local_heuristic' && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                </div>
                <p className="text-[11px] text-slate-400">
                  Instant offline phrasebook with exact game glossary replacement.
                </p>
              </button>
            </div>
          </div>

          {/* OCR Engine Selection */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-200 flex items-center gap-2">
              <Eye className="w-4 h-4 text-amber-400" />
              <span>Screen OCR Processing</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setOcrEngine('vision_ai')}
                className={`p-3 rounded-xl border text-left text-xs transition-colors ${
                  ocrEngine === 'vision_ai'
                    ? 'bg-amber-500/10 border-amber-500/50 text-amber-200 font-semibold'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-slate-100">Multimodal Vision OCR</span>
                  {ocrEngine === 'vision_ai' && <Check className="w-3.5 h-3.5 text-amber-400" />}
                </div>
                <p className="text-[11px] text-slate-400">
                  Reads stylized gaming fonts, Japanese kanji/hiragana, and Cyrillic directly from graphics.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setOcrEngine('tesseract')}
                className={`p-3 rounded-xl border text-left text-xs transition-colors ${
                  ocrEngine === 'tesseract'
                    ? 'bg-amber-500/10 border-amber-500/50 text-amber-200 font-semibold'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-slate-100">Client Canvas OCR</span>
                  {ocrEngine === 'tesseract' && <Check className="w-3.5 h-3.5 text-amber-400" />}
                </div>
                <p className="text-[11px] text-slate-400">
                  Local browser canvas processing with high contrast thresholding.
                </p>
              </button>
            </div>
          </div>

          {/* Continuous Scan Frequency */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-200 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-emerald-400" />
                <span>Continuous Scan Rate</span>
              </span>
              <span className="font-mono text-emerald-400">{(scanIntervalMs / 1000).toFixed(1)}s</span>
            </label>
            <div className="grid grid-cols-3 gap-2 text-xs">
              {[
                { label: 'Fast (1.5s)', ms: 1500 },
                { label: 'Balanced (2.5s)', ms: 2500 },
                { label: 'Relaxed (4.0s)', ms: 4000 },
              ].map((opt) => (
                <button
                  key={opt.ms}
                  onClick={() => setScanIntervalMs(opt.ms)}
                  className={`p-2 rounded-lg border text-center transition-colors ${
                    scanIntervalMs === opt.ms
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-semibold'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Project Source Code ZIP Download */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <div className="font-semibold text-slate-200 flex items-center gap-2">
                <Download className="w-4 h-4 text-cyan-400" />
                <span>Project Source Code Archive</span>
              </div>
              <a
                href="/api/download-zip"
                download="aegis-game-translator.zip"
                className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-md shadow-cyan-500/20"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download ZIP</span>
              </a>
            </div>
            <p className="text-[11px] text-slate-400">
              Download the entire source code, gaming assets, server scripts, and OCR configuration as a standalone ZIP.
            </p>
          </div>

          {/* Gamer Hotkeys Guide */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2 text-xs">
            <div className="font-semibold text-slate-200 flex items-center gap-2">
              <Keyboard className="w-4 h-4 text-cyan-400" />
              <span>Gaming Keyboard Shortcuts</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400 pt-1">
              <div>
                <kbd className="bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700 text-slate-200">T</kbd>{' '}
                Translate current ROI box
              </div>
              <div>
                <kbd className="bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700 text-slate-200">
                  Ctrl+V
                </kbd>{' '}
                Paste screenshot
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/60 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs transition-colors"
          >
            Apply & Close
          </button>
        </div>
      </div>
    </div>
  );
};
