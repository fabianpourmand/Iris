import { useEffect, useMemo, useState } from 'react';
import { ScrollText, Search } from 'lucide-react';
import guidesData from '../data/guides.json';

interface GuideSection {
  heading: string;
  steps: string[];
}

interface Guide {
  id: string;
  title: string;
  category: string;
  summary: string;
  tags: string[];
  sections: GuideSection[];
}

export function GuidesPage() {
  const guides = guidesData as Guide[];
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [selectedId, setSelectedId] = useState<string | null>(guides[0]?.id ?? null);

  const categories = useMemo(() => {
    const unique = new Set(guides.map(guide => guide.category));
    return ['All', ...Array.from(unique)];
  }, [guides]);

  const filteredGuides = useMemo(() => {
    const term = search.trim().toLowerCase();
    return guides.filter(guide => {
      const matchesCategory = category === 'All' || guide.category === category;
      if (!matchesCategory) return false;
      if (!term) return true;
      return (
        guide.title.toLowerCase().includes(term) ||
        guide.summary.toLowerCase().includes(term) ||
        guide.tags.some(tag => tag.toLowerCase().includes(term))
      );
    });
  }, [guides, search, category]);

  const selectedGuide = filteredGuides.find(guide => guide.id === selectedId) || filteredGuides[0] || null;

  useEffect(() => {
    if (!selectedGuide) {
      setSelectedId(null);
    } else if (selectedId !== selectedGuide.id) {
      setSelectedId(selectedGuide.id);
    }
  }, [selectedGuide, selectedId]);

  return (
    <div className="flex-1 min-h-0 flex flex-col p-9 gap-7 overflow-y-auto">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#b07b2c]/10 border border-[#b07b2c]/20 flex items-center justify-center">
            <ScrollText className="w-6 h-6 text-[#b07b2c]" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-[var(--ink)] font-serif">Guides</h1>
            <p className="text-base text-[var(--muted)]">Offline field manuals, no-internet workflows, and recovery playbooks.</p>
          </div>
        </div>
        <div className="relative">
          <Search className="w-4 h-4 text-[var(--muted)] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search guides"
            className="pl-10 pr-4 py-2.5 text-sm rounded-lg border border-[var(--border)] bg-[var(--glass-strong)] text-[var(--ink)] placeholder:text-[var(--muted)] placeholder:opacity-60 focus:outline-none focus:ring-2 focus:ring-[#b07b2c]/30"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        {categories.map(item => (
          <button
            key={item}
            onClick={() => setCategory(item)}
            className={`px-5 py-2.5 rounded-full text-sm font-bold uppercase tracking-widest border transition-all ${category === item
              ? 'bg-[#b07b2c] text-white border-[#b07b2c] shadow-lg shadow-[#b07b2c]/20'
              : 'bg-[var(--glass-strong)] border-[var(--border)] text-[var(--muted)] hover:border-[rgba(45,42,35,0.3)]'
              }`}
          >
            {item}
          </button>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-[280px_1fr]">
        <aside className="bg-[var(--glass)] border border-[var(--border)] rounded-2xl p-5 shadow-lg">
          <div className="text-sm font-mono uppercase tracking-widest text-[var(--muted)] mb-4">
            {filteredGuides.length} manuals
          </div>
          <div className="space-y-4">
            {filteredGuides.map(guide => (
              <button
                key={guide.id}
                onClick={() => setSelectedId(guide.id)}
                className={`w-full text-left rounded-xl border p-4 transition-all ${selectedGuide?.id === guide.id
                  ? 'border-[#b07b2c]/40 bg-[#b07b2c]/10'
                  : 'border-[var(--border)] bg-[var(--glass-strong)] hover:border-[rgba(45,42,35,0.3)]'
                  }`}
              >
                <div className="text-base font-bold text-[var(--ink)]">{guide.title}</div>
                <div className="text-sm font-mono uppercase tracking-widest text-[var(--muted)] mt-2">{guide.category}</div>
                <p className="text-sm text-[var(--muted)] mt-3 leading-relaxed">{guide.summary}</p>
              </button>
            ))}
            {filteredGuides.length === 0 && (
              <div className="text-sm text-[var(--muted)]">No guides match your search.</div>
            )}
          </div>
        </aside>

        <section className="bg-[var(--glass)] border border-[var(--border)] rounded-2xl p-7 shadow-lg min-h-[320px]">
          {selectedGuide ? (
            <div className="space-y-7">
              <div className="space-y-2">
                <div className="text-sm font-mono uppercase tracking-widest text-[var(--muted)]">
                  {selectedGuide.category}
                </div>
                <h2 className="text-2xl font-bold text-[var(--ink)] font-serif">{selectedGuide.title}</h2>
                <p className="text-base text-[var(--muted)] leading-relaxed">{selectedGuide.summary}</p>
                <div className="flex flex-wrap gap-3">
                  {selectedGuide.tags.map(tag => (
                    <span
                      key={tag}
                      className="px-3 py-1.5 rounded-full text-sm font-mono uppercase tracking-widest border border-[#b07b2c]/30 text-[#b07b2c]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <div className="space-y-6">
                {selectedGuide.sections.map(section => (
                  <div key={section.heading} className="border border-[var(--border)] rounded-xl p-5 bg-[var(--glass-strong)]">
                    <div className="text-sm font-bold uppercase tracking-widest text-[var(--muted)] mb-4">
                      {section.heading}
                    </div>
                    <ol className="list-decimal pl-5 text-base text-[var(--ink)] space-y-3">
                      {section.steps.map(step => (
                        <li key={step}>{step}</li>
                      ))}
                    </ol>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-sm text-[var(--muted)]">No guide selected.</div>
          )}
        </section>
      </div>
    </div>
  );
}
