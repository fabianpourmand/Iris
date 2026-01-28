import { useState, useRef, useEffect } from 'react';
import { ChevronDown, ShieldOff } from 'lucide-react';
import type { ModelInfo } from '../types';
import { PerformanceBadge } from './PerformanceBadge';

interface ModelSelectorProps {
  models: ModelInfo[];
  selectedModelId: string | null;
  onSelect: (modelId: string) => void;
  ramAvailable: number;
  uncensoredMode?: boolean;
  categoryFilter?: string | null;
  showUnavailable?: boolean;
}

const categoryColors: Record<string, string> = {
  general: 'bg-blue-600/10 text-blue-700 border-blue-600/30',
  coding: 'bg-[#1f6d5a]/10 text-[#1f6d5a] border-[#1f6d5a]/30',
  medical: 'bg-red-500/10 text-red-600 border-red-500/30',
  mathematics: 'bg-purple-600/10 text-purple-700 border-purple-600/30',
  chemistry: 'bg-cyan-600/10 text-cyan-700 border-cyan-600/30',
  uncensored: 'bg-rose-600/10 text-rose-700 border-rose-600/30',
  survival: 'bg-[#b07b2c]/10 text-[#b07b2c] border-[#b07b2c]/30',
  planting: 'bg-green-600/10 text-green-700 border-green-600/30',
  building: 'bg-amber-600/10 text-amber-700 border-amber-600/30',
};

export function ModelSelector({
  models,
  selectedModelId,
  onSelect,
  ramAvailable,
  uncensoredMode = false,
  categoryFilter = null,
  showUnavailable = false,
}: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filteredModels = models.filter(model => {
    if (uncensoredMode && !model.uncensored) return false;
    if (categoryFilter && model.category !== categoryFilter) return false;
    const isAvailable = model.available !== false;
    const isCompatible = model.min_ram_gb <= ramAvailable;
    if (!showUnavailable && (!isAvailable || !isCompatible)) return false;
    return true;
  });

  const selectedModel = models.find(m => m.id === selectedModelId);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 bg-[var(--glass-strong)] backdrop-blur-sm shadow-sm border border-[var(--border)] hover:border-[rgba(45,42,35,0.3)] px-4 py-2.5 rounded-xl transition-all w-full min-w-0"
      >
        <div className="flex-1 text-left font-mono min-w-0">
          {selectedModel ? (
            <div className="flex flex-col">
              <span className="text-sm font-bold text-[var(--muted)] uppercase tracking-[0.2em] mb-0.5">Active Unit</span>
              <div className="flex items-center gap-2">
                <span className="text-[var(--ink)] font-bold text-base truncate">{selectedModel.display_name}</span>
                {selectedModel.uncensored && (
                  <ShieldOff className="w-3.5 h-3.5 text-red-600" />
                )}
              </div>
            </div>
          ) : (
            <span className="text-[var(--muted)] font-bold text-sm uppercase tracking-[0.15em]">INITIALIZE...</span>
          )}
        </div>
        <ChevronDown className={`w-4 h-4 text-[var(--muted)] transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full mt-3 right-0 w-full md:w-96 max-w-[90vw] bg-[var(--glass-strong)] border border-[var(--border)] shadow-2xl z-[70] rounded-2xl max-h-[32rem] overflow-hidden flex flex-col animate-heritage">
          <div className="p-3 border-b border-[var(--border)] bg-[var(--paper-2)]">
            <span className="text-sm font-bold text-[var(--muted)] uppercase tracking-[0.2em] font-mono">Select Intelligence Module</span>
          </div>
          <div className="overflow-y-auto divide-y divide-[rgba(45,42,35,0.1)]">
            {filteredModels.length === 0 ? (
              <div className="p-10 text-[var(--muted)] text-center text-sm font-bold uppercase tracking-widest font-mono opacity-60">
                No local units found
              </div>
            ) : (
              filteredModels.map(model => (
                (() => {
                  const isAvailable = model.available !== false;
                  const isCompatible = model.min_ram_gb <= ramAvailable;
                  const isSelectable = isAvailable && isCompatible;

                  return (
                    <button
                      key={model.id}
                      onClick={() => {
                        if (!isSelectable) return;
                        onSelect(model.id);
                        setIsOpen(false);
                      }}
                      disabled={!isSelectable}
                      className={`w-full p-5 text-left hover:bg-[#1f6d5a]/5 transition-all flex flex-col gap-2.5 disabled:opacity-30 disabled:cursor-not-allowed ${model.id === selectedModelId ? 'bg-[#1f6d5a]/10' : ''
                        }`}
                    >
                      <div className="flex items-center justify-between font-mono">
                        <div className="flex items-center gap-2">
                          <span className={`font-bold text-base ${model.id === selectedModelId ? 'text-[#1f6d5a]' : 'text-[var(--ink)]'}`}>
                            {model.display_name}
                          </span>
                          {model.uncensored && <ShieldOff className="w-3.5 h-3.5 text-red-600" />}
                          {!isAvailable && (
                            <span className="text-sm px-2 py-0.5 rounded-full border border-[var(--border)] text-[var(--muted)] uppercase tracking-widest font-bold">
                              MISSING
                            </span>
                          )}
                          {isAvailable && !isCompatible && (
                            <span className="text-sm px-2 py-0.5 rounded-full border border-[#b07b2c]/40 text-[#b07b2c] uppercase tracking-widest font-bold">
                              {model.min_ram_gb}GB REQ
                            </span>
                          )}
                        </div>
                        <PerformanceBadge ramRequired={model.min_ram_gb} ramAvailable={ramAvailable} size="sm" />
                      </div>
                      <div className="flex items-center gap-3 font-mono">
                        <span className={`text-sm px-2.5 py-0.5 rounded-md border font-bold uppercase tracking-[0.1em] ${categoryColors[model.category]}`}>
                          {model.category}
                        </span>
                        <span className="text-sm font-bold text-[var(--muted)] uppercase tracking-[0.2em] opacity-60">
                          {model.min_ram_gb}GB / {model.recommended_ctx} CTX
                        </span>
                      </div>
                    </button>
                  );
                })()
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
