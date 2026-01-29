import { Heart, Code2, Lightbulb, Brain, Atom, Tent, Hammer, Globe, type LucideIcon } from 'lucide-react';
import type { LLMCategory } from '../types';

interface CategoryOption {
  id: LLMCategory;
  name: string;
  description: string;
  icon: LucideIcon;
  color: string;
  darkColor: string;
  borderColor: string;
}

const categories: CategoryOption[] = [
  {
    id: 'general',
    name: 'General',
    description: 'Writing, reasoning, information, and everyday questions',
    icon: Lightbulb,
    color: 'text-blue-400',
    darkColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/20',
  },
  {
    id: 'reasoning',
    name: 'Reasoning',
    description: 'Deep thinking, step-by-step analysis, complex problem-solving',
    icon: Brain,
    color: 'text-purple-400',
    darkColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/20',
  },
  {
    id: 'coding',
    name: 'Coding',
    description: 'Programming, debugging, software development',
    icon: Code2,
    color: 'text-green-400',
    darkColor: 'bg-green-500/10',
    borderColor: 'border-green-500/20',
  },
  {
    id: 'medical',
    name: 'Medical',
    description: 'Emergency protocols, first aid, drug interactions, diagnosis support',
    icon: Heart,
    color: 'text-red-400',
    darkColor: 'bg-red-500/10',
    borderColor: 'border-red-500/20',
  },
  {
    id: 'stem',
    name: 'STEM',
    description: 'Mathematics, chemistry, physics, scientific reasoning',
    icon: Atom,
    color: 'text-yellow-400',
    darkColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/20',
  },
  {
    id: 'survival',
    name: 'Survival',
    description: 'Wilderness skills, shelter, water purification, emergency scenarios',
    icon: Tent,
    color: 'text-orange-400',
    darkColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/20',
  },
  {
    id: 'building',
    name: 'Building',
    description: 'Construction, repairs, DIY projects, agriculture',
    icon: Hammer,
    color: 'text-amber-400',
    darkColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/20',
  },
  {
    id: 'multilingual',
    name: 'Multilingual',
    description: 'Non-English languages, translation, cultural context',
    icon: Globe,
    color: 'text-pink-400',
    darkColor: 'bg-pink-500/10',
    borderColor: 'border-pink-500/20',
  },
];

interface CategorySelectorProps {
  onSelect: (category: LLMCategory) => void;
  availableCategories?: LLMCategory[];
}

export function CategorySelector({ onSelect, availableCategories }: CategorySelectorProps) {
  const displayCategories =
    availableCategories && availableCategories.length > 0
      ? categories.filter(category => availableCategories.includes(category.id))
      : categories;

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-[#2d2a23] mb-3 font-serif">Select Use Case</h2>
        <p className="text-[#6f6757] text-lg">Choose a scenario to get specialized models</p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {displayCategories.map((category) => {
          const Icon = category.icon;
          return (
            <button
              key={category.id}
              onClick={() => onSelect(category.id)}
              className="glass-card p-8 glow-border transition-all duration-200 text-left hover:bg-[#f6f1e6] hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1f6d5a] focus-visible:ring-offset-2 focus-visible:ring-offset-[#efe9da] group"
            >
              <div className={`w-14 h-14 rounded-2xl ${category.darkColor} border ${category.borderColor} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <Icon className={`w-7 h-7 ${category.color}`} />
              </div>
              <h3 className="text-xl font-bold mb-2 text-[#2d2a23]">
                {category.name}
              </h3>
              <p className="text-sm text-[#6f6757] line-clamp-2">
                {category.description}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
