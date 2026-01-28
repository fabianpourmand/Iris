import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProfile } from '../hooks';
import type { LLMCategory } from '../types';

const categoryOptions: { id: LLMCategory; label: string }[] = [
  { id: 'general', label: 'General' },
  { id: 'medical', label: 'Medical' },
  { id: 'coding', label: 'Coding' },
  { id: 'mathematics', label: 'Math' },
  { id: 'chemistry', label: 'Chemistry' },
  { id: 'survival', label: 'Survival' },
  { id: 'building', label: 'Building' },
  { id: 'planting', label: 'Planting' },
];

export function OnboardingPage() {
  const navigate = useNavigate();
  const { profile, saveProfile, loading } = useProfile();
  const [name, setName] = useState('');
  const [preferredCategories, setPreferredCategories] = useState<LLMCategory[]>(['general']);
  const [experienceLevel, setExperienceLevel] = useState<'novice' | 'intermediate' | 'advanced'>('novice');
  const [responseStyle, setResponseStyle] = useState<'concise' | 'step-by-step'>('concise');
  const [units, setUnits] = useState<'metric' | 'imperial'>('metric');
  const [language, setLanguage] = useState('en');
  const [error, setError] = useState<string | null>(null);

  const toggleCategory = (category: LLMCategory) => {
    setPreferredCategories(prev =>
      prev.includes(category)
        ? prev.filter(item => item !== category)
        : [...prev, category]
    );
  };

  const handleSubmit = async () => {
    if (preferredCategories.length === 0) {
      setError('Select at least one use case.');
      return;
    }
    setError(null);
    try {
      await saveProfile({
        name: name.trim() || undefined,
        preferred_categories: preferredCategories,
        experience_level: experienceLevel,
        response_style: responseStyle,
        units,
        language,
      });
      navigate('/chat');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save profile');
    }
  };

  useEffect(() => {
    if (profile) {
      navigate('/chat');
    }
  }, [navigate, profile]);

  return (
    <div className="min-h-screen bg-[var(--paper)] flex items-center justify-center px-6 py-12">
      <div className="max-w-3xl w-full bg-[var(--glass-strong)] border border-[var(--border)] rounded-3xl shadow-2xl p-10">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 rounded-2xl border border-[rgba(45,42,35,0.18)] bg-white overflow-hidden">
            <img src="/logo.jpg" alt="IRIS" className="w-full h-full object-cover" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-[var(--ink)] font-serif">Welcome to IRIS</h1>
            <p className="text-[var(--muted)] text-sm">Answer a few quick questions to personalize your assistant.</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-[var(--muted)]">Name (optional)</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Operator"
              className="mt-2 w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--glass-strong)] text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[#1f6d5a]/30"
            />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-[var(--muted)]">Preferred units</label>
            <div className="mt-2 flex gap-2">
              {(['metric', 'imperial'] as const).map(option => (
                <button
                  key={option}
                  onClick={() => setUnits(option)}
                  className={`flex-1 px-4 py-3 rounded-xl border text-xs font-bold uppercase tracking-widest ${
                    units === option
                      ? 'bg-[#1f6d5a]/10 border-[#1f6d5a]/30 text-[#1f6d5a]'
                      : 'bg-[var(--glass-strong)] border-[var(--border)] text-[var(--muted)]'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8">
          <label className="text-xs font-bold uppercase tracking-widest text-[var(--muted)]">Primary use cases</label>
          <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3">
            {categoryOptions.map(option => (
              <button
                key={option.id}
                onClick={() => toggleCategory(option.id)}
                className={`px-3 py-3 rounded-xl border text-xs font-bold uppercase tracking-widest ${
                  preferredCategories.includes(option.id)
                    ? 'bg-[#1f6d5a]/10 border-[#1f6d5a]/30 text-[#1f6d5a]'
                    : 'bg-[var(--glass-strong)] border-[var(--border)] text-[var(--muted)]'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-8 grid md:grid-cols-2 gap-6">
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-[var(--muted)]">Experience level</label>
            <div className="mt-2 flex gap-2">
              {(['novice', 'intermediate', 'advanced'] as const).map(level => (
                <button
                  key={level}
                  onClick={() => setExperienceLevel(level)}
                  className={`flex-1 px-3 py-3 rounded-xl border text-xs font-bold uppercase tracking-widest ${
                    experienceLevel === level
                      ? 'bg-[#1f6d5a]/10 border-[#1f6d5a]/30 text-[#1f6d5a]'
                      : 'bg-[var(--glass-strong)] border-[var(--border)] text-[var(--muted)]'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-[var(--muted)]">Response style</label>
            <div className="mt-2 flex gap-2">
              {(['concise', 'step-by-step'] as const).map(style => (
                <button
                  key={style}
                  onClick={() => setResponseStyle(style)}
                  className={`flex-1 px-3 py-3 rounded-xl border text-xs font-bold uppercase tracking-widest ${
                    responseStyle === style
                      ? 'bg-[#1f6d5a]/10 border-[#1f6d5a]/30 text-[#1f6d5a]'
                      : 'bg-[var(--glass-strong)] border-[var(--border)] text-[var(--muted)]'
                  }`}
                >
                  {style}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8">
          <label className="text-xs font-bold uppercase tracking-widest text-[var(--muted)]">Language</label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="mt-2 w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--glass-strong)] text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[#1f6d5a]/30"
          >
            <option value="en">English</option>
            <option value="es">Spanish</option>
            <option value="fr">French</option>
            <option value="de">German</option>
            <option value="pt">Portuguese</option>
          </select>
        </div>

        <div className="mt-10 flex items-center justify-end gap-3">
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-6 py-3 rounded-xl bg-[#1f6d5a] text-white font-bold uppercase tracking-widest text-xs shadow-lg hover:bg-[#1a5c4c] disabled:opacity-50"
          >
            Save Profile
          </button>
        </div>
        {error && (
          <div className="mt-4 text-xs font-mono uppercase tracking-widest text-red-700">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
