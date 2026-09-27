import React, { useState } from 'react';
import { TranslationRecord, Language } from '../../types';
import {
  Volume2,
  Copy,
  Star,
  Download,
  Trash2,
  Search,
  Filter,
  Check,
  Sparkles,
  FileText,
  Clock,
  User,
  PlusCircle,
  X,
  BookOpen,
} from 'lucide-react';
import { ttsService } from '../../utils/ttsService';

interface DialogueBacklogProps {
  records: TranslationRecord[];
  targetLangObj: Language;
  onToggleBookmark: (id: string) => void;
  onClearHistory: () => void;
  onDeleteRecord: (id: string) => void;
  onAddGlossaryTerm?: (source: string, target: string) => void;
}

export const DialogueBacklog: React.FC<DialogueBacklogProps> = ({
  records,
  targetLangObj,
  onToggleBookmark,
  onClearHistory,
  onDeleteRecord,
  onAddGlossaryTerm,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSpeaker, setFilterSpeaker] = useState<string>('all');
  const [showBookmarksOnly, setShowBookmarksOnly] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  // Quick Add Glossary Modal from Backlog
  const [glossaryModalRecord, setGlossaryModalRecord] = useState<TranslationRecord | null>(null);
  const [selectedSourceTerm, setSelectedSourceTerm] = useState('');
  const [selectedTargetTerm, setSelectedTargetTerm] = useState('');
  const [termSavedNotice, setTermSavedNotice] = useState<string | null>(null);

  // Extract unique speakers for filter
  const speakers = Array.from(new Set(records.map((r) => r.speaker).filter(Boolean))) as string[];

  // Filtered records
  const filteredRecords = records.filter((rec) => {
    if (showBookmarksOnly && !rec.bookmarked) return false;
    if (filterSpeaker !== 'all' && rec.speaker !== filterSpeaker) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchOrig = rec.originalText.toLowerCase().includes(q);
      const matchTrans = rec.translatedText.toLowerCase().includes(q);
      const matchSpeaker = (rec.speaker || '').toLowerCase().includes(q);
      if (!matchOrig && !matchTrans && !matchSpeaker) return false;
    }
    return true;
  });

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSpeak = (text: string, langCode: string) => {
    ttsService.speak({ text, langCode });
  };

  const handleOpenGlossaryModal = (rec: TranslationRecord) => {
    setGlossaryModalRecord(rec);
    setSelectedSourceTerm(rec.originalText.slice(0, 40));
    setSelectedTargetTerm(rec.translatedText.slice(0, 40));
  };

  const handleSaveToGlossary = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSourceTerm.trim() || !selectedTargetTerm.trim()) return;
    if (onAddGlossaryTerm) {
      onAddGlossaryTerm(selectedSourceTerm.trim(), selectedTargetTerm.trim());
      setTermSavedNotice(`Saved "${selectedSourceTerm}" to game glossary!`);
      setTimeout(() => setTermSavedNotice(null), 3000);
    }
    setGlossaryModalRecord(null);
  };

  // Export functions
  const exportAsTxt = () => {
    const lines = filteredRecords.map((r) => {
      const date = new Date(r.timestamp).toLocaleTimeString();
      const spk = r.speaker ? `[${r.speaker}] ` : '';
      return `[${date}] ${spk}\nOriginal (${r.detectedLanguage}): ${r.originalText}\nTranslated (${targetLangObj.name}): ${r.translatedText}\n${'-'.repeat(40)}`;
    });
    const blob = new Blob([lines.join('\n\n')], { type: 'text/plain;charset=utf-8' });
    downloadBlob(blob, `game_dialogue_log_${Date.now()}.txt`);
  };

  const exportAsJson = () => {
    const blob = new Blob([JSON.stringify(filteredRecords, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    downloadBlob(blob, `game_dialogue_log_${Date.now()}.json`);
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Toast Notice */}
      {termSavedNotice && (
        <div className="bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 px-4 py-2 rounded-lg text-xs flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>{termSavedNotice}</span>
          </div>
          <button onClick={() => setTermSavedNotice(null)} className="text-emerald-400 hover:text-white cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header and Filter Toolbar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-lg">
        <div>
          <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            <span>🎮 RPG Dialogue Backlog & History</span>
            <span className="text-xs font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800">
              {records.length} Lines Captured
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Preserves past conversational context, speaker dialogue history, and audio playback.
          </p>
        </div>

        {/* Export & Clear Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={exportAsTxt}
            disabled={filteredRecords.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 disabled:opacity-40 transition-colors cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Export TXT</span>
          </button>

          <button
            onClick={exportAsJson}
            disabled={filteredRecords.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 disabled:opacity-40 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>JSON</span>
          </button>

          {records.length > 0 && !confirmClear && (
            <button
              onClick={() => setConfirmClear(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 text-xs font-medium border border-rose-800 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Log</span>
            </button>
          )}

          {confirmClear && (
            <div className="flex items-center gap-1.5 bg-rose-950/70 border border-rose-700 px-2.5 py-1 rounded-lg text-xs">
              <span className="text-rose-200 font-medium">Clear all?</span>
              <button
                onClick={() => {
                  onClearHistory();
                  setConfirmClear(false);
                }}
                className="bg-rose-600 hover:bg-rose-500 text-white font-bold px-2 py-0.5 rounded cursor-pointer transition-colors"
              >
                Yes
              </button>
              <button
                onClick={() => setConfirmClear(false)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-0.5 rounded cursor-pointer transition-colors"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Search Input */}
        <div className="relative sm:col-span-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search dialogue, speaker, or translation..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        {/* Speaker Filter */}
        <div className="flex items-center gap-2">
          <select
            value={filterSpeaker}
            onChange={(e) => setFilterSpeaker(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 cursor-pointer"
          >
            <option value="all">All Speakers ({records.length})</option>
            {speakers.map((spk) => (
              <option key={spk} value={spk}>
                {spk}
              </option>
            ))}
          </select>
        </div>

        {/* Bookmarks Toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowBookmarksOnly(!showBookmarksOnly)}
            className={`w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
              showBookmarksOnly
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            <Star className={`w-3.5 h-3.5 ${showBookmarksOnly ? 'fill-amber-400 text-amber-400' : ''}`} />
            <span>Bookmarked Lines Only</span>
          </button>
        </div>
      </div>

      {/* Dialogue List */}
      <div className="space-y-3">
        {filteredRecords.length === 0 ? (
          <div className="text-center py-16 bg-slate-900/50 border border-slate-800 rounded-xl space-y-2">
            <Clock className="w-10 h-10 text-slate-600 mx-auto" />
            <div className="text-slate-400 text-sm font-medium">No recorded dialogue lines yet</div>
            <p className="text-slate-500 text-xs max-w-sm mx-auto">
              As in-game dialogue is scanned and translated, each line will be stored here in chronological order.
            </p>
          </div>
        ) : (
          filteredRecords.map((rec) => {
            const isRtl = targetLangObj.rtl;
            const timeStr = new Date(rec.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            });

            return (
              <div
                key={rec.id}
                className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 transition-all hover:border-slate-700/80 space-y-2.5 shadow-md"
              >
                {/* Meta Row: Speaker, Time, Engine, Lang */}
                <div className="flex items-center justify-between gap-3 text-xs border-b border-slate-800/80 pb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {rec.speaker && (
                      <span className="font-semibold text-amber-400 bg-amber-950/40 border border-amber-800/60 px-2 py-0.5 rounded flex items-center gap-1">
                        <User className="w-3 h-3 text-amber-400" />
                        <span>{rec.speaker}</span>
                      </span>
                    )}

                    <span className="text-slate-500 font-mono flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {timeStr}
                    </span>

                    <span className="text-slate-400 font-mono text-[11px]">
                      {rec.detectedLanguage} → {targetLangObj.name}
                    </span>
                  </div>

                  {/* Actions: Speak, Copy, Bookmark, Add to Glossary, Delete */}
                  <div className="flex items-center gap-1">
                    {/* Add to Glossary */}
                    {onAddGlossaryTerm && (
                      <button
                        onClick={() => handleOpenGlossaryModal(rec)}
                        title="Add term from this line to game glossary"
                        className="p-1.5 rounded bg-slate-800 text-slate-400 hover:text-cyan-300 hover:bg-slate-700 transition-colors cursor-pointer"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <button
                      onClick={() => handleSpeak(rec.translatedText, rec.targetLanguage)}
                      title="Listen with TTS"
                      className="p-1.5 rounded bg-slate-800 text-slate-400 hover:text-cyan-300 hover:bg-slate-700 transition-colors cursor-pointer"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleCopy(rec.id, rec.translatedText)}
                      title="Copy translated text"
                      className="p-1.5 rounded bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors cursor-pointer"
                    >
                      {copiedId === rec.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>

                    <button
                      onClick={() => onToggleBookmark(rec.id)}
                      title="Bookmark dialogue line"
                      className="p-1.5 rounded bg-slate-800 text-slate-400 hover:text-amber-400 hover:bg-slate-700 transition-colors cursor-pointer"
                    >
                      <Star className={`w-3.5 h-3.5 ${rec.bookmarked ? 'fill-amber-400 text-amber-400' : ''}`} />
                    </button>

                    <button
                      onClick={() => onDeleteRecord(rec.id)}
                      title="Remove line"
                      className="p-1.5 rounded bg-slate-800 text-slate-500 hover:text-rose-400 hover:bg-slate-700 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Original Captured Game Text */}
                <div className="text-xs text-slate-400 font-mono bg-slate-950/60 p-2.5 rounded border border-slate-800/80">
                  <span className="text-slate-500 select-none mr-2 font-bold">ORIGINAL:</span>
                  <span>{rec.originalText}</span>
                </div>

                {/* Translated Output */}
                <div
                  className={`text-slate-100 text-sm font-medium leading-relaxed ${isRtl ? 'font-arabic text-right' : ''}`}
                  dir={isRtl ? 'rtl' : 'ltr'}
                >
                  {rec.translatedText}
                </div>

                {/* Cultural / Gaming Note */}
                {rec.notes && (
                  <div className="text-[11px] text-cyan-400/80 font-mono flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-cyan-400 shrink-0" />
                    <span>{rec.notes}</span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Quick Add Glossary Modal from Backlog */}
      {glossaryModalRecord && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-cyan-400" />
                <span>Save Term to Game Glossary</span>
              </h3>
              <button
                onClick={() => setGlossaryModalRecord(null)}
                className="text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveToGlossary} className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Source Word / Game Term:</label>
                <input
                  type="text"
                  value={selectedSourceTerm}
                  onChange={(e) => setSelectedSourceTerm(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">
                  Target Translation ({targetLangObj.name}):
                </label>
                <input
                  type="text"
                  value={selectedTargetTerm}
                  onChange={(e) => setSelectedTargetTerm(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                  dir={targetLangObj.rtl ? 'rtl' : 'ltr'}
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setGlossaryModalRecord(null)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs hover:bg-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs cursor-pointer shadow-md shadow-cyan-500/20"
                >
                  Save to Glossary
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
