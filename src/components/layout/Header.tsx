import React from 'react';
import { SUPPORTED_LANGUAGES } from '../../data/languages';
import { GameProfile, Language } from '../../types';
import { MonitorPlay, Sparkles, Settings2, BookOpen, Volume2, VolumeX, History, Download } from 'lucide-react';
import { ttsService } from '../../utils/ttsService';

interface HeaderProps {
  activeTab: 'screen' | 'backlog' | 'glossary' | 'overlay_settings';
  setActiveTab: (tab: 'screen' | 'backlog' | 'glossary' | 'overlay_settings') => void;
  targetLang: string;
  setTargetLang: (code: string) => void;
  selectedProfile: GameProfile;
  profiles: GameProfile[];
  setSelectedProfileId: (id: string) => void;
  onOpenSettings: () => void;
  isMuted: boolean;
  setIsMuted: (muted: boolean) => void;
  isAutoScanning: boolean;
  toggleAutoScan: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  targetLang,
  setTargetLang,
  selectedProfile,
  profiles,
  setSelectedProfileId,
  onOpenSettings,
  isMuted,
  setIsMuted,
  isAutoScanning,
  toggleAutoScan,
}) => {
  const currentLangObj = SUPPORTED_LANGUAGES.find((l) => l.code === targetLang) || SUPPORTED_LANGUAGES[0];

  const handleToggleMute = () => {
    const muted = ttsService.toggleMute();
    setIsMuted(muted);
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/90 backdrop-blur-md px-4 lg:px-8 py-3 transition-colors">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Zone 1: Wordmark */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-bold font-display text-lg">
            Æ
          </div>
          <span className="font-display font-bold text-lg md:text-xl tracking-wide text-slate-100 uppercase">
            Aegis Game Translator
          </span>
        </div>

        {/* Zone 2: Navigation Links / Views */}
        <nav className="hidden md:flex items-center gap-1 bg-slate-900/80 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => setActiveTab('screen')}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              activeTab === 'screen'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <MonitorPlay className="w-3.5 h-3.5" />
            <span>Game Screen</span>
          </button>

          <button
            onClick={() => setActiveTab('backlog')}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              activeTab === 'backlog'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Dialogue Backlog</span>
          </button>

          <button
            onClick={() => setActiveTab('glossary')}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              activeTab === 'glossary'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Game Glossaries</span>
          </button>

          <button
            onClick={() => setActiveTab('overlay_settings')}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              activeTab === 'overlay_settings'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>HUD Styling</span>
          </button>
        </nav>

        {/* Zone 3: Actions (Target Language, Active Profile, Mute, Settings) */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Active Game Profile Selector */}
          <div className="hidden lg:flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs">
            <span className="text-slate-400">Profile:</span>
            <select
              value={selectedProfile.id}
              onChange={(e) => setSelectedProfileId(e.target.value)}
              className="bg-transparent text-slate-200 font-medium focus:outline-none cursor-pointer"
            >
              {profiles.map((p) => (
                <option key={p.id} value={p.id} className="bg-slate-900 text-slate-100">
                  {p.icon} {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Target Language Dropdown */}
          <div className="flex items-center gap-1.5 bg-slate-900 border border-cyan-500/30 rounded-lg px-2.5 py-1 text-xs text-slate-200">
            <span className="text-sm">{currentLangObj.flag}</span>
            <select
              value={targetLang}
              onChange={(e) => setTargetLang(e.target.value)}
              className="bg-transparent text-slate-200 font-medium focus:outline-none cursor-pointer"
            >
              {SUPPORTED_LANGUAGES.map((lang: Language) => (
                <option key={lang.code} value={lang.code} className="bg-slate-900 text-slate-100">
                  {lang.flag} {lang.name} ({lang.nativeName})
                </option>
              ))}
            </select>
          </div>

          {/* TTS Audio Mute toggle */}
          <button
            onClick={handleToggleMute}
            title={isMuted ? 'TTS Audio Muted' : 'TTS Audio Enabled'}
            className={`p-1.5 rounded-lg border transition-colors ${
              isMuted
                ? 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
            }`}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Quick Scan Toggle */}
          <button
            onClick={toggleAutoScan}
            className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
              isAutoScanning
                ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-md shadow-cyan-500/20 font-semibold'
                : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${isAutoScanning ? 'bg-slate-950 animate-ping' : 'bg-slate-500'}`} />
            <span>{isAutoScanning ? 'Live Scanning...' : 'Start Scan'}</span>
          </button>

          {/* Download Project ZIP */}
          <a
            href="/api/download-zip"
            download="aegis-game-translator.zip"
            title="Download full project copy as ZIP"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-medium transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">ZIP</span>
          </a>

          {/* Settings Modal Button */}
          <button
            onClick={onOpenSettings}
            title="Translator & OCR Settings"
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
          >
            <Settings2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
