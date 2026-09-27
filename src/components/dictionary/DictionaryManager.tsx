import React, { useState } from 'react';
import { GameProfile, GlossaryEntry, TermCategory, GenreType, Language } from '../../types';
import {
  BookOpen,
  Plus,
  Trash2,
  Sparkles,
  Download,
  Upload,
  User,
  MapPin,
  Tag,
  Check,
  Search,
  Play,
  Shield,
  Layers,
  Wand2,
  X,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { localTranslate } from '../../utils/translatorEngine';

interface DictionaryManagerProps {
  profiles: GameProfile[];
  selectedProfile: GameProfile;
  onSelectProfile: (id: string) => void;
  onUpdateProfile: (updated: GameProfile) => void;
  onCreateProfile: (profile: GameProfile) => void;
  targetLang: string;
  targetLangObj: Language;
}

export const DictionaryManager: React.FC<DictionaryManagerProps> = ({
  profiles,
  selectedProfile,
  onSelectProfile,
  onUpdateProfile,
  onCreateProfile,
  targetLang,
  targetLangObj,
}) => {
  // New Term Form state
  const [isAddingTerm, setIsAddingTerm] = useState(false);
  const [sourceTerm, setSourceTerm] = useState('');
  const [targetTerm, setTargetTerm] = useState('');
  const [termCategory, setTermCategory] = useState<TermCategory>('term');
  const [termNote, setTermNote] = useState('');

  // Character Name addition
  const [newCharName, setNewCharName] = useState('');
  // Location Name addition
  const [newLocName, setNewLocName] = useState('');

  // Live Test Sandbox
  const [testInput, setTestInput] = useState('Find the ancient temple before sunset and complete the quest.');
  const [testResult, setTestResult] = useState('');

  // Search filter
  const [glossarySearch, setGlossarySearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Create Profile Modal State
  const [isNewProfileModalOpen, setIsNewProfileModalOpen] = useState(false);
  const [newProfName, setNewProfName] = useState('');
  const [newProfGenre, setNewProfGenre] = useState<GenreType>('rpg');
  const [newProfIcon, setNewProfIcon] = useState('⚔️');
  const [newProfTone, setNewProfTone] = useState<'fantasy' | 'colloquial' | 'sci-fi' | 'concise' | 'dramatic'>('fantasy');

  // AI Glossary Generator Modal State
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiGameName, setAiGameName] = useState('');
  const [aiGenre, setAiGenre] = useState<GenreType>('rpg');
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiGenError, setAiGenError] = useState<string | null>(null);
  const [generatedData, setGeneratedData] = useState<{
    suggestedTone: string;
    glossary: Array<{ source: string; target: string; category: string; note: string }>;
    characters: string[];
    locations: string[];
  } | null>(null);

  // Add new glossary entry
  const handleAddTerm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceTerm.trim() || !targetTerm.trim()) return;

    const newEntry: GlossaryEntry = {
      id: 'g_' + Date.now(),
      source: sourceTerm.trim(),
      target: targetTerm.trim(),
      category: termCategory,
      note: termNote.trim() || undefined,
    };

    const updatedProfile = {
      ...selectedProfile,
      glossary: [newEntry, ...selectedProfile.glossary],
    };

    onUpdateProfile(updatedProfile);
    setSourceTerm('');
    setTargetTerm('');
    setTermNote('');
    setIsAddingTerm(false);
  };

  // Delete term
  const handleDeleteTerm = (id: string) => {
    const updated = {
      ...selectedProfile,
      glossary: selectedProfile.glossary.filter((g) => g.id !== id),
    };
    onUpdateProfile(updated);
  };

  // Add Character Name
  const handleAddCharacter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCharName.trim()) return;
    if (selectedProfile.characterNames.includes(newCharName.trim())) return;

    const updated = {
      ...selectedProfile,
      characterNames: [...selectedProfile.characterNames, newCharName.trim()],
    };
    onUpdateProfile(updated);
    setNewCharName('');
  };

  const handleRemoveCharacter = (name: string) => {
    const updated = {
      ...selectedProfile,
      characterNames: selectedProfile.characterNames.filter((n) => n !== name),
    };
    onUpdateProfile(updated);
  };

  // Add Location Name
  const handleAddLocation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLocName.trim()) return;
    if (selectedProfile.preservedLocations.includes(newLocName.trim())) return;

    const updated = {
      ...selectedProfile,
      preservedLocations: [...selectedProfile.preservedLocations, newLocName.trim()],
    };
    onUpdateProfile(updated);
    setNewLocName('');
  };

  const handleRemoveLocation = (loc: string) => {
    const updated = {
      ...selectedProfile,
      preservedLocations: selectedProfile.preservedLocations.filter((l) => l !== loc),
    };
    onUpdateProfile(updated);
  };

  // Create Profile Submission
  const handleCreateProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProfName.trim()) return;

    const newProfile: GameProfile = {
      id: 'prof_' + Date.now(),
      name: newProfName.trim(),
      genre: newProfGenre,
      icon: newProfIcon,
      defaultSourceLang: 'auto',
      characterNames: [],
      preservedLocations: [],
      glossary: [],
      tone: newProfTone,
    };

    onCreateProfile(newProfile);
    setIsNewProfileModalOpen(false);
    setNewProfName('');
  };

  // AI Glossary Generation Call
  const handleGenerateAiGlossary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiGameName.trim()) return;

    setIsGenerating(true);
    setAiGenError(null);
    setGeneratedData(null);

    try {
      const response = await fetch('/api/generate-glossary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameName: aiGameName.trim(),
          genre: aiGenre,
          targetLang,
          targetLangName: targetLangObj.name,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        setGeneratedData({
          suggestedTone: data.suggestedTone || 'fantasy',
          glossary: data.glossary || [],
          characters: data.characters || [],
          locations: data.locations || [],
        });
      } else {
        throw new Error(data.error || 'Failed to generate glossary');
      }
    } catch (err: unknown) {
      const error = err as Error;
      setAiGenError(error?.message || 'Error communicating with Gemini AI');
    } finally {
      setIsGenerating(false);
    }
  };

  // Apply AI Generated Data into Profile
  const handleApplyAiGenerated = (createAsNewProfile: boolean) => {
    if (!generatedData) return;

    const newEntries: GlossaryEntry[] = generatedData.glossary.map((g, idx) => ({
      id: 'g_ai_' + Date.now() + '_' + idx,
      source: g.source,
      target: g.target,
      category: (g.category as TermCategory) || 'term',
      note: g.note,
    }));

    if (createAsNewProfile) {
      const newProfile: GameProfile = {
        id: 'prof_' + Date.now(),
        name: aiGameName.trim(),
        genre: aiGenre,
        icon: aiGenre === 'action' ? '⚡' : aiGenre === 'visual_novel' ? '🌸' : '⚔️',
        defaultSourceLang: 'auto',
        characterNames: generatedData.characters,
        preservedLocations: generatedData.locations,
        glossary: newEntries,
        tone: (generatedData.suggestedTone as any) || 'fantasy',
      };
      onCreateProfile(newProfile);
    } else {
      const updated: GameProfile = {
        ...selectedProfile,
        characterNames: Array.from(new Set([...selectedProfile.characterNames, ...generatedData.characters])),
        preservedLocations: Array.from(new Set([...selectedProfile.preservedLocations, ...generatedData.locations])),
        glossary: [...newEntries, ...selectedProfile.glossary],
      };
      onUpdateProfile(updated);
    }

    setIsAiModalOpen(false);
    setGeneratedData(null);
    setAiGameName('');
  };

  // Export Profile as JSON
  const handleExportProfileJson = () => {
    const blob = new Blob([JSON.stringify(selectedProfile, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedProfile.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_glossary.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import Profile JSON
  const handleImportProfileJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (parsed && parsed.glossary && Array.isArray(parsed.glossary)) {
            const imported: GameProfile = {
              ...parsed,
              id: 'prof_' + Date.now(),
              name: parsed.name ? `${parsed.name} (Imported)` : 'Imported Game Profile',
            };
            onCreateProfile(imported);
          }
        } catch (err) {
          console.error('Failed to parse profile JSON', err);
        }
      };
      reader.readAsText(file);
    }
  };

  // Test live translation with active glossary
  const runTestTranslation = () => {
    const trans = localTranslate(testInput, targetLang, selectedProfile);
    setTestResult(trans.translatedText);
  };

  // Filter glossary
  const filteredGlossary = selectedProfile.glossary.filter((entry) => {
    if (categoryFilter !== 'all' && entry.category !== categoryFilter) return false;
    if (!glossarySearch.trim()) return true;
    const q = glossarySearch.toLowerCase();
    return (
      entry.source.toLowerCase().includes(q) ||
      entry.target.toLowerCase().includes(q) ||
      (entry.note && entry.note.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header and Profile Selector */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-lg">
        <div>
          <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-cyan-400" />
            <span>Game-Specific Dictionaries & Lore Glossaries</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Configure custom terminology rules per game. Prevents generic machine translation and preserves character
            and location names.
          </p>
        </div>

        {/* Profile Switcher, AI Gen Button, & New Profile */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* AI Generator Button */}
          <button
            onClick={() => setIsAiModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-indigo-500 hover:from-cyan-400 hover:to-indigo-400 text-slate-950 font-bold text-xs shadow-md shadow-cyan-500/20 transition-all cursor-pointer"
          >
            <Wand2 className="w-3.5 h-3.5" />
            <span>✨ AI Glossary Generator</span>
          </button>

          {/* Profile Switcher */}
          <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-lg p-1 text-xs">
            {profiles.map((p) => (
              <button
                key={p.id}
                onClick={() => onSelectProfile(p.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                  selectedProfile.id === p.id
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>{p.icon}</span>
                <span>{p.name.split('/')[0].trim()}</span>
              </button>
            ))}
          </div>

          {/* Create Profile Modal Trigger */}
          <button
            onClick={() => setIsNewProfileModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Game</span>
          </button>

          {/* Export / Import */}
          <button
            onClick={handleExportProfileJson}
            title="Export profile JSON"
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          <label
            title="Import profile JSON"
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <input type="file" accept=".json" onChange={handleImportProfileJson} className="hidden" />
          </label>
        </div>
      </div>

      {/* Profile Overview Card: Tone, Genre, Preserved Entities */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Preserved Characters */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-3 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-cyan-400" />
              <span>Preserved Characters ({selectedProfile.characterNames.length})</span>
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            Names will never be translated into literal words; they will stay recognized across all game dialogues.
          </p>

          <form onSubmit={handleAddCharacter} className="flex gap-1.5">
            <input
              type="text"
              placeholder="e.g. Melina, Viktor, Arwen..."
              value={newCharName}
              onChange={(e) => setNewCharName(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 flex-1"
            />
            <button
              type="submit"
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 cursor-pointer"
            >
              Add
            </button>
          </form>

          <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
            {selectedProfile.characterNames.map((name) => (
              <span
                key={name}
                className="bg-slate-950 text-slate-300 text-xs px-2 py-0.5 rounded border border-slate-800 flex items-center gap-1.5"
              >
                <span>{name}</span>
                <button
                  onClick={() => handleRemoveCharacter(name)}
                  className="text-slate-500 hover:text-rose-400 text-xs cursor-pointer"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Preserved Locations */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-3 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-amber-400" />
              <span>Preserved Locations ({selectedProfile.preservedLocations.length})</span>
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            Fictional realms, castles, and cities protected from robotic machine translation.
          </p>

          <form onSubmit={handleAddLocation} className="flex gap-1.5">
            <input
              type="text"
              placeholder="e.g. Lands Between, Night City..."
              value={newLocName}
              onChange={(e) => setNewLocName(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 flex-1"
            />
            <button
              type="submit"
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 cursor-pointer"
            >
              Add
            </button>
          </form>

          <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
            {selectedProfile.preservedLocations.map((loc) => (
              <span
                key={loc}
                className="bg-slate-950 text-slate-300 text-xs px-2 py-0.5 rounded border border-slate-800 flex items-center gap-1.5"
              >
                <span>{loc}</span>
                <button
                  onClick={() => handleRemoveLocation(loc)}
                  className="text-slate-500 hover:text-rose-400 text-xs cursor-pointer"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Profile Tone & Gaming Atmosphere */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-3 shadow-md">
          <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            <span>Tone & Genre Rules</span>
          </span>
          <p className="text-[11px] text-slate-400">
            Guides the translation engine's vocabulary choice (e.g. solemn archaic vs street slang).
          </p>

          <div className="space-y-2">
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Narrative Tone:</label>
              <select
                value={selectedProfile.tone}
                onChange={(e) =>
                  onUpdateProfile({
                    ...selectedProfile,
                    tone: e.target.value as any,
                  })
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 cursor-pointer"
              >
                <option value="fantasy">Epic Fantasy (Noble, Archaic, High-Lore)</option>
                <option value="sci-fi">Sci-Fi & Cyberpunk (Street slang, Technological)</option>
                <option value="colloquial">Casual & Anime (Natural dialogue, Expressive)</option>
                <option value="concise">Concise & Direct (Speedrunning / Tactical HUD)</option>
                <option value="dramatic">Dramatic & Cinematic</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Custom Glossary Entries Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-4 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-200">
              Active Glossary Rules ({selectedProfile.glossary.length})
            </h3>
            <span className="text-xs text-slate-400">Target: {targetLangObj.name}</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 cursor-pointer"
            >
              <option value="all">All Categories</option>
              <option value="quest">Quests</option>
              <option value="term">Terms</option>
              <option value="character">Characters</option>
              <option value="location">Locations</option>
              <option value="item">Items</option>
            </select>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2" />
              <input
                type="text"
                placeholder="Filter rules..."
                value={glossarySearch}
                onChange={(e) => setGlossarySearch(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <button
              onClick={() => setIsAddingTerm(!isAddingTerm)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Custom Term</span>
            </button>
          </div>
        </div>

        {/* Add Term Form Collapse */}
        {isAddingTerm && (
          <form
            onSubmit={handleAddTerm}
            className="bg-slate-950 border border-cyan-500/30 rounded-xl p-4 space-y-3 animate-in fade-in duration-150"
          >
            <div className="text-xs font-semibold text-cyan-300">Add New Game Term Rule</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Source Game Term / English Word</label>
                <input
                  type="text"
                  placeholder="e.g. Quest, Grace, Fixer, Maiden"
                  value={sourceTerm}
                  onChange={(e) => setSourceTerm(e.target.value)}
                  required
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">
                  Target Translation ({targetLangObj.name})
                </label>
                <input
                  type="text"
                  placeholder="e.g. المهمة الكبرى / Задание / クエスト"
                  value={targetTerm}
                  onChange={(e) => setTargetTerm(e.target.value)}
                  required
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                  dir={targetLangObj.rtl ? 'rtl' : 'ltr'}
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Category</label>
                <select
                  value={termCategory}
                  onChange={(e) => setTermCategory(e.target.value as TermCategory)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value="quest">Quest & Objective</option>
                  <option value="term">Gaming Lore Term</option>
                  <option value="character">Character Title / Role</option>
                  <option value="location">Sacred Location</option>
                  <option value="item">Item & Spell</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-[11px] text-slate-400 block mb-1">
                Contextual Instruction / Gaming Nuance (passed to Translation AI)
              </label>
              <input
                type="text"
                placeholder="e.g. In RPGs, 'Quest' shouldn't be translated literally as an everyday task, but as a grand journey."
                value={termNote}
                onChange={(e) => setTermNote(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAddingTerm(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs cursor-pointer shadow-md shadow-cyan-500/20"
              >
                Save Term Rule
              </button>
            </div>
          </form>
        )}

        {/* Table of terms */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-mono">
              <tr>
                <th className="py-2.5 px-3">Original Game Term</th>
                <th className="py-2.5 px-3">Mandatory Localization</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3">Lore Context & AI Guidance</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredGlossary.map((entry) => (
                <tr key={entry.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-2.5 px-3 font-semibold text-slate-200">{entry.source}</td>
                  <td className="py-2.5 px-3 text-cyan-300 font-medium" dir={targetLangObj.rtl ? 'rtl' : 'ltr'}>
                    {entry.target}
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="text-[11px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                      {entry.category}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-400 text-[11px]">{entry.note || '—'}</td>
                  <td className="py-2.5 px-3 text-right">
                    <button
                      onClick={() => handleDeleteTerm(entry.id)}
                      title="Delete rule"
                      className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Interactive Glossary Tester Sandbox */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-3 shadow-md">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-semibold text-slate-200">Interactive Glossary Rule Tester</h3>
        </div>
        <p className="text-xs text-slate-400">
          Type or test in-game sentences here to verify how your custom glossary replaces terms and produces natural
          translations.
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={testInput}
            onChange={(e) => setTestInput(e.target.value)}
            className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
          />
          <button
            onClick={runTestTranslation}
            className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs whitespace-nowrap cursor-pointer shadow-md shadow-cyan-500/20"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Test Translation</span>
          </button>
        </div>

        {testResult && (
          <div className="bg-slate-950 p-3 rounded-lg border border-cyan-500/30 space-y-1">
            <span className="text-[11px] font-mono text-cyan-400">Localized Output ({targetLangObj.name}):</span>
            <div
              className={`text-slate-100 text-sm font-medium ${targetLangObj.rtl ? 'font-arabic text-right' : ''}`}
              dir={targetLangObj.rtl ? 'rtl' : 'ltr'}
            >
              {testResult}
            </div>
          </div>
        )}
      </div>

      {/* Create New Profile Modal (In-App, No window.prompt!) */}
      {isNewProfileModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                <Plus className="w-4 h-4 text-cyan-400" />
                <span>Create New Game Profile</span>
              </h3>
              <button
                onClick={() => setIsNewProfileModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateProfileSubmit} className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Game Title:</label>
                <input
                  type="text"
                  placeholder="e.g. Baldur's Gate 3, Final Fantasy XIV, Skyrim"
                  value={newProfName}
                  onChange={(e) => setNewProfName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Genre:</label>
                  <select
                    value={newProfGenre}
                    onChange={(e) => setNewProfGenre(e.target.value as GenreType)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 cursor-pointer"
                  >
                    <option value="rpg">RPG / Soulslike</option>
                    <option value="action">Action / Sci-Fi</option>
                    <option value="visual_novel">Anime / Visual Novel</option>
                    <option value="mmo">MMORPG</option>
                    <option value="strategy">Strategy</option>
                    <option value="adventure">Adventure</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">Icon:</label>
                  <select
                    value={newProfIcon}
                    onChange={(e) => setNewProfIcon(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 cursor-pointer"
                  >
                    <option value="⚔️">⚔️ Swords</option>
                    <option value="⚡">⚡ Lightning</option>
                    <option value="🌸">🌸 Cherry Blossom</option>
                    <option value="🛡️">🛡️ Shield</option>
                    <option value="🔮">🔮 Orb</option>
                    <option value="🚀">🚀 Spaceship</option>
                    <option value="🎮">🎮 Controller</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Narrative Tone:</label>
                <select
                  value={newProfTone}
                  onChange={(e) => setNewProfTone(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 cursor-pointer"
                >
                  <option value="fantasy">Epic Fantasy</option>
                  <option value="sci-fi">Sci-Fi & Cyberpunk</option>
                  <option value="colloquial">Casual & Anime</option>
                  <option value="concise">Concise & Direct</option>
                  <option value="dramatic">Dramatic & Cinematic</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewProfileModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs hover:bg-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs cursor-pointer shadow-md shadow-cyan-500/20"
                >
                  Create Game Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI Glossary Generator Modal */}
      {isAiModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                <Wand2 className="w-4 h-4 text-cyan-400" />
                <span>AI Game Glossary Generator (Powered by Gemini)</span>
              </h3>
              <button
                onClick={() => setIsAiModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Enter any video game title. Gemini AI will research iconic terms, quest titles, faction roles, and
              currencies, and generate specialized translations into <strong>{targetLangObj.name}</strong>.
            </p>

            <form onSubmit={handleGenerateAiGlossary} className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. Persona 5 Royal, Elden Ring, Baldur's Gate 3..."
                  value={aiGameName}
                  onChange={(e) => setAiGameName(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                  required
                />
                <button
                  type="submit"
                  disabled={isGenerating || !aiGameName.trim()}
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-indigo-500 hover:from-cyan-400 hover:to-indigo-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 disabled:opacity-50 transition-colors cursor-pointer shrink-0"
                >
                  {isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  <span>{isGenerating ? 'Generating...' : 'Generate Rules'}</span>
                </button>
              </div>

              {/* Quick Suggestions Chips */}
              <div className="flex items-center gap-1.5 flex-wrap text-[11px] text-slate-500">
                <span>Try:</span>
                {['Elden Ring', 'Monster Hunter Wilds', 'Genshin Impact', 'Persona 5', 'Skyrim'].map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setAiGameName(name)}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-0.5 rounded cursor-pointer transition-colors"
                  >
                    {name}
                  </button>
                ))}
              </div>
            </form>

            {aiGenError && (
              <div className="bg-rose-950/40 border border-rose-800 text-rose-300 text-xs px-3 py-2 rounded-lg">
                {aiGenError}
              </div>
            )}

            {/* Render Generated Results */}
            {generatedData && (
              <div className="space-y-3 border-t border-slate-800 pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Generated {generatedData.glossary.length} Lore Rules</span>
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">
                    Tone: {generatedData.suggestedTone}
                  </span>
                </div>

                {/* Preview Cards */}
                <div className="max-h-48 overflow-y-auto space-y-1.5 bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-xs">
                  {generatedData.glossary.map((g, idx) => (
                    <div key={idx} className="flex items-center justify-between py-1 border-b border-slate-900 last:border-none">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-200">{g.source}</span>
                        <span className="text-slate-500">→</span>
                        <span className="text-cyan-300 font-medium" dir={targetLangObj.rtl ? 'rtl' : 'ltr'}>{g.target}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">[{g.category}]</span>
                    </div>
                  ))}
                </div>

                {/* Characters and Locations */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
                    <span className="text-[11px] text-cyan-400 block mb-1">Key Characters:</span>
                    <span className="text-slate-300">{generatedData.characters.join(', ') || 'None'}</span>
                  </div>
                  <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
                    <span className="text-[11px] text-amber-400 block mb-1">Key Locations:</span>
                    <span className="text-slate-300">{generatedData.locations.join(', ') || 'None'}</span>
                  </div>
                </div>

                {/* Actions: Add to current or Create as new */}
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => handleApplyAiGenerated(false)}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium cursor-pointer"
                  >
                    Add to Active Profile ({selectedProfile.name})
                  </button>
                  <button
                    onClick={() => handleApplyAiGenerated(true)}
                    className="px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs cursor-pointer shadow-md shadow-cyan-500/20"
                  >
                    Create as New Profile
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
