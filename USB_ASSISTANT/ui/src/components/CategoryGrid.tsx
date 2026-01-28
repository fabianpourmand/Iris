import { useState } from 'react';
import { type LucideIcon } from 'lucide-react';
import type { LLMCategory } from '../types';

type ChatCategory = LLMCategory | 'auto';

interface CategoryItem {
  id: ChatCategory;
  label: string;
  icon: LucideIcon;
  description: string;
}

interface CategoryGridProps {
  categories: CategoryItem[];
  selectedCategory: ChatCategory;
  onCategoryChange: (category: ChatCategory) => void;
}

export function CategoryGrid({ categories, selectedCategory, onCategoryChange }: CategoryGridProps) {
  const [hovered, setHovered] = useState<ChatCategory | null>(null);

  const renderItem = (category: CategoryItem, layout: 'grid' | 'scroll') => {
    const isActive = selectedCategory === category.id;
    const showTooltip = isActive && hovered === category.id;
    const baseSize = layout === 'grid' ? 'min-h-[clamp(44px,9vw,88px)] p-[clamp(6px,1.2vw,12px)]' : 'min-h-[36px] px-2 py-1 min-w-[72px]';
    const labelSize = layout === 'grid' ? 'text-[clamp(0.55rem,0.8vw,0.75rem)]' : 'text-[clamp(0.5rem,1.2vw,0.7rem)]';

    return (
      <button
        key={category.id}
        type="button"
        onClick={() => onCategoryChange(category.id)}
        onMouseEnter={() => setHovered(category.id)}
        onMouseLeave={() => setHovered((current) => (current === category.id ? null : current))}
        onFocus={() => setHovered(category.id)}
        onBlur={() => setHovered((current) => (current === category.id ? null : current))}
        className={`group relative overflow-visible rounded-xl border transition-all duration-200 flex flex-col items-center justify-center gap-[clamp(0.25rem,0.9vw,0.6rem)] text-center ${baseSize} ${isActive ? 'border-[#1f6d5a] bg-[#1f6d5a]/15 text-[#1f6d5a] shadow-[0_8px_20px_rgba(31,109,90,0.25)]' : 'border-[var(--border)] bg-white/90 text-[var(--ink)] hover:border-[#1f6d5a]/65 hover:bg-white/95'}`}
        aria-label={`Select ${category.label} category`}
        aria-pressed={isActive}
      >
        <span className={`absolute left-0.5 top-1/2 h-7 w-0.5 -translate-y-1/2 rounded-full transition-opacity ${isActive ? 'bg-[#1f6d5a] opacity-100' : 'opacity-0'}`} />
        <category.icon
          className={`transition-colors h-[clamp(14px,2.2vw,22px)] w-[clamp(14px,2.2vw,22px)] ${isActive ? 'text-[#1f6d5a]' : 'text-[#1f6d5a]'}`}
        />
        <span className={`font-bold uppercase tracking-[0.25em] ${labelSize} ${isActive ? 'text-[#1f6d5a]' : 'text-[var(--ink)]/70'}`}>{category.label}</span>

        {showTooltip && layout === 'grid' && (
          <div className="pointer-events-none absolute left-1/2 top-[-2.6rem] w-64 -translate-x-1/2 rounded-xl border border-[#1f6d5a] bg-[#04180f] px-3 py-2 shadow-[0_16px_45px_rgba(0,0,0,0.55)]">
            <div className="text-[10px] font-bold uppercase tracking-[0.26em] text-[#8bffde]">Category Info</div>
            <div className="mt-1 text-[13px] leading-snug text-white/80">{category.description}</div>
            <span className="absolute left-1/2 top-full -translate-x-1/2 border-x-[10px] border-t-[10px] border-x-transparent border-t-[#04180f]" />
          </div>
        )}
      </button>
    );
  };

  return (
    <div className="w-full">
      {/* Desktop/Tablet: compact two-row deck */}
      <div className="hidden md:grid [grid-template-columns:repeat(auto-fit,minmax(7.5rem,1fr))] gap-[clamp(0.5rem,1vw,0.9rem)]">
        {categories.map((category) => renderItem(category, 'grid'))}
      </div>

      {/* Mobile: horizontal deck */}
      <div className="md:hidden -mx-4 mt-2 flex gap-3 overflow-x-auto px-4 py-2">
        {categories.map((category) => renderItem(category, 'scroll'))}
      </div>
    </div>
  );
}
