import { useState, useMemo } from 'react';
import { Search, Brain, ExternalLink, Zap, Info } from 'lucide-react';
import skillsData from '../data/skills.json';

interface Skill {
  id: string;
  name: string;
  description?: string;
  source?: string;
}

export function SkillsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const skills = skillsData as Skill[];

  const filteredSkills = useMemo(() => {
    return skills.filter(skill =>
      (skill.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (skill.description || '').toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, skills]);

  return (
    <div className="flex-1 flex flex-col h-full bg-transparent overflow-hidden">
      <div className="p-8 border-b border-[rgba(45,42,35,0.12)] space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#2d2a23] tracking-tight uppercase font-serif">Intelligence Skills</h1>
            <p className="text-[#6f6757] text-sm font-medium mt-1 uppercase tracking-widest">
              {skills.length} Loaded Modules | System Ready
            </p>
          </div>
          <div className="px-4 py-2 glass-card border-[#1f6d5a]/20 bg-[#1f6d5a]/5 rounded-full flex items-center gap-2">
            <Zap className="w-4 h-4 text-[#1f6d5a]" />
            <span className="text-[10px] font-bold text-[#1f6d5a] uppercase tracking-widest">Agentic Registry v2.0</span>
          </div>
        </div>

        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-[#6f6757] group-focus-within:text-[#1f6d5a] transition-colors" />
          </div>
          <input
            type="text"
            className="block w-full bg-white/80 border border-[rgba(45,42,35,0.18)] rounded-2xl py-4 pl-12 pr-4 text-[#2d2a23] placeholder-[#6f6757]/60 focus:outline-none focus:ring-2 focus:ring-[#1f6d5a]/40 transition-all font-bold text-sm tracking-wide"
            placeholder="FILTER BY CAPABILITY, ROLE, OR MODULE NAME..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8 pt-4">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredSkills.map(skill => (
            <div key={skill.id} className="glass-card p-6 glow-border hover:bg-[#f6f1e6] transition-all group flex flex-col h-full border-[rgba(45,42,35,0.12)]">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-[#1f6d5a]/10 rounded-xl flex items-center justify-center border border-[#1f6d5a]/20 group-hover:scale-110 transition-transform">
                  <Brain className="w-6 h-6 text-[#1f6d5a]" />
                </div>
                <button className="p-2 text-[#6f6757] hover:text-[#1f6d5a] transition-all">
                  <ExternalLink className="w-4 h-4" />
                </button>
              </div>

              <h3 className="text-lg font-black text-[#2d2a23] mb-2 truncate group-hover:text-[#1f6d5a] transition-colors uppercase tracking-tight">
                {skill.name}
              </h3>

              <p className="text-[#6f6757] text-sm leading-relaxed mb-6 line-clamp-3 font-medium tracking-tight h-15">
                {skill.description || "Experimental agentic module for specialized intelligence tasks."}
              </p>

              <div className="mt-auto pt-6 border-t border-[rgba(45,42,35,0.12)] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#1f6d5a]/50" />
                  <span className="text-[10px] font-black text-[#6f6757] uppercase tracking-widest">Linked</span>
                </div>
                <span className="text-[9px] font-bold text-[#6f6757] uppercase tracking-tighter">
                  MOD-ID: {skill.id.slice(0, 8).toUpperCase()}
                </span>
              </div>
            </div>
          ))}

          {filteredSkills.length === 0 && (
            <div className="col-span-full py-20 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-20 h-20 glass-card flex items-center justify-center">
                <Info className="w-8 h-8 text-[#6f6757]" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-bold text-[#6f6757] uppercase tracking-tight">No Modules Detected</h3>
                <p className="text-[#6f6757] text-sm max-w-xs mx-auto">Zero matches found for current filter criteria in the intelligence registry.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
