import { useState } from 'react';
import { ChevronRight, Heart, Code2, Calculator, Eye } from 'lucide-react';

type DesignVariant = 'modern' | 'compact' | 'card-grid';

export function DesignPreviewPage() {
  const [selectedDesign, setSelectedDesign] = useState<DesignVariant>('modern');

  return (
    <div className="min-h-screen p-8 text-[#2d2a23]">
      <div className="max-w-7xl mx-auto">
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-[#2d2a23] mb-2 font-serif">Design Variations</h1>
          <p className="text-[#6f6757] text-lg">Choose your preferred UI layout</p>
        </div>

        <div className="grid grid-cols-3 gap-6 mb-12">
          {(['modern', 'compact', 'card-grid'] as const).map(variant => (
            <button
              key={variant}
              onClick={() => setSelectedDesign(variant)}
              className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                selectedDesign === variant
                  ? 'border-[#1f6d5a]/50 bg-[#1f6d5a]/10'
                  : 'border-[rgba(45,42,35,0.12)] bg-white/70 hover:border-[rgba(31,109,90,0.3)]'
              }`}
            >
              <span className="text-sm font-bold text-[#2d2a23] capitalize">{variant.replace('-', ' ')}</span>
            </button>
          ))}
        </div>

        <div className="bg-white/70 border border-[rgba(45,42,35,0.18)] rounded-2xl overflow-hidden min-h-[600px]">
          {selectedDesign === 'modern' && <ModernDesign />}
          {selectedDesign === 'compact' && <CompactDesign />}
          {selectedDesign === 'card-grid' && <CardGridDesign />}
        </div>
      </div>
    </div>
  );
}

// Design 1: Modern - Focused, Large Cards
function ModernDesign() {
  return (
    <div className="p-12 space-y-8">
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-[#1f6d5a] rounded-2xl mb-4 shadow-2xl shadow-[0_16px_28px_rgba(31,109,90,0.25)]">
          <span className="text-2xl text-white font-black">IRIS</span>
        </div>
        <h1 className="text-4xl font-bold text-[#2d2a23] mb-2 font-serif">IRIS</h1>
        <p className="text-[#6f6757]">Choose your mission scenario</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        {[
          { icon: Heart, label: 'Medical', desc: 'Emergency & diagnosis support' },
          { icon: Code2, label: 'Coding', desc: 'Programming & tech support' },
          { icon: Calculator, label: 'Math', desc: 'Engineering & calculations' },
          { icon: Eye, label: 'Vision', desc: 'Image analysis & vision tasks' },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              className="glass-card p-8 glow-border hover:bg-[#f6f1e6] transition-all group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1f6d5a]"
            >
              <div className="flex items-start justify-between mb-4">
                <Icon className="w-8 h-8 text-[#1f6d5a]" />
                <ChevronRight className="w-5 h-5 text-[#6f6757] group-hover:text-[#1f6d5a] transition-colors" />
              </div>
              <h3 className="text-xl font-bold text-[#2d2a23] mb-2">{item.label}</h3>
              <p className="text-sm text-[#6f6757]">{item.desc}</p>
            </button>
          );
        })}
      </div>

      <div className="flex justify-center pt-8">
        <button className="premium-button px-12 py-3 text-lg">
          Start Setup
        </button>
      </div>
    </div>
  );
}

// Design 2: Compact - Sidebar Navigation
function CompactDesign() {
  const [selectedCategory, setSelectedCategory] = useState('medical');

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div className="w-56 border-r border-[rgba(45,42,35,0.12)] p-6 space-y-4">
        <div className="mb-8">
          <h2 className="text-sm font-bold text-[#6f6757] uppercase tracking-wider mb-4">Categories</h2>
          {['medical', 'coding', 'general', 'math'].map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`w-full text-left px-4 py-3 rounded-lg transition-all capitalize ${
                selectedCategory === cat
                  ? 'bg-[#1f6d5a]/10 text-[#1f6d5a] border border-[#1f6d5a]/30'
                  : 'text-[#6f6757] hover:bg-[#f6f1e6]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8">
        <div className="max-w-3xl">
          <h2 className="text-2xl font-bold text-[#2d2a23] mb-6 capitalize font-serif">{selectedCategory} Models</h2>

          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="glass-card p-4 glow-border flex items-center justify-between hover:bg-[#f6f1e6] transition-all group cursor-pointer">
                <div>
                  <h3 className="font-bold text-[#2d2a23] group-hover:text-[#1f6d5a] transition-colors">Model {i}</h3>
                  <p className="text-xs text-[#6f6757]">8GB RAM • 7B Parameters</p>
                </div>
                <button className="premium-button !py-2 !px-6 text-sm">
                  Benchmark
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Design 3: Card Grid - Dashboard Style
function CardGridDesign() {
  return (
    <div className="p-8 space-y-8">
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Available Models', value: '25+', tone: '#1f6d5a' },
          { label: 'System RAM', value: '16GB', tone: '#b07b2c' },
          { label: 'GPU Support', value: 'RTX 4090', tone: '#6f6757' },
        ].map((stat) => (
          <div key={stat.label} className="glass-card p-6 border border-[rgba(45,42,35,0.12)]">
            <p className="text-sm text-[#6f6757] mb-2">{stat.label}</p>
            <p className="text-2xl font-bold" style={{ color: stat.tone }}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div>
        <h2 className="text-xl font-bold text-[#2d2a23] mb-4 font-serif">Recommended Models</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { name: 'Qwen 2.5 7B', category: 'General', speed: '15 tok/s' },
            { name: 'Llama 3.1 8B', category: 'General', speed: '18 tok/s' },
            { name: 'Med42 70B', category: 'Medical', speed: '2 tok/s' },
            { name: 'Qwen Coder 7B', category: 'Coding', speed: '16 tok/s' },
            { name: 'DeepSeek Math', category: 'Math', speed: '14 tok/s' },
            { name: 'Chemistry AI', category: 'Science', speed: '12 tok/s' },
          ].map((model) => (
            <div key={model.name} className="glass-card p-4 glow-border hover:bg-[#f6f1e6] transition-all">
              <h3 className="font-bold text-[#2d2a23] mb-2">{model.name}</h3>
              <div className="flex justify-between items-center text-xs text-[#6f6757]">
                <span>{model.category}</span>
                <span className="text-[#1f6d5a] font-mono">{model.speed}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-4 pt-4">
        <button className="premium-button flex-1 !py-3">
          Continue with Default
        </button>
        <button className="px-8 py-3 rounded-lg border border-[rgba(45,42,35,0.18)] text-[#2d2a23] hover:bg-[#f6f1e6] transition-all">
          Custom Setup
        </button>
      </div>
    </div>
  );
}
