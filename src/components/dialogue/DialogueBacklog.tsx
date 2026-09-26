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
} from 'lucide-react';
import { ttsService } from '../../utils/ttsService';

interface DialogueBacklogProps {
  records: TranslationRecord[];
  targetLangObj: Language;
  onToggleBookmark: (id: string) => void;
  onClearHistory: () => void;
  onDeleteRecord: (id: string) => void;
}

export const DialogueBacklog: React.FC<DialogueBacklogProps> = ({
  records,
  targetLangObj,
  onToggleBookmark,
  onClearHistory,
  onDeleteRecord,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSpeaker, setFilterSpeaker] = useState<string>('all');
  const [showBookmarksOnly, setShowBookmarksOnly] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

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
      {/* Header and Filter Toolbar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
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
        <div className="flex items-center gap-2">
          <button
            onClick={exportAsTxt}
            disabled={filteredRecords.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 disabled:opacity-40 transition-colors"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Export TXT</span>
          </button>

          <button
            onClick={exportAsJson}
            disabled={filteredRecords.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 disabled:opacity-40 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>JSON</span>
          </button>

          {records.length > 0 && (
            <button
              onClick={onClearHistory}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 text-xs font-medium border border-rose-800 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Log</span>
            </button>
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
            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            <option value="all">All Speakers ({speakers.length})</option>
            {speakers.map((spk) => (
              <option key={spk} value={spk}>
                {spk}
              </option>
            ))}
          </select>
        </div>

        {/* Bookmarked Filter Toggle */}
        <div className="flex items-center justify-end">
          <button
            onClick={() => setShowBookmarksOnly(!showBookmarksOnly)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
              showBookmarksOnly
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            <Star className={`w-3.5 h-3.5 ${showBookmarksOnly ? 'fill-amber-400 text-amber-400' : ''}`} />
            <span>Bookmarked Lines Only</span>
          </button>
        </div>
      </div>

      {/* Backlog List */}
      <div className="space-y-3">
        {filteredRecords.length === 0 ? (
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-12 text-center">
            <Clock className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-slate-300">No Dialogue Lines Recorded Yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              Start translating in the Game Screen tab to automatically log in-game dialogues, speaker lines, and audio
              replays here.
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
                className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 transition-all hover:border-slate-700/80 space-y-2.5"
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

                  {/* Actions: Speak, Copy, Bookmark, Delete */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleSpeak(rec.translatedText, rec.targetLanguage)}
                      title="Listen with TTS"
                      className="p-1.5 rounded bg-slate-800 text-slate-400 hover:text-cyan-300 hover:bg-slate-700 transition-colors"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleCopy(rec.id, rec.translatedText)}
                      title="Copy translated text"
                      className="p-1.5 rounded bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors"
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
                      className="p-1.5 rounded bg-slate-800 text-slate-400 hover:text-amber-400 hover:bg-slate-700 transition-colors"
                    >
                      <Star className={`w-3.5 h-3.5 ${rec.bookmarked ? 'fill-amber-400 text-amber-400' : ''}`} />
                    </button>

                    <button
                      onClick={() => onDeleteRecord(rec.id)}
                      title="Remove line"
                      className="p-1.5 rounded bg-slate-800 text-slate-500 hover:text-rose-400 hover:bg-slate-700 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Original Captured Game Text */}
                <div className="text-xs text-slate-400 font-mono bg-slate-950/60 p-2 rounded border border-slate-800/80">
                  <span className="text-slate-500 select-none mr-2">ORIGINAL:</span>
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
    </div>
  );
};
