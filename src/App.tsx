import React, { useState, useEffect } from 'react';
import { GameProfile, OverlayConfig, TranslationRecord, Language } from './types';
import { SUPPORTED_LANGUAGES } from './data/languages';
import { INITIAL_GAME_PROFILES } from './data/initialGameProfiles';
import { Header } from './components/layout/Header';
import { GameSimulator } from './components/sandbox/GameSimulator';
import { DialogueBacklog } from './components/dialogue/DialogueBacklog';
import { DictionaryManager } from './components/dictionary/DictionaryManager';
import { OverlaySettingsView } from './components/settings/OverlaySettingsView';
import { SettingsModal } from './components/settings/SettingsModal';
import { ttsService } from './utils/ttsService';

export const App: React.FC = () => {
  // Active Navigation Tab
  const [activeTab, setActiveTab] = useState<'screen' | 'backlog' | 'glossary' | 'overlay_settings'>('screen');

  // Target Language (defaults to Arabic as featured in prompt, or saved)
  const [targetLang, setTargetLang] = useState<string>(() => {
    return localStorage.getItem('aegis_target_lang') || 'ar';
  });

  // Game Profiles
  const [profiles, setProfiles] = useState<GameProfile[]>(() => {
    const saved = localStorage.getItem('aegis_game_profiles');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return INITIAL_GAME_PROFILES;
      }
    }
    return INITIAL_GAME_PROFILES;
  });

  const [selectedProfileId, setSelectedProfileId] = useState<string>(() => {
    return localStorage.getItem('aegis_selected_profile') || 'elden_fantasy';
  });

  // Dialogue Backlog History
  const [dialogueHistory, setDialogueHistory] = useState<TranslationRecord[]>(() => {
    const saved = localStorage.getItem('aegis_dialogue_history');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return [];
      }
    }
    return [];
  });

  // Overlay HUD Configuration
  const [overlayConfig, setOverlayConfig] = useState<OverlayConfig>(() => {
    const saved = localStorage.getItem('aegis_overlay_config');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return {
      theme: 'cyber_cyan',
      styleMode: 'subtitle_bar',
      fontSize: 20,
      bgOpacity: 0.85,
      backdropBlur: true,
      textOutline: true,
      showSpeaker: true,
      showOriginal: true,
      autoSpeak: false,
      ttsRate: 1.0,
      ttsPitch: 1.0,
    };
  });

  // Scanner state
  const [isAutoScanning, setIsAutoScanning] = useState(false);
  const [isMuted, setIsMuted] = useState(ttsService.getMuted());
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Engines
  const [engine, setEngine] = useState<'gemini' | 'local_heuristic' | 'hybrid'>('gemini');
  const [ocrEngine, setOcrEngine] = useState<'vision_ai' | 'tesseract'>('vision_ai');
  const [scanIntervalMs, setScanIntervalMs] = useState(2500);

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem('aegis_target_lang', targetLang);
  }, [targetLang]);

  useEffect(() => {
    localStorage.setItem('aegis_game_profiles', JSON.stringify(profiles));
  }, [profiles]);

  useEffect(() => {
    localStorage.setItem('aegis_selected_profile', selectedProfileId);
  }, [selectedProfileId]);

  useEffect(() => {
    localStorage.setItem('aegis_dialogue_history', JSON.stringify(dialogueHistory.slice(-200)));
  }, [dialogueHistory]);

  useEffect(() => {
    localStorage.setItem('aegis_overlay_config', JSON.stringify(overlayConfig));
  }, [overlayConfig]);

  const selectedProfile =
    profiles.find((p) => p.id === selectedProfileId) || profiles[0] || INITIAL_GAME_PROFILES[0];
  const targetLangObj =
    SUPPORTED_LANGUAGES.find((l) => l.code === targetLang) || SUPPORTED_LANGUAGES[0];

  // Record translation
  const handleNewTranslationRecord = (record: TranslationRecord) => {
    setDialogueHistory((prev) => [record, ...prev]);
  };

  const handleToggleBookmark = (id: string) => {
    setDialogueHistory((prev) =>
      prev.map((rec) => (rec.id === id ? { ...rec, bookmarked: !rec.bookmarked } : rec))
    );
  };

  const handleDeleteRecord = (id: string) => {
    setDialogueHistory((prev) => prev.filter((rec) => rec.id !== id));
  };

  const handleClearHistory = () => {
    if (confirm('Clear all recorded dialogue lines from history?')) {
      setDialogueHistory([]);
    }
  };

  const handleUpdateProfile = (updated: GameProfile) => {
    setProfiles((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  };

  const handleCreateProfile = (newProfile: GameProfile) => {
    setProfiles((prev) => [...prev, newProfile]);
    setSelectedProfileId(newProfile.id);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500/20 selection:text-cyan-300">
      {/* Top Bar Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        targetLang={targetLang}
        setTargetLang={setTargetLang}
        selectedProfile={selectedProfile}
        profiles={profiles}
        setSelectedProfileId={setSelectedProfileId}
        onOpenSettings={() => setIsSettingsOpen(true)}
        isMuted={isMuted}
        setIsMuted={setIsMuted}
        isAutoScanning={isAutoScanning}
        toggleAutoScan={() => setIsAutoScanning(!isAutoScanning)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {activeTab === 'screen' && (
          <GameSimulator
            selectedProfile={selectedProfile}
            targetLang={targetLang}
            targetLangObj={targetLangObj}
            overlayConfig={overlayConfig}
            onNewTranslationRecord={handleNewTranslationRecord}
            dialogueHistory={dialogueHistory}
            isAutoScanning={isAutoScanning}
            setIsAutoScanning={setIsAutoScanning}
          />
        )}

        {activeTab === 'backlog' && (
          <DialogueBacklog
            records={dialogueHistory}
            targetLangObj={targetLangObj}
            onToggleBookmark={handleToggleBookmark}
            onClearHistory={handleClearHistory}
            onDeleteRecord={handleDeleteRecord}
          />
        )}

        {activeTab === 'glossary' && (
          <DictionaryManager
            profiles={profiles}
            selectedProfile={selectedProfile}
            onSelectProfile={setSelectedProfileId}
            onUpdateProfile={handleUpdateProfile}
            onCreateProfile={handleCreateProfile}
            targetLang={targetLang}
            targetLangObj={targetLangObj}
          />
        )}

        {activeTab === 'overlay_settings' && (
          <OverlaySettingsView
            config={overlayConfig}
            onChangeConfig={setOverlayConfig}
            targetLang={targetLang}
            targetLangObj={targetLangObj}
          />
        )}
      </main>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        targetLang={targetLang}
        setTargetLang={setTargetLang}
        engine={engine}
        setEngine={setEngine}
        ocrEngine={ocrEngine}
        setOcrEngine={setOcrEngine}
        scanIntervalMs={scanIntervalMs}
        setScanIntervalMs={setScanIntervalMs}
        overlayConfig={overlayConfig}
        setOverlayConfig={setOverlayConfig}
      />
    </div>
  );
};

export default App;
