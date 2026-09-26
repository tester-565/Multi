import React, { useState } from 'react';
import { GameProfile, GlossaryEntry, TermCategory, Language } from '../../types';
import {
  BookOpen,
  Plus,
  Trash2,
  Edit2,
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

  // Test live translation with active glossary
  const runTestTranslation = () => {
    const trans = localTranslate(testInput, targetLang, selectedProfile);
    setTestResult(trans.translatedText);
  };

  // Filter glossary
  const filteredGlossary = selectedProfile.glossary.filter((entry) => {
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
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
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

        {/* Profile Switcher & New Profile Button */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-lg p-1 text-xs">
            {profiles.map((p) => (
              <button
                key={p.id}
                onClick={() => onSelectProfile(p.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors ${
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

          <button
            onClick={() => {
              const name = prompt('Enter new game profile name (e.g. Final Fantasy XIV):');
              if (name && name.trim()) {
                const newProf: GameProfile = {
                  id: 'prof_' + Date.now(),
                  name: name.trim(),
                  genre: 'rpg',
                  icon: '🎮',
                  defaultSourceLang: 'auto',
                  characterNames: [],
                  preservedLocations: [],
                  glossary: [],
                  tone: 'fantasy',
                };
                onCreateProfile(newProf);
              }
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Game</span>
          </button>
        </div>
      </div>

      {/* Profile Overview Card: Tone, Genre, Preserved Entities */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Preserved Characters */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-cyan-400" />
              <span>Preserved Character Names</span>
            </span>
            <span className="text-[11px] font-mono text-slate-500">{selectedProfile.characterNames.length} names</span>
          </div>
          <p className="text-[11px] text-slate-400">
            Names will never be translated into literal words; they will stay recognized across all game dialogues.
          </p>

          {/* Form to add character */}
          <form onSubmit={handleAddCharacter} className="flex gap-1.5">
            <input
              type="text"
              placeholder="e.g. Melina, Ranni..."
              value={newCharName}
              onChange={(e) => setNewCharName(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 flex-1"
            />
            <button
              type="submit"
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700"
            >
              Add
            </button>
          </form>

          {/* Character chips */}
          <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
            {selectedProfile.characterNames.map((name) => (
              <span
                key={name}
                className="bg-slate-950 text-slate-300 text-xs px-2 py-0.5 rounded border border-slate-800 flex items-center gap-1.5"
              >
                <span>{name}</span>
                <button
                  onClick={() => handleRemoveCharacter(name)}
                  className="text-slate-500 hover:text-rose-400 text-xs"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Preserved Locations */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-amber-400" />
              <span>Preserved World Locations</span>
            </span>
            <span className="text-[11px] font-mono text-slate-500">
              {selectedProfile.preservedLocations.length} locations
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            Fictional realms, castles, and cities protected from robotic translation.
          </p>

          <form onSubmit={handleAddLocation} className="flex gap-1.5">
            <input
              type="text"
              placeholder="e.g. Lands Between, Leyndell..."
              value={newLocName}
              onChange={(e) => setNewLocName(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 flex-1"
            />
            <button
              type="submit"
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700"
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
                  className="text-slate-500 hover:text-rose-400 text-xs"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Profile Tone & Gaming Atmosphere */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-3">
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
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
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
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-200">
              Active Glossary Rules ({selectedProfile.glossary.length})
            </h3>
            <span className="text-xs text-slate-400">Target Language: {targetLangObj.name}</span>
          </div>

          <div className="flex items-center gap-2">
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
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs transition-colors"
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
            className="bg-slate-950 border border-cyan-500/30 rounded-xl p-4 space-y-3 animate-fadeIn"
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
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-cyan-500 text-slate-950 font-semibold text-xs"
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
                      className="text-slate-500 hover:text-rose-400 p-1"
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
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-3">
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
            className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs whitespace-nowrap"
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
    </div>
  );
};
