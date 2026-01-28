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
  return (
    <div className="w-full">
      {/* Desktop Grid - 3x3 layout */}
      <div className="hidden md:grid md:grid-cols-3 gap-5 p-5">
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => onCategoryChange(category.id)}
            className={`
              group relative min-h-[140px] p-7 rounded-2xl border-2 transition-all duration-300
              flex flex-col items-center text-center space-y-4
              hover:shadow-lg hover:scale-105 active:scale-100
              ${selectedCategory === category.id 
                ? 'bg-[#1f6d5a] text-white border-[#1f6d5a] shadow-xl' 
                : 'bg-white/80 text-[var(--ink)] border-[var(--border)] hover:border-[#1f6d5a]/40 hover:bg-white/90'
              }
            `}
            aria-label={`Select ${category.label} category`}
            aria-pressed={selectedCategory === category.id}
          >
            <category.icon 
              className={`w-8 h-8 transition-colors ${
                selectedCategory === category.id 
                  ? 'text-white' 
                  : 'text-[#1f6d5a] group-hover:text-[#1f6d5a]'
              }`} 
            />
            <div>
              <h3 className={`text-base font-bold uppercase tracking-wider ${
                selectedCategory === category.id ? 'text-white' : 'text-[var(--ink)]'
              }`}>
                {category.label}
              </h3>
              <p className={`text-sm mt-2 ${
                selectedCategory === category.id 
                  ? 'text-white/80' 
                  : 'text-[var(--muted)] group-hover:text-[var(--ink)]'
              }`}>
                {category.description}
              </p>
            </div>
            {selectedCategory === category.id && (
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-[#1f6d5a] rounded-full flex items-center justify-center shadow-lg">
                <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Mobile List - Vertical layout with larger touch targets */}
      <div className="md:hidden space-y-4 p-5">
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => onCategoryChange(category.id)}
            className={`
              group relative w-full min-h-[96px] p-6 rounded-2xl border-2 transition-all duration-300
              flex items-center space-x-5 text-left
              active:scale-98
              ${selectedCategory === category.id 
                ? 'bg-[#1f6d5a] text-white border-[#1f6d5a] shadow-xl' 
                : 'bg-white/80 text-[var(--ink)] border-[var(--border)] active:border-[#1f6d5a]/40 active:bg-white/90'
              }
            `}
            aria-label={`Select ${category.label} category`}
            aria-pressed={selectedCategory === category.id}
          >
            <category.icon 
              className={`w-10 h-10 flex-shrink-0 transition-colors ${
                selectedCategory === category.id 
                  ? 'text-white' 
                  : 'text-[#1f6d5a]'
              }`} 
            />
            <div className="flex-1 min-w-0">
              <h3 className={`text-lg font-bold uppercase tracking-wider ${
                selectedCategory === category.id ? 'text-white' : 'text-[var(--ink)]'
              }`}>
                {category.label}
              </h3>
              <p className={`text-sm mt-1 ${
                selectedCategory === category.id 
                  ? 'text-white/80' 
                  : 'text-[var(--muted)]'
              }`}>
                {category.description}
              </p>
            </div>
            {selectedCategory === category.id && (
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                <div className="w-4 h-4 bg-white rounded-full animate-pulse" />
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
